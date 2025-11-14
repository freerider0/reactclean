/**
 * Basic geometry utility functions
 */

import { Vertex, Room, Wall } from '../types';
import { getWallQuad } from './walls';
import { findLineSegmentOverlap, splitEdgeAtOverlaps, insertSplitPoints } from './edgeSplitting';
import { localToWorld, worldToLocal } from './coordinates';
import {
  loadNativeClipperLibInstanceAsync,
  NativeClipperLibInstance,
  NativeClipperLibRequestedFormat,
  ClipType,
  PolyFillType,
  JoinType,
  EndType,
  IntPoint,
  Paths
} from 'js-angusj-clipper/web';

// ============================================================================
// CLIPPER INSTANCE INITIALIZATION
// ============================================================================

let clipperInstance: NativeClipperLibInstance | null = null;

/**
 * Get or initialize the Clipper library instance
 * Uses WebAssembly only (modern browsers)
 */
async function getClipperInstance(): Promise<NativeClipperLibInstance> {
  if (!clipperInstance) {
    clipperInstance = await loadNativeClipperLibInstanceAsync(
      NativeClipperLibRequestedFormat.WasmOnly
    );
  }
  return clipperInstance;
}

// ============================================================================
// COORDINATE CONVERSION (Float ↔ Integer)
// ============================================================================

const COORD_SCALE = 100; // Scale factor: 1cm = 100 units for precision

/**
 * Convert Vertex (float) to IntPoint (integer)
 * Clipper requires integer coordinates with lowercase x, y
 */
function vertexToIntPoint(v: Vertex): IntPoint {
  return {
    x: Math.round(v.x * COORD_SCALE),
    y: Math.round(v.y * COORD_SCALE)
  };
}

/**
 * Convert IntPoint (integer) back to Vertex (float)
 */
function intPointToVertex(p: IntPoint): Vertex {
  return {
    x: p.x / COORD_SCALE,
    y: p.y / COORD_SCALE
  };
}

/**
 * Convert array of Vertices to Path (array of IntPoints)
 */
function verticesToPath(vertices: Vertex[]): IntPoint[] {
  return vertices.map(vertexToIntPoint);
}

/**
 * Convert Path (array of IntPoints) back to Vertices
 */
function pathToVertices(path: IntPoint[]): Vertex[] {
  return path.map(intPointToVertex);
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Vertex, p2: Vertex): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculate angle between two vectors (in radians)
 */
export function angleBetween(v1: Vertex, v2: Vertex): number {
  return Math.atan2(v2.y - v1.y, v2.x - v1.x);
}

/**
 * Calculate distance from point to line segment
 */
export function distanceToSegment(
  point: Vertex,
  segmentStart: Vertex,
  segmentEnd: Vertex
): { distance: number; closestPoint: Vertex } {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Segment is a point
    return {
      distance: distance(point, segmentStart),
      closestPoint: segmentStart
    };
  }

  // Calculate projection parameter t
  let t = ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const closestPoint = {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy
  };

  return {
    distance: distance(point, closestPoint),
    closestPoint
  };
}

/**
 * Check if point is inside polygon using ray casting algorithm
 */
