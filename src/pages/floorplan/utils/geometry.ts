/**
 * Basic geometry utility functions
 */

import { Vertex, Room } from '../types';
import { getWallQuad } from './walls';
import polygonClipping from 'polygon-clipping';

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
 * Offset a polygon outward by a given distance
 * Similar to calculateCenterline but for any polygon
 */
function offsetPolygonOutward(vertices: Vertex[], offsetDistance: number): Vertex[] {
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

    // Perpendicular outward (for CCW polygon, right-hand normal)
    const normalX = dy / length;
    const normalY = -dx / length;

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

  // Find intersections of adjacent offset lines (mitered corners)
  const offsetVertices: Vertex[] = [];
  for (let i = 0; i < offsetLines.length; i++) {
    const line1 = offsetLines[i];
    const line2 = offsetLines[(i + 1) % offsetLines.length];

    // Find intersection using determinant method
    const det = (line1.end.x - line1.start.x) * (line2.end.y - line2.start.y) -
                (line1.end.y - line1.start.y) * (line2.end.x - line2.start.x);

    if (Math.abs(det) > 0.001) {
      const t1 = ((line2.start.x - line1.start.x) * (line2.end.y - line2.start.y) -
                  (line2.start.y - line1.start.y) * (line2.end.x - line2.start.x)) / det;

      const intersection = {
        x: line1.start.x + t1 * (line1.end.x - line1.start.x),
        y: line1.start.y + t1 * (line1.end.y - line1.start.y)
      };

      offsetVertices.push(intersection);
    } else {
      // Parallel lines - use midpoint
      offsetVertices.push({
        x: (line1.end.x + line2.start.x) / 2,
        y: (line1.end.y + line2.start.y) / 2
      });
    }
  }

  return offsetVertices;
}

/**
 * Calculate envelope polygons for all rooms using polygon clipping
 * Connected rooms will merge into one envelope, disconnected rooms get separate envelopes
 * Returns a Map of room ID to their envelope vertices (in local coordinates)
 */
export function calculateFloorplanEnvelopes(
  rooms: Room[]
): Map<string, Vertex[]> {
  const envelopeMap = new Map<string, Vertex[]>();

  if (rooms.length === 0) {
    return envelopeMap;
  }

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
  const allRoomPolygons: polygonClipping.Polygon[] = [];

  for (const room of rooms) {
    // Transform centerline vertices to WORLD coordinates
    const worldVertices = room.centerlineVertices.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );

    // Convert to polygon-clipping format: [[[x, y], [x, y], ...]]
    const coords = worldVertices.map(v => [v.x, v.y] as [number, number]);
    coords.push(coords[0]); // Close the polygon

    const polygon: polygonClipping.Polygon = [coords];
    allRoomPolygons.push(polygon);
  }

  // If no rooms, return empty envelopes
  if (allRoomPolygons.length === 0) {
    return envelopeMap;
  }

  // Merge all room polygons using union
  let mergedPolygon = allRoomPolygons[0];
  for (let i = 1; i < allRoomPolygons.length; i++) {
    mergedPolygon = polygonClipping.union(mergedPolygon, allRoomPolygons[i]);
  }

  // The result is a MultiPolygon (array of polygons)
  // Each polygon represents a disconnected group of rooms
  const multiPolygon = mergedPolygon;

  // For each polygon in the MultiPolygon, find which rooms belong to it
  for (const polygon of multiPolygon) {
    // Get the outer ring (first ring) of this polygon
    const outerRing = polygon[0];

    // Convert back to Vertex[] format (world coordinates)
    let envelopeVerticesWorld: Vertex[] = outerRing
      .slice(0, -1) // Remove the duplicate closing point
      .map(coord => ({ x: coord[0], y: coord[1] }));

    // Inflate the envelope outward by half wall thickness (15cm default)
    // This offsets from centerline to outer edge
    const inflationDistance = 15; // cm - half of typical 30cm exterior wall
    envelopeVerticesWorld = offsetPolygonOutward(envelopeVerticesWorld, inflationDistance);

    // Find which rooms belong to this envelope
    // A room belongs to an envelope if its centroid is inside the envelope
    for (const room of rooms) {
      // Get room centroid in world coordinates
      const roomCentroidLocal = polygonCentroid(room.vertices);
      const roomCentroidWorld = localToWorld(roomCentroidLocal, room.position, room.rotation, room.scale);

      if (pointInPolygon(roomCentroidWorld, envelopeVerticesWorld)) {
        // Convert envelope from world to local coordinates for this room
        const envelopeVerticesLocal = envelopeVerticesWorld.map(v =>
          worldToLocal(v, room.position, room.rotation, room.scale)
        );
        envelopeMap.set(room.id, envelopeVerticesLocal);
      }
    }
  }

  // Fallback: if a room wasn't assigned to any envelope, give it its own
  for (const room of rooms) {
    if (!envelopeMap.has(room.id)) {
      // Inflate the room's centerline vertices to get outer edge
      const inflationDistance = 15; // cm - half of typical 30cm exterior wall
      const inflatedEnvelope = offsetPolygonOutward(room.centerlineVertices, inflationDistance);
      envelopeMap.set(room.id, inflatedEnvelope);
    }
  }

  return envelopeMap;
}
