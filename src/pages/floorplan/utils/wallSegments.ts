/**
 * Wall Segments Utility
 * Calculates wall subdivisions based on contracted envelope intersections
 * Segments reference actual vertices in room.segmentVertices (not parametric)
 */

import type { Room, Vertex, WallSegment, WallType } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Line segment intersection point
 */
interface IntersectionPoint {
  vertex: Vertex;
  t: number;  // Parametric position [0, 1] along the edge
}

/**
 * Calculate wall segments for all rooms based on contracted envelope intersections
 * @param rooms - All rooms in the floorplan
 * @param contractedEnvelopes - Global contracted envelopes (one per room group) in world coords
 * @returns Rooms with updated segmentVertices and wall.segments
 */
export function calculateWallSegmentsForAllRooms(
  rooms: Room[],
  contractedEnvelopes: Vertex[][]
): Room[] {
  return rooms.map(room => {
    // Step 1: Build segmentVertices (vertices + intersection points)
    const segmentVertices = buildSegmentVertices(room, contractedEnvelopes);

    // Step 2: Create segments referencing segmentVertices by ID
    const updatedWalls = createSegmentsFromSegmentVertices(
      room,
      segmentVertices,
      contractedEnvelopes
    );

    return {
      ...room,
      segmentVertices,
      walls: updatedWalls
    };
  });
}

/**
 * Build segmentVertices array: original vertices + intersection points
 * @param room - Room to process
 * @param contractedEnvelopes - Contracted envelopes for finding intersections
 * @returns Array of vertices with intersections inserted (in CCW order)
 */
function buildSegmentVertices(
  room: Room,
  contractedEnvelopes: Vertex[][]
): Vertex[] {
  // Transform room vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  const segmentVertices: Vertex[] = [];
  const n = room.vertices.length;

  // Process each edge
  for (let i = 0; i < n; i++) {
    const edgeStart = worldVertices[i];
    const edgeEnd = worldVertices[(i + 1) % n];

    // Add start vertex (reuse original ID for stability)
    segmentVertices.push({
      ...edgeStart,
      id: room.vertices[i].id  // Keep stable ID from original vertices
    });

    // Find intersections on this edge (excluding endpoints)
    const intersections = findEdgeIntersections(edgeStart, edgeEnd, contractedEnvelopes);

    // Add intersection vertices (with new IDs)
    for (const intersection of intersections) {
      segmentVertices.push(intersection.vertex);
    }
  }

  // Transform back to local coordinates
  return segmentVertices.map(v =>
    worldToLocal(v, room.position, room.rotation, room.scale)
  );
}

/**
 * Find intersection points between an edge and contracted envelopes
 * Excludes endpoints to avoid duplicates
 * @param edgeStart - Start vertex of edge (world coords)
 * @param edgeEnd - End vertex of edge (world coords)
 * @param envelopes - Array of contracted envelope polygons (world coords)
 * @returns Array of intersection points sorted by distance from start
 */
function findEdgeIntersections(
  edgeStart: Vertex,
  edgeEnd: Vertex,
  envelopes: Vertex[][]
): IntersectionPoint[] {
  const intersections: IntersectionPoint[] = [];

  // Check intersection with each envelope edge
  for (const envelope of envelopes) {
    for (let i = 0; i < envelope.length; i++) {
      const envStart = envelope[i];
      const envEnd = envelope[(i + 1) % envelope.length];

      const intersection = lineSegmentIntersection(
        edgeStart,
        edgeEnd,
        envStart,
        envEnd
      );

      if (intersection) {
        // Calculate parametric t along the edge
        const dx = edgeEnd.x - edgeStart.x;
        const dy = edgeEnd.y - edgeStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0.001) {
          const t = Math.sqrt(
            Math.pow(intersection.x - edgeStart.x, 2) +
            Math.pow(intersection.y - edgeStart.y, 2)
          ) / length;

          // Only add if not too close to endpoints (avoid duplicates)
          if (t > 0.001 && t < 0.999) {
            intersections.push({ vertex: intersection, t });
          }
        }
      }
    }
  }

  // Sort by parametric t value (distance from start)
  return intersections.sort((a, b) => a.t - b.t);
}

/**
 * Create wall segments from segmentVertices
 * @param room - Room to process
 * @param segmentVertices - Segment vertices (local coords)
 * @param contractedEnvelopes - Contracted envelopes for classification (world coords)
 * @returns Updated walls array with segments
 */
function createSegmentsFromSegmentVertices(
  room: Room,
  segmentVertices: Vertex[],
  contractedEnvelopes: Vertex[][]
): typeof room.walls {
  // Transform vertices to world coordinates for processing
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );
  const worldSegmentVertices = segmentVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Build ID lookup map for fast access
  const segmentVertexMap = new Map(worldSegmentVertices.map(v => [v.id, v]));

  return room.walls.map((wall, wallIndex) => {
    const edgeStartId = room.vertices[wallIndex].id;
    const edgeEndId = room.vertices[(wallIndex + 1) % room.vertices.length].id;

    // Find all segmentVertices on this edge (between edgeStart and edgeEnd)
    const edgeStart = worldVertices[wallIndex];
    const edgeEnd = worldVertices[(wallIndex + 1) % worldVertices.length];

    const edgeSegmentVertices: Vertex[] = [];

    for (const sv of worldSegmentVertices) {
      if (isPointOnEdge(sv, edgeStart, edgeEnd, 5)) {
        edgeSegmentVertices.push(sv);
      }
    }

    // Sort by distance from edge start
    edgeSegmentVertices.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.x - edgeStart.x, 2) + Math.pow(a.y - edgeStart.y, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.x - edgeStart.x, 2) + Math.pow(b.y - edgeStart.y, 2)
      );
      return distA - distB;
    });

    // Create segments between consecutive vertices
    const segments: WallSegment[] = [];
    for (let i = 0; i < edgeSegmentVertices.length - 1; i++) {
      const startVertex = edgeSegmentVertices[i];
      const endVertex = edgeSegmentVertices[i + 1];

      // Calculate midpoint for classification
      const midpoint = {
        id: 'temp',
        x: (startVertex.x + endVertex.x) / 2,
        y: (startVertex.y + endVertex.y) / 2
      };

      // Classify segment type
      const wallType = classifySegmentType(
        midpoint,
        startVertex,
        endVertex,
        contractedEnvelopes
      );

      segments.push({
        id: `seg_${uuidv4()}`,
        startVertexId: startVertex.id,
        endVertexId: endVertex.id,
        wallType
      });
    }

    return {
      ...wall,
      segments
    };
  });
}

/**
 * Check if a point lies on an edge (within tolerance)
 */
function isPointOnEdge(
  point: Vertex,
  edgeStart: Vertex,
  edgeEnd: Vertex,
  tolerance: number
): boolean {
  return pointToSegmentDistance(point, edgeStart, edgeEnd) < tolerance;
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
 * Calculate line segment intersection
 * @returns Intersection point or null if no intersection
 */
function lineSegmentIntersection(
  p1: Vertex,
  p2: Vertex,
  p3: Vertex,
  p4: Vertex
): Vertex | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.0001) {
    return null; // Parallel or coincident
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      id: `v_${uuidv4()}`,
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  return null;
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
