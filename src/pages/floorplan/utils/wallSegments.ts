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
  // STEP 1: Globally deduplicate envelope vertices from OTHER rooms
  const allGreenLineVertices: Vertex[] = [];
  for (const envelope of contractedEnvelopes) {
    allGreenLineVertices.push(...envelope);
  }

  const uniqueGreenLineVertices = deduplicateVertices(allGreenLineVertices, 1);
  console.log(`🌍 Global: Deduplicated ${allGreenLineVertices.length} → ${uniqueGreenLineVertices.length} envelope vertices`);

  // STEP 2: Collect ALL subdivision points from ALL rooms in world coords
  const allSubdivisionPointsWorld: Vertex[] = [];

  for (const room of rooms) {
    const worldVertices = room.vertices.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );

    for (let i = 0; i < worldVertices.length; i++) {
      const edgeStart = worldVertices[i];
      const edgeEnd = worldVertices[(i + 1) % worldVertices.length];

      // Add edge start vertex (with original ID)
      allSubdivisionPointsWorld.push({
        ...edgeStart,
        id: room.vertices[i].id
      });

      // Find green line vertices that fall on this edge
      const pointsOnEdge = findPointsOnEdge(edgeStart, edgeEnd, uniqueGreenLineVertices);
      allSubdivisionPointsWorld.push(...pointsOnEdge.map(p => p.vertex));
    }
  }

  // STEP 3: Globally deduplicate ALL subdivision points (same tolerance as rendering)
  const globallyDeduplicatedPoints = deduplicateVertices(allSubdivisionPointsWorld, 1);
  console.log(`🌍 Global: Deduplicated ${allSubdivisionPointsWorld.length} → ${globallyDeduplicatedPoints.length} subdivision points`);

  // STEP 4: For each room, create segments using ONLY globally deduplicated points
  return rooms.map(room => {
    const { segmentVerticesLocal, updatedWalls } = buildSegmentsFromGlobalPoints(
      room,
      globallyDeduplicatedPoints,
      contractedEnvelopes
    );

    return {
      ...room,
      segmentVertices: segmentVerticesLocal,
      walls: updatedWalls
    };
  });
}

/**
 * Deduplicate vertices based on distance tolerance
 */
function deduplicateVertices(vertices: Vertex[], tolerance: number): Vertex[] {
  const unique: Vertex[] = [];

  for (const vertex of vertices) {
    const isDuplicate = unique.some(existing => {
      const dist = Math.sqrt(
        Math.pow(vertex.x - existing.x, 2) +
        Math.pow(vertex.y - existing.y, 2)
      );
      return dist < tolerance;
    });

    if (!isDuplicate) {
      unique.push(vertex);
    }
  }

  return unique;
}

/**
 * Build segments for a room using globally deduplicated subdivision points
 * @param room - Room to process
 * @param globalPoints - Globally deduplicated subdivision points (world coords)
 * @param contractedEnvelopes - Contracted envelopes for wall classification
 * @returns Segment vertices (local coords) and updated walls with segments
 */
function buildSegmentsFromGlobalPoints(
  room: Room,
  globalPoints: Vertex[],
  contractedEnvelopes: Vertex[][]
): { segmentVerticesLocal: Vertex[]; updatedWalls: typeof room.walls } {
  // Transform room vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  const allSegmentVerticesWorld: Vertex[] = [];
  const updatedWalls: typeof room.walls = [];
  const n = room.vertices.length;

  console.log(`🏗️ Building segments for room with ${n} vertices (${room.walls.length} walls)`);

  // Process each edge once
  for (let i = 0; i < n; i++) {
    const edgeStart = worldVertices[i];
    const edgeEnd = worldVertices[(i + 1) % n];

    // Build ordered vertex list for this edge using ONLY global points
    const edgeVerticesWorld: Vertex[] = [];

    // Find ALL global points that lie on this edge
    const pointsOnThisEdge: PointOnEdge[] = [];

    for (const globalPoint of globalPoints) {
      const distance = pointToSegmentDistance(globalPoint, edgeStart, edgeEnd);

      if (distance < 1) { // 1cm tolerance
        // Calculate parametric t for sorting
        const dx = edgeEnd.x - edgeStart.x;
        const dy = edgeEnd.y - edgeStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0.001) {
          const t = Math.sqrt(
            Math.pow(globalPoint.x - edgeStart.x, 2) +
            Math.pow(globalPoint.y - edgeStart.y, 2)
          ) / length;

          pointsOnThisEdge.push({
            vertex: globalPoint,
            t
          });
        }
      }
    }

    // Sort by parametric t
    pointsOnThisEdge.sort((a, b) => a.t - b.t);

    // Add all points (they're already deduplicated globally)
    for (const point of pointsOnThisEdge) {
      edgeVerticesWorld.push(point.vertex);
    }

    // Create segments for this edge
    const segments: WallSegment[] = [];

    console.log(`Wall ${i}: edgeVerticesWorld has ${edgeVerticesWorld.length} vertices, creating ${edgeVerticesWorld.length - 1} segments`);

    for (let j = 0; j < edgeVerticesWorld.length - 1; j++) {
      const startVertex = edgeVerticesWorld[j];
      const endVertex = edgeVerticesWorld[j + 1];

      // Classify segment by checking if midpoint is on any OTHER room's envelope
      const midpoint = {
        id: 'temp',
        x: (startVertex.x + endVertex.x) / 2,
        y: (startVertex.y + endVertex.y) / 2
      };

      const wallType = classifySegmentType(midpoint, edgeStart, edgeEnd, contractedEnvelopes);

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
  const TOLERANCE = 1; // 1cm tolerance for "on edge" detection (tighter to avoid false positives)
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
