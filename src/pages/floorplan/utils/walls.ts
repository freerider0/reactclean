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
 * Generate walls from room vertices with proper corner intersections
 * Adapted from original WallGenerationService.ts:420 (generateWallsWithIntersections)
 */
export function generateWalls(vertices: Vertex[], thickness: number): Wall[] {
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

    // Store wall with computed corners
    walls.push({
      vertexIndex: i,
      thickness,
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
