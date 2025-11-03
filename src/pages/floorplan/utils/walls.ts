/**
 * Wall generation utilities
 * Pure functions for creating walls from room vertices
 * ALGORITHM COPIED FROM ORIGINAL WallGenerationService.ts
 */

import { Vertex, Wall } from '../types';

/**
 * Find intersection point of two lines
 * Copied from original WallGenerationService.ts:565
 */
function findLineIntersection(
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

  // Lines are parallel
  if (Math.abs(denom) < 0.0001) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  // Intersection point
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

/**
 * Check if point lies on line segment
 */
function pointOnSegment(
  point: Vertex,
  v1: Vertex,
  v2: Vertex,
  tolerance: number = 0.01
): boolean {
  // Calculate distance from point to line segment
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return false;

  // Project point onto line
  const t = ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / (length * length);

  // Check if projection is on segment (between 0 and 1)
  if (t < 0 || t > 1) return false;

  // Calculate closest point on segment
  const closestX = v1.x + t * dx;
  const closestY = v1.y + t * dy;

  // Check distance
  const dist = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
  return dist < tolerance;
}

/**
 * Find matching wall from old walls by comparing vertex positions and topology
 * Handles both vertex movement and vertex insertion/deletion
 */
function findMatchingWall(
  newWallIndex: number,
  v1: Vertex,
  v2: Vertex,
  newVertices: Vertex[],
  oldVertices: Vertex[],
  existingWalls: Wall[]
): Wall | undefined {
  const tolerance = 0.01; // 0.01 cm tolerance for matching vertices

  // Strategy 1: If vertex count is the same, match by topology (vertexIndex)
  // This handles vertex movement correctly
  if (newVertices.length === oldVertices.length) {
    const matchingWall = existingWalls.find(w => w.vertexIndex === newWallIndex);
    if (matchingWall) {
      return matchingWall;
    }
  }

  // Strategy 2: Try exact position match
  // This works for walls that weren't affected by vertex add/delete
  for (const wall of existingWalls) {
    const oldV1 = oldVertices[wall.vertexIndex];
    const oldV2 = oldVertices[(wall.vertexIndex + 1) % oldVertices.length];

    // Check if vertices match exactly (same start and end)
    const v1Match = Math.abs(v1.x - oldV1.x) < tolerance && Math.abs(v1.y - oldV1.y) < tolerance;
    const v2Match = Math.abs(v2.x - oldV2.x) < tolerance && Math.abs(v2.y - oldV2.y) < tolerance;

    if (v1Match && v2Match) {
      return wall;
    }
  }

  // Strategy 3: Check if this new wall segment lies within an old wall
  // This handles the case where a vertex was added to split a wall
  for (const wall of existingWalls) {
    const oldV1 = oldVertices[wall.vertexIndex];
    const oldV2 = oldVertices[(wall.vertexIndex + 1) % oldVertices.length];

    // Check if both new vertices lie on the old wall segment
    const v1OnOld = pointOnSegment(v1, oldV1, oldV2, tolerance);
    const v2OnOld = pointOnSegment(v2, oldV1, oldV2, tolerance);

    if (v1OnOld && v2OnOld) {
      // This new wall is a subsegment of the old wall (wall was split)
      return wall;
    }
  }

  return undefined;
}

/**
 * Generate walls from room vertices with proper corner intersections
 * Adapted from original WallGenerationService.ts:420 (generateWallsWithIntersections)
 *
 * @param vertices - Room vertices
 * @param thickness - Default wall thickness
 * @param existingWalls - Optional existing walls to preserve properties (wallType, height, apertures)
 * @param oldVertices - Optional old vertices to match against (required if existingWalls is provided)
 */
export function generateWalls(
  vertices: Vertex[],
  thickness: number,
  existingWalls?: Wall[],
  oldVertices?: Vertex[]
): Wall[] {
  if (vertices.length < 3) return [];

  const walls: Wall[] = [];
  const numEdges = vertices.length;

  // Generate wall for each edge with proper corners
  for (let i = 0; i < numEdges; i++) {
    const prevIndex = (i - 1 + numEdges) % numEdges;
    const nextIndex = (i + 1) % numEdges;

    // Get edge vertices (inner side follows room polygon exactly)
    const innerStart = vertices[i];
    const innerEnd = vertices[nextIndex];

    // Calculate edge normal (pointing outward for CCW polygon)
    const dx = innerEnd.x - innerStart.x;
    const dy = innerEnd.y - innerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalX = dy / length;
    const normalY = -dx / length;

    // Calculate outer line for this edge
    const outerLineStart = {
      x: innerStart.x + normalX * thickness,
      y: innerStart.y + normalY * thickness
    };
    const outerLineEnd = {
      x: innerEnd.x + normalX * thickness,
      y: innerEnd.y + normalY * thickness
    };

    // Calculate outer lines for adjacent edges to find intersections
    const prevEdgeStart = vertices[prevIndex];
    const prevEdgeEnd = innerStart;
    const prevDx = prevEdgeEnd.x - prevEdgeStart.x;
    const prevDy = prevEdgeEnd.y - prevEdgeStart.y;
    const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
    const prevNormalX = prevDy / prevLength;
    const prevNormalY = -prevDx / prevLength;

    const nextEdgeStart = innerEnd;
    const nextEdgeEnd = vertices[(nextIndex + 1) % numEdges];
    const nextDx = nextEdgeEnd.x - nextEdgeStart.x;
    const nextDy = nextEdgeEnd.y - nextEdgeStart.y;
    const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
    const nextNormalX = nextDy / nextLength;
    const nextNormalY = -nextDx / nextLength;

    // Find intersection for start corner
    const prevOuterLine = {
      start: { x: prevEdgeStart.x + prevNormalX * thickness, y: prevEdgeStart.y + prevNormalY * thickness },
      end: { x: prevEdgeEnd.x + prevNormalX * thickness, y: prevEdgeEnd.y + prevNormalY * thickness }
    };
    const currentOuterLineForStart = {
      start: outerLineStart,
      end: outerLineEnd
    };
    const startCorner = findLineIntersection(prevOuterLine, currentOuterLineForStart) || outerLineStart;

    // Find intersection for end corner
    const nextOuterLine = {
      start: { x: nextEdgeStart.x + nextNormalX * thickness, y: nextEdgeStart.y + nextNormalY * thickness },
      end: { x: nextEdgeEnd.x + nextNormalX * thickness, y: nextEdgeEnd.y + nextNormalY * thickness }
    };
    const currentOuterLineForEnd = {
      start: outerLineStart,
      end: outerLineEnd
    };
    const endCorner = findLineIntersection(currentOuterLineForEnd, nextOuterLine) || outerLineEnd;

    // Find existing wall by matching topology (if same vertex count) or positions (if different)
    let existingWall: Wall | undefined;
    if (existingWalls && oldVertices) {
      existingWall = findMatchingWall(i, innerStart, innerEnd, vertices, oldVertices, existingWalls);
    }

    // Store wall with computed corners and preserved/default properties
    walls.push({
      vertexIndex: i,
      thickness: existingWall?.thickness ?? thickness,
      wallType: existingWall?.wallType ?? 'interior_division', // Preserve or default
      height: existingWall?.height ?? 2.7, // Preserve or default
      apertures: existingWall?.apertures ?? [], // Preserve or default to empty
      normal: { x: normalX, y: normalY },
      // Store the computed corner intersections
      startCorner,
      endCorner
    });
  }

  return walls;
}

/**
 * Get wall vertices for rendering (as a quad with proper corners)
 * Recalculates corners based on transformed vertices to handle rotation/scale
 */
export function getWallQuad(
  wall: Wall,
  vertices: Vertex[]
): [Vertex, Vertex, Vertex, Vertex] {
  const numEdges = vertices.length;
  const i = wall.vertexIndex;
  const prevIndex = (i - 1 + numEdges) % numEdges;
  const nextIndex = (i + 1) % numEdges;

  // Get edge vertices (inner side follows room polygon exactly)
  const innerStart = vertices[i];
  const innerEnd = vertices[nextIndex];

  // Calculate edge normal (pointing outward for CCW polygon)
  const dx = innerEnd.x - innerStart.x;
  const dy = innerEnd.y - innerStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const normalX = dy / length;
  const normalY = -dx / length;

  // Calculate outer line for this edge
  const outerLineStart = {
    x: innerStart.x + normalX * wall.thickness,
    y: innerStart.y + normalY * wall.thickness
  };
  const outerLineEnd = {
    x: innerEnd.x + normalX * wall.thickness,
    y: innerEnd.y + normalY * wall.thickness
  };

  // Calculate outer lines for adjacent edges to find intersections
  const prevEdgeStart = vertices[prevIndex];
  const prevEdgeEnd = innerStart;
  const prevDx = prevEdgeEnd.x - prevEdgeStart.x;
  const prevDy = prevEdgeEnd.y - prevEdgeStart.y;
  const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
  const prevNormalX = prevDy / prevLength;
  const prevNormalY = -prevDx / prevLength;

  const nextEdgeStart = innerEnd;
  const nextEdgeEnd = vertices[(nextIndex + 1) % numEdges];
  const nextDx = nextEdgeEnd.x - nextEdgeStart.x;
  const nextDy = nextEdgeEnd.y - nextEdgeStart.y;
  const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
  const nextNormalX = nextDy / nextLength;
  const nextNormalY = -nextDx / nextLength;

  // Find intersection for start corner
  const prevOuterLine = {
    start: { x: prevEdgeStart.x + prevNormalX * wall.thickness, y: prevEdgeStart.y + prevNormalY * wall.thickness },
    end: { x: prevEdgeEnd.x + prevNormalX * wall.thickness, y: prevEdgeEnd.y + prevNormalY * wall.thickness }
  };
  const currentOuterLineForStart = {
    start: outerLineStart,
    end: outerLineEnd
  };
  const startCorner = findLineIntersection(prevOuterLine, currentOuterLineForStart) || outerLineStart;

  // Find intersection for end corner
  const nextOuterLine = {
    start: { x: nextEdgeStart.x + nextNormalX * wall.thickness, y: nextEdgeStart.y + nextNormalY * wall.thickness },
    end: { x: nextEdgeEnd.x + nextNormalX * wall.thickness, y: nextEdgeEnd.y + nextNormalY * wall.thickness }
  };
  const currentOuterLineForEnd = {
    start: outerLineStart,
    end: outerLineEnd
  };
  const endCorner = findLineIntersection(currentOuterLineForEnd, nextOuterLine) || outerLineEnd;

  // Create wall polygon: inner edge follows room polygon, outer edge uses intersections
  return [
    innerStart,   // Inner start (room vertex)
    innerEnd,     // Inner end (room vertex)
    endCorner,    // Outer end (intersection)
    startCorner   // Outer start (intersection)
  ];
}