export function pointInPolygon(point: Vertex, polygon: Vertex[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate the normal vector of a line segment
 */
export function normalVector(start: Vertex, end: Vertex): Vertex {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return { x: 0, y: 0 };

  return {
    x: -dy / length,
    y: dx / length
  };
}

/**
 * Check if two line segments are parallel (within tolerance)
 */
export function areParallel(
  seg1Start: Vertex,
  seg1End: Vertex,
  seg2Start: Vertex,
  seg2End: Vertex,
  tolerance: number = 0.01
): boolean {
  const angle1 = angleBetween(seg1Start, seg1End);
  const angle2 = angleBetween(seg2Start, seg2End);
  const diff = Math.abs(angle1 - angle2);

  return diff < tolerance || Math.abs(diff - Math.PI) < tolerance;
}

/**
 * Check if two line segments are perpendicular (within tolerance)
 */
export function arePerpendicular(
  seg1Start: Vertex,
  seg1End: Vertex,
  seg2Start: Vertex,
  seg2End: Vertex,
  tolerance: number = 0.01
): boolean {
  const angle1 = angleBetween(seg1Start, seg1End);
  const angle2 = angleBetween(seg2Start, seg2End);
  const diff = Math.abs(angle1 - angle2);

  return Math.abs(diff - Math.PI / 2) < tolerance || Math.abs(diff - 3 * Math.PI / 2) < tolerance;
}

/**
 * Check if polygon vertices are in counter-clockwise order
 */
export function isCounterClockwise(vertices: Vertex[]): boolean {
  if (vertices.length < 3) return true;

  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    sum += (v2.x - v1.x) * (v2.y + v1.y);
  }

  return sum < 0;
}

/**
 * Center vertices around (0, 0) by subtracting the centroid
 * Returns centered vertices and the original centroid position
 */
export function centerVertices(vertices: Vertex[]): { centeredVertices: Vertex[]; centroid: Vertex } {
  if (vertices.length === 0) {
    return { centeredVertices: [], centroid: { x: 0, y: 0 } };
  }

  const centroid = polygonCentroid(vertices);

  const centeredVertices = vertices.map(v => ({
    ...v,  // Preserve all properties including id
    x: v.x - centroid.x,
    y: v.y - centroid.y
  }));

  return { centeredVertices, centroid };
}

/**
 * Recenter vertices and calculate position adjustment
 * Used after editing vertices to maintain rotation around centroid
 * Returns new centered vertices and the offset to add to position (in local space)
 */
export function recenterVertices(vertices: Vertex[]): { centeredVertices: Vertex[]; localOffset: Vertex } {
  if (vertices.length === 0) {
    return { centeredVertices: [], localOffset: { x: 0, y: 0 } };
  }

  const centroid = polygonCentroid(vertices);

  const centeredVertices = vertices.map(v => ({
    ...v,  // Preserve all properties including id
    x: v.x - centroid.x,
    y: v.y - centroid.y
  }));

  return {
    centeredVertices,
    localOffset: centroid // This is the offset in local space
  };
}

/**
 * Calculate the centroid of a polygon
 */
export function polygonCentroid(vertices: Vertex[]): Vertex {
  if (vertices.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;

  for (const vertex of vertices) {
    sumX += vertex.x;
    sumY += vertex.y;
  }

  return {
    x: sumX / vertices.length,
    y: sumY / vertices.length
  };
}

/**
 * Check if a polygon is self-intersecting
 */
export function isSelfIntersecting(vertices: Vertex[]): boolean {
  if (vertices.length < 4) return false;

  for (let i = 0; i < vertices.length; i++) {
    const seg1Start = vertices[i];
    const seg1End = vertices[(i + 1) % vertices.length];

    for (let j = i + 2; j < vertices.length; j++) {
      // Skip adjacent segments
      if (j === (i + vertices.length - 1) % vertices.length) continue;

      const seg2Start = vertices[j];
      const seg2End = vertices[(j + 1) % vertices.length];

      if (segmentsIntersect(seg1Start, seg1End, seg2Start, seg2End)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function segmentsIntersect(
  p1: Vertex,
  p2: Vertex,
  p3: Vertex,
  p4: Vertex
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  return false;
}

function direction(p1: Vertex, p2: Vertex, p3: Vertex): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/**
 * Check if a point is inside a rectangle (axis-aligned)
 */
function pointInRectangle(point: Vertex, rectMin: Vertex, rectMax: Vertex): boolean {
  return point.x >= rectMin.x && point.x <= rectMax.x &&
         point.y >= rectMin.y && point.y <= rectMax.y;
}

/**
 * Check if a polygon (room) intersects with an axis-aligned rectangle
 * Algorithm:
 * 1. Check if any polygon vertex is inside rectangle
 * 2. Check if any rectangle vertex is inside polygon
 * 3. Check if any polygon edge intersects rectangle edges
 */
export function polygonIntersectsRectangle(
  polygon: Vertex[],
  rectMin: Vertex,
  rectMax: Vertex
): boolean {
  if (polygon.length === 0) return false;

  // Check if any polygon vertex is inside rectangle
  for (const vertex of polygon) {
    if (pointInRectangle(vertex, rectMin, rectMax)) {
      return true;
    }
  }

  // Rectangle corners
  const rectCorners: Vertex[] = [
    { x: rectMin.x, y: rectMin.y },
    { x: rectMax.x, y: rectMin.y },
    { x: rectMax.x, y: rectMax.y },
    { x: rectMin.x, y: rectMax.y }
  ];

  // Check if any rectangle corner is inside polygon
  for (const corner of rectCorners) {
    if (pointInPolygon(corner, polygon)) {
      return true;
    }
  }

  // Check if any polygon edge intersects with rectangle edges
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    for (let j = 0; j < rectCorners.length; j++) {
      const r1 = rectCorners[j];
      const r2 = rectCorners[(j + 1) % rectCorners.length];

      if (segmentsIntersect(p1, p2, r1, r2)) {
        return true;
      }
    }
  }

  return false;
}


/**
 * Remove collinear vertices from a polygon
 * Keeps only vertices that represent actual direction changes
 */
function removeCollinearVertices(vertices: Vertex[], tolerance: number = 0.01): Vertex[] {
  if (vertices.length < 3) return vertices;

  const result: Vertex[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    // Calculate vectors
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    // Cross product to detect collinearity
    // If cross product is near zero, points are collinear
    const cross = Math.abs(v1x * v2y - v1y * v2x);

    // Normalize by edge lengths to get angle-based tolerance
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (len1 === 0 || len2 === 0) {
      // Degenerate edge, skip this vertex
      continue;
    }

    const normalizedCross = cross / (len1 * len2);

    // Keep vertex if it represents an actual turn
    if (normalizedCross > tolerance) {
      result.push(curr);
    }
  }

  // Ensure we have at least 3 vertices for a valid polygon
  return result.length >= 3 ? result : vertices;
}

/**
 * Offset a polygon outward using simple geometric approach (like calculateCenterline)
 * Offsets each edge by the given distance and finds intersections for mitered corners
 */
function offsetPolygonSimple(vertices: Vertex[], offsetDistance: number): Vertex[] {
  const n = vertices.length;

  if (n < 3) return vertices;

  // Create offset lines for each edge
  const offsetLines: { start: Vertex; end: Vertex }[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];

    // Edge vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) continue;

    // Normalize
    const dirX = dx / length;
    const dirY = dy / length;

    // Perpendicular outward (for CCW polygon, right-hand normal)
    const normalX = dirY;
    const normalY = -dirX;

    // Offset line
    offsetLines.push({
      start: {
        x: p1.x + normalX * offsetDistance,
        y: p1.y + normalY * offsetDistance
      },
      end: {
        x: p2.x + normalX * offsetDistance,
        y: p2.y + normalY * offsetDistance
      }
    });
  }

  // Find intersections of adjacent offset lines
  const offsetVertices: Vertex[] = [];
  for (let i = 0; i < offsetLines.length; i++) {
    const line1 = offsetLines[i];
    const line2 = offsetLines[(i + 1) % offsetLines.length];

    // Find intersection
    const intersection = lineIntersection(line1, line2);
    if (intersection) {
      offsetVertices.push(intersection);
    } else {
      // Fallback: use average of endpoints
      offsetVertices.push({
        x: (line1.end.x + line2.start.x) / 2,
        y: (line1.end.y + line2.start.y) / 2
      });
    }
  }

  return offsetVertices;
}

/**
 * Helper function to find intersection of two lines
 */
function lineIntersection(
  line1: { start: Vertex; end: Vertex },
  line2: { start: Vertex; end: Vertex }
): Vertex | null {
  const x1 = line1.start.x;
  const y1 = line1.start.y;
  const x2 = line1.end.x;
  const y2 = line1.end.y;
  const x3 = line2.start.x;
  const y3 = line2.start.y;
  const x4 = line2.end.x;
  const y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Parallel lines
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

/**
 * Offset a polygon outward using Clipper with sharp mitered corners
 * Uses WebAssembly for production-ready performance
 * DEPRECATED: Use offsetPolygonSimple for simple cases
 */
async function offsetPolygonOutward(vertices: Vertex[], offsetDistance: number, miterLimit: number = 2.0): Promise<Vertex[]> {
  if (vertices.length < 3) return vertices;

  const clipper = await getClipperInstance();

  // Convert vertices to integer path
  const path = verticesToPath(vertices);

  // Scale offset distance to integer (offset is in same units as coordinates)
  const scaledOffset = offsetDistance * COORD_SCALE;

  // Perform offset with JoinType.Miter and configurable limit
  // Low miterLimit (e.g., 2.0) prevents spikes at shallow angles by beveling
  // High miterLimit (e.g., 10.0) allows sharp miters but can create spikes
  const offsetPaths = clipper.offsetToPaths({
    delta: scaledOffset,
    offsetInputs: [{
      data: [path],
      joinType: JoinType.Miter,
      endType: EndType.ClosedPolygon
    }],
    miterLimit: miterLimit // Configurable miter limit
  });

  // Take the first result polygon
  if (offsetPaths.length === 0 || offsetPaths[0].length === 0) {
    return vertices; // Fallback to original if offset fails
  }

  // Convert back to Vertex[]
  const result = pathToVertices(offsetPaths[0]);

  // Detect bevel pairings (don't remove, just identify relationships)
  const pairings = detectBevelPairings(result);
  console.log(`📋 Bevel pairings:`, pairings);

  return result;
}

/**
 * Detect bevel vertex groups using collinearity check (Method 3 only)
 * Returns array where each index maps to its logical corner group ID
 * Vertices that are collinear belong to the same corner (bevel pair)
 */
function detectBevelPairings(vertices: Vertex[]): number[] {
  if (vertices.length < 3) return vertices.map((_, i) => i);

  const n = vertices.length;
  const groupIds = new Array(n).fill(-1);
  let currentGroupId = 0;

  console.log(`🔍 Detecting bevel pairings for ${n} vertices`);

  for (let i = 0; i < n; i++) {
    if (groupIds[i] !== -1) continue; // Already assigned

    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    // Method 3: Collinearity check only
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

    const crossProduct = Math.abs(v1x * v2y - v1y * v2x);
    const normalizedCross = crossProduct / (len1 * len2 + 0.0001);
    const isCollinear = normalizedCross < 0.02; // Very small cross product

    if (isCollinear) {
      // This vertex is part of a bevel - pair it with next vertex
      groupIds[i] = currentGroupId;
      groupIds[(i + 1) % n] = currentGroupId;
      console.log(`  🔗 Vertices ${i} and ${(i + 1) % n} are PAIRED (bevel group ${currentGroupId})`);
      currentGroupId++;
    } else {
      // Hard edge vertex - gets its own group
      groupIds[i] = currentGroupId;
      console.log(`  ✅ Vertex ${i} is HARD EDGE (group ${currentGroupId})`);
      currentGroupId++;
    }
  }

  return groupIds;
}

/**
 * Insert collinear vertices from a polygon (e.g., green debug polygon) into a room's vertices array
 * Checks if any polygon vertices lie on room edges but are not coincident with existing vertices
 * Returns updated vertices array if changes were made, or null if no changes
 */
function insertCollinearVerticesFromPolygon(
  room: Room,
  polygonWorld: Vertex[],
  tolerance: number = 0.1 * COORD_SCALE, // 0.1cm for collinearity check
  coincidenceTolerance: number = 0.3 * COORD_SCALE // 0.3cm to avoid existing vertices (reduced from 1.0cm)
): Vertex[] | null {
  if (!polygonWorld || polygonWorld.length === 0) return null;

  console.log(`🔍 Checking room ${room.id} for collinear vertex insertion`);
  console.log(`   Green polygon: ${polygonWorld.length} vertices`);

  // Reset to original vertices before checking (remove previously auto-inserted vertices)
  // Use originalVertices if available, otherwise use current vertices
  const baseVertices = room.originalVertices && room.originalVertices.length > 0
    ? room.originalVertices
    : room.vertices;

  console.log(`   Room vertices: ${baseVertices.length} (using ${room.originalVertices ? 'original' : 'current'})`);

  // Transform base vertices to world coordinates
  const verticesWorld = baseVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Track vertices to insert: { edgeIndex, vertex in local coords, t parameter }
  const insertions: Array<{ edgeIndex: number; vertex: Vertex; t: number }> = [];

  // Track statistics for debugging
  let skippedNotCollinear = 0;
  let skippedNearEndpoint = 0;
  let skippedTooClose = 0;
  let skippedDegenerateEdge = 0;

  // For each vertex in the polygon
  for (const polyVertex of polygonWorld) {
    // Check each edge of the room
    for (let i = 0; i < verticesWorld.length; i++) {
      const v1 = verticesWorld[i];
      const v2 = verticesWorld[(i + 1) % verticesWorld.length];

      // Check if polygon vertex is on this edge
      const { distance: dist, closestPoint } = distanceToSegment(polyVertex, v1, v2);

      // Check if it's close enough to the edge (collinear)
      if (dist > tolerance) {
        skippedNotCollinear++;
        continue;
      }

      // Calculate parametric position along edge (0 = v1, 1 = v2)
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const lengthSquared = dx * dx + dy * dy;

      if (lengthSquared === 0) {
        skippedDegenerateEdge++;
        continue; // Degenerate edge
      }

      let t = ((closestPoint.x - v1.x) * dx + (closestPoint.y - v1.y) * dy) / lengthSquared;
      t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

      // Skip if too close to endpoints (avoid duplicates)
      if (t < 0.01 || t > 0.99) {
        skippedNearEndpoint++;
        continue;
      }

      // Check if NOT coincident with any existing vertex
      let tooCloseToExisting = false;
      for (const existingVertex of verticesWorld) {
        const distToExisting = distance(polyVertex, existingVertex);
        if (distToExisting < coincidenceTolerance) {
          tooCloseToExisting = true;
          break;
        }
      }

      if (tooCloseToExisting) {
        skippedTooClose++;
        continue;
      }

      // Convert to local coordinates for insertion
      const vertexLocal = worldToLocal(polyVertex, room.position, room.rotation, room.scale);

      // Mark for insertion
      insertions.push({ edgeIndex: i, vertex: vertexLocal, t });
    }
  }

  // Log statistics
  console.log(`   Results: ${insertions.length} vertices to insert`);
  if (insertions.length === 0) {
    console.log(`   Skipped: ${skippedNotCollinear} not collinear, ${skippedNearEndpoint} near endpoint, ${skippedTooClose} too close to existing, ${skippedDegenerateEdge} degenerate edge`);
  }

  // If no insertions, return null
  if (insertions.length === 0) return null;

  // Sort insertions by edge index, then by t parameter
  insertions.sort((a, b) => {
    if (a.edgeIndex !== b.edgeIndex) return a.edgeIndex - b.edgeIndex;
    return a.t - b.t;
  });

  // Build new vertices array with insertions (starting from base vertices)
  const newVertices: Vertex[] = [];
  let currentEdge = 0;
  let insertionIndex = 0;

  for (let i = 0; i < baseVertices.length; i++) {
    // Add the current vertex from base (original) vertices
    newVertices.push(baseVertices[i]);

    // Insert all vertices that belong after this edge
    while (insertionIndex < insertions.length && insertions[insertionIndex].edgeIndex === i) {
      newVertices.push(insertions[insertionIndex].vertex);
      insertionIndex++;
    }
  }

  console.log(`✨ ${room.id}: Inserted ${insertions.length} collinear vertices (checked ${polygonWorld.length} green polygon vertices against ${baseVertices.length} room edges)`);
  if (room.vertices.length !== baseVertices.length) {
    console.log(`   ↳ Reset from ${room.vertices.length} to ${baseVertices.length} base vertices first`);
  }
  return newVertices;
}

/**
 * Calculate envelope polygons for all rooms using Clipper (WebAssembly)
 * Connected rooms will merge into one envelope, disconnected rooms get separate envelopes
 * Returns a Map of room ID to their envelope vertices (in local coordinates)
 *
 * IMPORTANT: Envelope is ONLY for UI rendering. Walls stay tied to room.vertices, NOT envelope.
 */
export async function calculateFloorplanEnvelopes(
  rooms: Room[],
  miterLimit: number = 2.0,
  interiorWallThickness: number = 15,
  exteriorWallThickness: number = 30
): Promise<Map<string, { envelope: Vertex[]; innerBoundary: Vertex[]; debugCenterline: Vertex[]; debugContracted: Vertex[]; updatedVertices?: Vertex[] }>> {
  const envelopeMap = new Map<string, { envelope: Vertex[]; innerBoundary: Vertex[]; debugCenterline: Vertex[]; debugContracted: Vertex[]; updatedVertices?: Vertex[] }>();

  if (rooms.length === 0) {
    return envelopeMap;
  }

  const clipper = await getClipperInstance();

  // Transform helpers
  const localToWorld = (v: Vertex, position: Vertex, rotation: number, scale: number): Vertex => {
    const scaled = { x: v.x * scale, y: v.y * scale };
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotated = {
      x: scaled.x * cos - scaled.y * sin,
      y: scaled.x * sin + scaled.y * cos
    };
    return {
      x: rotated.x + position.x,
      y: rotated.y + position.y
    };
  };

  const worldToLocal = (v: Vertex, position: Vertex, rotation: number, scale: number): Vertex => {
    // Reverse translation
    const translated = {
      x: v.x - position.x,
      y: v.y - position.y
    };
    // Reverse rotation
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const rotated = {
      x: translated.x * cos - translated.y * sin,
      y: translated.x * sin + translated.y * cos
    };
    // Reverse scale
    return {
      x: rotated.x / scale,
      y: rotated.y / scale
    };
  };

  // Collect centerline polygons from all rooms IN WORLD COORDINATES
  const allRoomPaths: IntPoint[][] = [];

  for (const room of rooms) {
    // Remove collinear vertices to avoid clipping issues
    const cleanedCenterline = removeCollinearVertices(room.centerlineVertices);

    // Skip if not enough vertices
    if (cleanedCenterline.length < 3) {
      console.warn(`Room ${room.id} has less than 3 vertices after cleaning, skipping`);
      continue;
    }

    // Transform centerline vertices to WORLD coordinates
    const worldVertices = cleanedCenterline.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );

    // Convert to Clipper path (integer coordinates)
    const path = verticesToPath(worldVertices);

    // Validate path
    if (path.length < 3) {
      console.warn(`Room ${room.id} path has less than 3 points, skipping`);
      continue;
    }

    // Check for invalid coordinates
    const hasInvalidCoords = path.some(p =>
      !isFinite(p.x) || !isFinite(p.y) || isNaN(p.x) || isNaN(p.y)
    );

    if (hasInvalidCoords) {
      console.warn(`Room ${room.id} has invalid coordinates, skipping`);
      continue;
    }

    allRoomPaths.push(path);
  }

  // If no valid rooms, return empty envelopes
  if (allRoomPaths.length === 0) {
    console.warn('No valid room paths to merge');
    return envelopeMap;
  }

  console.log(`Merging ${allRoomPaths.length} room paths with Clipper`);

  // EXPAND → UNION → CONTRACT technique
  // Slightly expand centerlines so near-touching edges overlap, union them, then contract back
  const EXPAND_AMOUNT = 10.0 * COORD_SCALE; // 10cm expansion

  console.log(`Step 1: Expanding centerlines by ${EXPAND_AMOUNT / COORD_SCALE}cm`);
  const expandedPaths = clipper.offsetToPaths({
    delta: EXPAND_AMOUNT,
    offsetInputs: [{
      data: allRoomPaths,
      joinType: JoinType.Miter,
      endType: EndType.ClosedPolygon
    }],
    miterLimit: 1000.0 // Very high = sharp corners only
  });

  console.log(`Step 2: Union of ${expandedPaths.length} expanded paths`);
  const mergedExpandedPaths = clipper.clipToPaths({
    clipType: ClipType.Union,
    subjectInputs: [{
      data: expandedPaths,
      closed: true
    }],
    subjectFillType: PolyFillType.NonZero
  });

  console.log(`Union produced ${mergedExpandedPaths.length} polygon(s)`);

  console.log(`Step 3: Contracting merged polygons by ${EXPAND_AMOUNT / COORD_SCALE}cm`);
  const mergedPaths = clipper.offsetToPaths({
    delta: -EXPAND_AMOUNT,
    offsetInputs: [{
      data: mergedExpandedPaths,
      joinType: JoinType.Miter,
      endType: EndType.ClosedPolygon
    }],
    miterLimit: 1000.0 // Very high = sharp corners only
  });

  console.log(`Final result: ${mergedPaths.length} merged polygon(s)`);

  if (mergedPaths.length < allRoomPaths.length) {
    console.log(`✅ Rooms merged: ${allRoomPaths.length} rooms → ${mergedPaths.length} polygon(s)`);
  } else {
    console.warn(`⚠️ No merge occurred - rooms may not have touching edges`);
  }

  // The result is an array of paths (disconnected polygons)
  // Each path represents a disconnected group of rooms
  for (const path of mergedPaths) {
    // Convert path back to Vertex[] format (world coordinates)
    const mergedCenterlineWorld = pathToVertices(path);

    // Calculate offsets from merged centerline
    // Merged centerline is at halfThickness from floor (assuming rooms use interior wall thickness)
    const halfThickness = interiorWallThickness / 2;

    // Yellow line: floor + interiorWallThickness
    // From centerline: interiorWallThickness - halfThickness
    const yellowLineOffset = interiorWallThickness - halfThickness;
    const innerBoundaryWorld = offsetPolygonSimple(mergedCenterlineWorld, yellowLineOffset);

    // Outer envelope: floor + exteriorWallThickness
    // From centerline: exteriorWallThickness - halfThickness
    const outerOffset = exteriorWallThickness - halfThickness;
    const envelopeVerticesWorld = offsetPolygonSimple(mergedCenterlineWorld, outerOffset);

    // DEBUG: Contract the merged centerline by 7.5cm (for visualization) using simple geometric offset
    // This shows the inner boundary for interior walls (centerline - 7.5cm)
    const contractedEnvelopeWorld = offsetPolygonSimple(mergedCenterlineWorld, -7.5);

    // Find which rooms belong to this envelope
    // A room belongs to an envelope if its centroid is inside the envelope
    const roomsInThisEnvelope: string[] = [];
    for (const room of rooms) {
      // Get room centroid in world coordinates
      const roomCentroidLocal = polygonCentroid(room.vertices);
      const roomCentroidWorld = localToWorld(roomCentroidLocal, room.position, room.rotation, room.scale);

      if (pointInPolygon(roomCentroidWorld, envelopeVerticesWorld)) {
        roomsInThisEnvelope.push(room.id);
        // Convert envelope from world to local coordinates for this room
        const envelopeVerticesLocal = envelopeVerticesWorld.map(v =>
          worldToLocal(v, room.position, room.rotation, room.scale)
        );

        // Convert inner boundary (yellow line) from world to local coordinates
        const innerBoundaryLocal = innerBoundaryWorld.map(v =>
          worldToLocal(v, room.position, room.rotation, room.scale)
        );

        // Convert merged centerline from world to local coordinates
        const debugCenterlineLocal = mergedCenterlineWorld.map(v =>
          worldToLocal(v, room.position, room.rotation, room.scale)
        );

        // Convert contracted envelope from world to local coordinates
        const debugContractedLocal = contractedEnvelopeWorld.map(v =>
          worldToLocal(v, room.position, room.rotation, room.scale)
        );

        // Check if any vertices from the green polygon should be inserted into room vertices
        const updatedVertices = insertCollinearVerticesFromPolygon(room, contractedEnvelopeWorld);

        // Envelope is ONLY for UI rendering - NEVER generate walls from it!
        // Walls stay tied to room.vertices (geometry), not envelope

        envelopeMap.set(room.id, {
          envelope: envelopeVerticesLocal,
          innerBoundary: innerBoundaryLocal,
          debugCenterline: debugCenterlineLocal,
          debugContracted: debugContractedLocal,
          updatedVertices: updatedVertices || undefined // Include updated vertices if any
        });
      }
    }

    // Log which rooms were checked against this shared green polygon
    if (roomsInThisEnvelope.length > 1) {
      console.log(`🔗 Merged envelope checked ${roomsInThisEnvelope.length} rooms: ${roomsInThisEnvelope.join(', ')}`);
    }
  }

  // Fallback: if a room wasn't assigned to any envelope, give it its own
  for (const room of rooms) {
    if (!envelopeMap.has(room.id)) {
      // Remove collinear vertices before processing
      const cleanedCenterline = removeCollinearVertices(room.centerlineVertices);

      // Calculate offsets from centerline
      // Centerline is at halfThickness from floor
      const halfThickness = room.wallThickness / 2;

      // Yellow line: floor + interiorWallThickness
      // From centerline: interiorWallThickness - halfThickness
      const yellowLineOffset = interiorWallThickness - halfThickness;
      const innerBoundary = offsetPolygonSimple(cleanedCenterline, yellowLineOffset);

      // Outer envelope: floor + exteriorWallThickness
      // From centerline: exteriorWallThickness - halfThickness
      const outerOffset = exteriorWallThickness - halfThickness;
      const inflatedEnvelope = offsetPolygonSimple(cleanedCenterline, outerOffset);

      // DEBUG: Contract the centerline by 7.5cm (for visualization) using simple geometric offset
      const contractedEnvelope = offsetPolygonSimple(cleanedCenterline, -7.5);

      // NOTE: Do NOT call insertCollinearVerticesFromPolygon() here!
      // Fallback path means the room is NOT merging with anything.
      // A room's own green polygon checking against its own edges doesn't make sense.
      // updatedVertices should remain undefined so the reset logic in useFloorplan.ts triggers.

      // Envelope is ONLY for UI rendering - NEVER generate walls from it!
      // Walls stay tied to room.vertices (geometry), not envelope

      envelopeMap.set(room.id, {
        envelope: inflatedEnvelope,
        innerBoundary: innerBoundary,
        debugCenterline: cleanedCenterline,
        debugContracted: contractedEnvelope
        // updatedVertices is intentionally omitted - no vertex insertion for separated rooms
      });
    }
  }

  return envelopeMap;
}
