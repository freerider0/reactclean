/**
 * Edge splitting utilities for handling partially shared walls
 * Detects where envelope edges partially overlap and splits them into segments
 */

import { Vertex } from '../types';

/**
 * Check if two line segments partially overlap (collinear and overlapping)
 * Returns the overlap segment if found, null otherwise
 */
export function findLineSegmentOverlap(
  line1Start: Vertex,
  line1End: Vertex,
  line2Start: Vertex,
  line2End: Vertex,
  tolerance: number = 2 // 2cm tolerance
): { start: Vertex; end: Vertex } | null {
  // Check if lines are collinear
  const dx1 = line1End.x - line1Start.x;
  const dy1 = line1End.y - line1Start.y;
  const dx2 = line2End.x - line2Start.x;
  const dy2 = line2End.y - line2Start.y;

  // Calculate cross product to check if parallel
  const cross = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(cross) > 0.01) {
    return null; // Not parallel
  }

  // Check if point from line2 is on line1 (collinearity test)
  const dx = line2Start.x - line1Start.x;
  const dy = line2Start.y - line1Start.y;
  const crossTest = dx * dy1 - dy * dx1;
  if (Math.abs(crossTest) > tolerance) {
    return null; // Not collinear
  }

  // Lines are collinear, check for overlap
  // Project all points onto the line1 direction
  const length1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  if (length1 === 0) return null;

  const unitX = dx1 / length1;
  const unitY = dy1 / length1;

  // Project points onto line1's axis
  const t1Start = 0;
  const t1End = length1;
  const t2Start = (line2Start.x - line1Start.x) * unitX + (line2Start.y - line1Start.y) * unitY;
  const t2End = (line2End.x - line1Start.x) * unitX + (line2End.y - line1Start.y) * unitY;

  // Sort t2 values
  const t2Min = Math.min(t2Start, t2End);
  const t2Max = Math.max(t2Start, t2End);

  // Find overlap
  const overlapStart = Math.max(t1Start, t2Min);
  const overlapEnd = Math.min(t1End, t2Max);

  if (overlapEnd - overlapStart < tolerance) {
    return null; // No significant overlap
  }

  // Convert back to coordinates
  const startPoint = {
    x: line1Start.x + overlapStart * unitX,
    y: line1Start.y + overlapStart * unitY
  };
  const endPoint = {
    x: line1Start.x + overlapEnd * unitX,
    y: line1Start.y + overlapEnd * unitY
  };

  return { start: startPoint, end: endPoint };
}

/**
 * Split an envelope edge based on overlap regions
 * Returns array of segments with their classification (interior/exterior)
 */
export function splitEdgeAtOverlaps(
  edgeStart: Vertex,
  edgeEnd: Vertex,
  overlaps: Array<{ start: Vertex; end: Vertex }>
): Array<{ start: Vertex; end: Vertex; isShared: boolean }> {
  if (overlaps.length === 0) {
    return [{ start: edgeStart, end: edgeEnd, isShared: false }];
  }

  // Project all points onto edge axis
  const dx = edgeEnd.x - edgeStart.x;
  const dy = edgeEnd.y - edgeStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return [];

  const unitX = dx / length;
  const unitY = dy / length;

  // Create sorted list of all split points with their t values
  const splitPoints: Array<{ t: number; point: Vertex }> = [
    { t: 0, point: edgeStart },
    { t: length, point: edgeEnd }
  ];

  for (const overlap of overlaps) {
    const tStart = (overlap.start.x - edgeStart.x) * unitX + (overlap.start.y - edgeStart.y) * unitY;
    const tEnd = (overlap.end.x - edgeStart.x) * unitX + (overlap.end.y - edgeStart.y) * unitY;

    splitPoints.push({ t: tStart, point: overlap.start });
    splitPoints.push({ t: tEnd, point: overlap.end });
  }

  // Sort by t value
  splitPoints.sort((a, b) => a.t - b.t);

  // Remove duplicates
  const uniquePoints: typeof splitPoints = [];
  for (const point of splitPoints) {
    if (uniquePoints.length === 0 || Math.abs(point.t - uniquePoints[uniquePoints.length - 1].t) > 0.1) {
      uniquePoints.push(point);
    }
  }

  // Create segments
  const segments: Array<{ start: Vertex; end: Vertex; isShared: boolean }> = [];

  for (let i = 0; i < uniquePoints.length - 1; i++) {
    const segStart = uniquePoints[i].point;
    const segEnd = uniquePoints[i + 1].point;

    // Check if this segment midpoint is within any overlap
    const midT = (uniquePoints[i].t + uniquePoints[i + 1].t) / 2;
    const midPoint = {
      x: edgeStart.x + midT * unitX,
      y: edgeStart.y + midT * unitY
    };

    let isShared = false;
    for (const overlap of overlaps) {
      const overlapTStart = (overlap.start.x - edgeStart.x) * unitX + (overlap.start.y - edgeStart.y) * unitY;
      const overlapTEnd = (overlap.end.x - edgeStart.x) * unitX + (overlap.end.y - edgeStart.y) * unitY;
      const overlapTMin = Math.min(overlapTStart, overlapTEnd);
      const overlapTMax = Math.max(overlapTStart, overlapTEnd);

      if (midT >= overlapTMin && midT <= overlapTMax) {
        isShared = true;
        break;
      }
    }

    segments.push({ start: segStart, end: segEnd, isShared });
  }

  return segments;
}

/**
 * Insert split points into an envelope's vertex array
 * Returns new vertex array with split points inserted
 */
export function insertSplitPoints(
  vertices: Vertex[],
  splitPointsPerEdge: Map<number, Vertex[]>
): Vertex[] {
  const newVertices: Vertex[] = [];

  for (let i = 0; i < vertices.length; i++) {
    newVertices.push(vertices[i]);

    // Insert split points for this edge
    const splitPoints = splitPointsPerEdge.get(i);
    if (splitPoints && splitPoints.length > 0) {
      newVertices.push(...splitPoints);
    }
  }

  return newVertices;
}
