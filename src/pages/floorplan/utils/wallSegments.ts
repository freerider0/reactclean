/**
 * Wall Segments Utility
 * Subdivides room edges where green line vertices fall on them
 * Creates segments for wall type classification (exterior vs interior)
 */

import type { Room, Vertex, WallSegment, WallType } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Point on an edge with parametric position
 */
interface PointOnEdge {
  vertex: Vertex;
  t: number;  // Parametric position [0, 1] along the edge
}

/**
 * Calculate wall segments for all rooms
 * Subdivides room edges where green line vertices fall on them
 * @param rooms - All rooms in the floorplan
 * @param contractedEnvelopes - Contracted envelopes from other rooms (world coords)
 * @returns Rooms with updated segmentVertices and wall.segments
 */
export function calculateWallSegmentsForAllRooms(
  rooms: Room[],
  contractedEnvelopes: Vertex[][]
): Room[] {
  return rooms.map(room => {
    const { segmentVerticesLocal, updatedWalls } = buildSegmentsDirectly(room, contractedEnvelopes);

    return {
      ...room,
      segmentVertices: segmentVerticesLocal,
      walls: updatedWalls
    };
  });
}

/**
 * Build segments for a room by subdividing edges where green line vertices fall
 * @param room - Room to process
 * @param contractedEnvelopes - Contracted envelopes from other rooms (world coords)
 * @returns Segment vertices (local coords) and updated walls with segments
 */
function buildSegmentsDirectly(
  room: Room,
  contractedEnvelopes: Vertex[][]
): { segmentVerticesLocal: Vertex[]; updatedWalls: typeof room.walls } {
  // Transform room vertices to world coordinates (these are the actual edges to subdivide)
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Transform THIS room's contracted envelope (green line) to world coords
  const worldContractedEnvelope = room.debugContractedEnvelope
    ? room.debugContractedEnvelope.map(v => localToWorld(v, room.position, room.rotation, room.scale))
    : [];

  // Collect all green line vertices from all envelopes (this room + other rooms)
  const allGreenLineVertices: Vertex[] = [...worldContractedEnvelope];
  for (const envelope of contractedEnvelopes) {
    allGreenLineVertices.push(...envelope);
  }

  const allSegmentVerticesWorld: Vertex[] = [];
  const updatedWalls: typeof room.walls = [];
  const n = room.vertices.length;

  // Process each edge once
  for (let i = 0; i < n; i++) {
    const edgeStart = worldVertices[i];
    const edgeEnd = worldVertices[(i + 1) % n];

    // Build ordered vertex list for this edge
    const edgeVerticesWorld: Vertex[] = [];

    // Add start vertex
    edgeVerticesWorld.push({
      ...edgeStart,
      id: room.vertices[i].id
    });

    // Find green line vertices that fall on this edge (already sorted by parametric t)
    const pointsOnEdge = findPointsOnEdge(edgeStart, edgeEnd, allGreenLineVertices);
    for (const point of pointsOnEdge) {
      edgeVerticesWorld.push(point.vertex);
    }

    // Add end vertex
    const endVertexId = room.vertices[(i + 1) % n].id;
    edgeVerticesWorld.push({
      ...edgeEnd,
      id: endVertexId
    });

    // Create segments for this edge
    const segments: WallSegment[] = [];
    const allEnvelopes = worldContractedEnvelope.length > 0
      ? [worldContractedEnvelope, ...contractedEnvelopes]
      : contractedEnvelopes;

    for (let j = 0; j < edgeVerticesWorld.length - 1; j++) {
      const startVertex = edgeVerticesWorld[j];
      const endVertex = edgeVerticesWorld[j + 1];

      // Classify segment by checking if midpoint is on any green line
      const midpoint = {
        id: 'temp',
        x: (startVertex.x + endVertex.x) / 2,
        y: (startVertex.y + endVertex.y) / 2
      };

      const wallType = classifySegmentType(midpoint, edgeStart, edgeEnd, allEnvelopes);

      segments.push({
        id: `seg_${uuidv4()}`,
        startVertexId: startVertex.id,
        endVertexId: endVertex.id,
        wallType
      });
    }

    // Add vertices to global list (avoiding duplicates at edge junctions)
    for (let j = 0; j < edgeVerticesWorld.length - 1; j++) {
      allSegmentVerticesWorld.push(edgeVerticesWorld[j]);
    }

    // Store wall with its segments
    updatedWalls.push({
      ...room.walls[i],
      segments
    });
  }

  // Transform all vertices to local coords once
  const allSegmentVerticesLocal = allSegmentVerticesWorld.map(v =>
    worldToLocal(v, room.position, room.rotation, room.scale)
  );

  return {
    segmentVerticesLocal: allSegmentVerticesLocal,
    updatedWalls
  };
}

/**
 * Find which vertices lie ON an edge (within tolerance)
 * @param edgeStart - Start vertex of edge (world coords)
 * @param edgeEnd - End vertex of edge (world coords)
 * @param points - Array of vertices to check (green line vertices)
 * @returns Array of points that lie on the edge, sorted by distance from start
 */
function findPointsOnEdge(
  edgeStart: Vertex,
  edgeEnd: Vertex,
  points: Vertex[]
): PointOnEdge[] {
  const TOLERANCE = 5; // 5cm tolerance for "on edge" detection
  const result: PointOnEdge[] = [];

  const dx = edgeEnd.x - edgeStart.x;
  const dy = edgeEnd.y - edgeStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 0.001) return result;

  for (const point of points) {
    // Calculate distance from point to edge
    const distance = pointToSegmentDistance(point, edgeStart, edgeEnd);

    if (distance < TOLERANCE) {
      // Point is on the edge - calculate parametric t
      const t = Math.sqrt(
        Math.pow(point.x - edgeStart.x, 2) +
        Math.pow(point.y - edgeStart.y, 2)
      ) / length;

      // Only add if not too close to endpoints (avoid duplicates)
      if (t > 0.00001 && t < 0.99999) {
        // Generate new unique ID to avoid collisions
        result.push({
          vertex: {
            id: `v_${uuidv4()}`,
            x: point.x,
            y: point.y
          },
          t
        });
      }
    }
  }

  // Sort by parametric t value (distance from start)
  return result.sort((a, b) => a.t - b.t);
}

/**
 * Classify a segment as exterior or interior based on envelope proximity
 * @param segmentMidpoint - Midpoint of segment (world coords)
 * @param edgeStart - Start of parent edge (for direction checking)
 * @param edgeEnd - End of parent edge (for direction checking)
 * @param envelopes - Contracted envelopes
 * @returns Wall type classification
 */
function classifySegmentType(
  segmentMidpoint: Vertex,
  edgeStart: Vertex,
  edgeEnd: Vertex,
  envelopes: Vertex[][]
): WallType {
  const TOLERANCE = 10; // 10cm tolerance for "on envelope" detection

  // Check if segment midpoint is on any envelope edge
  for (const envelope of envelopes) {
    for (let i = 0; i < envelope.length; i++) {
      const envStart = envelope[i];
      const envEnd = envelope[(i + 1) % envelope.length];

      // Check if point is on envelope edge
      const distance = pointToSegmentDistance(segmentMidpoint, envStart, envEnd);

      if (distance < TOLERANCE) {
        // Check if the segment direction aligns with envelope edge (collinear)
        if (areSegmentsCollinear(edgeStart, edgeEnd, envStart, envEnd, 5)) {
          return 'exterior'; // Segment lies on envelope = exterior wall
        }
      }
    }
  }

  // Not on envelope = interior wall
  return 'interior_division';
}

/**
 * Calculate distance from point to line segment
 */
function pointToSegmentDistance(point: Vertex, segStart: Vertex, segEnd: Vertex): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 0.0001) {
    // Segment is a point
    const pdx = point.x - segStart.x;
    const pdy = point.y - segStart.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  // Calculate projection
  const t = Math.max(0, Math.min(1,
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
  ));

  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;

  const distX = point.x - projX;
  const distY = point.y - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Check if two segments are collinear (parallel and overlapping)
 */
function areSegmentsCollinear(
  seg1Start: Vertex,
  seg1End: Vertex,
  seg2Start: Vertex,
  seg2End: Vertex,
  angleTolerance: number = 5
): boolean {
  // Calculate direction vectors
  const dx1 = seg1End.x - seg1Start.x;
  const dy1 = seg1End.y - seg1Start.y;
  const dx2 = seg2End.x - seg2Start.x;
  const dy2 = seg2End.y - seg2Start.y;

  // Normalize
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  if (len1 < 0.001 || len2 < 0.001) return false;

  const nx1 = dx1 / len1, ny1 = dy1 / len1;
  const nx2 = dx2 / len2, ny2 = dy2 / len2;

  // Check if parallel (dot product close to ±1)
  const dot = Math.abs(nx1 * nx2 + ny1 * ny2);
  const angleThreshold = Math.cos((angleTolerance * Math.PI) / 180);

  return dot > angleThreshold;
}

/**
 * Transform vertex from local to world coordinates
 */
function localToWorld(
  vertex: Vertex,
  position: Vertex,
  rotation: number,
  scale: number
): Vertex {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    id: vertex.id,
    x: (vertex.x * cos - vertex.y * sin) * scale + position.x,
    y: (vertex.x * sin + vertex.y * cos) * scale + position.y
  };
}

/**
 * Transform vertex from world to local coordinates
 */
function worldToLocal(
  vertex: Vertex,
  position: Vertex,
  rotation: number,
  scale: number
): Vertex {
  // Inverse transform: translate -> rotate -> scale
  const dx = vertex.x - position.x;
  const dy = vertex.y - position.y;

  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  return {
    id: vertex.id,
    x: (dx * cos - dy * sin) / scale,
    y: (dx * sin + dy * cos) / scale
  };
}
