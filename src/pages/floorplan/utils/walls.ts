/**
 * Wall generation utilities
 * Pure functions for creating walls from room vertices
 * ALGORITHM COPIED FROM ORIGINAL WallGenerationService.ts
 */

import { Vertex, Wall, Room, WallType } from '../types';

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
    // Guard: Skip if wall.vertexIndex is out of bounds
    if (wall.vertexIndex >= oldVertices.length) continue;

    const oldV1 = oldVertices[wall.vertexIndex];
    const oldV2 = oldVertices[(wall.vertexIndex + 1) % oldVertices.length];

    // Guard: Skip if vertices are undefined
    if (!oldV1 || !oldV2) continue;

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
    // Guard: Skip if wall.vertexIndex is out of bounds
    if (wall.vertexIndex >= oldVertices.length) continue;

    const oldV1 = oldVertices[wall.vertexIndex];
    const oldV2 = oldVertices[(wall.vertexIndex + 1) % oldVertices.length];

    // Guard: Skip if vertices are undefined
    if (!oldV1 || !oldV2) continue;

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
    if (existingWalls && oldVertices && oldVertices.length > 0) {
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
 * Draws from floor vertices to centerline (half thickness only)
 */
export function getWallQuad(
  wall: Wall,
  vertices: Vertex[]
): [Vertex, Vertex, Vertex, Vertex] {
  const numEdges = vertices.length;
  const i = wall.vertexIndex;
  const prevIndex = (i - 1 + numEdges) % numEdges;
  const nextIndex = (i + 1) % numEdges;

  // Get edge vertices (inner side = floor vertices)
  const innerStart = vertices[i];
  const innerEnd = vertices[nextIndex];

  // Calculate edge normal (pointing outward for CCW polygon)
  const dx = innerEnd.x - innerStart.x;
  const dy = innerEnd.y - innerStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const normalX = dy / length;
  const normalY = -dx / length;

  // Draw only half thickness: from floor to centerline
  const halfThickness = wall.thickness / 2;

  // Calculate outer line for this edge (at centerline position)
  const outerLineStart = {
    x: innerStart.x + normalX * halfThickness,
    y: innerStart.y + normalY * halfThickness
  };
  const outerLineEnd = {
    x: innerEnd.x + normalX * halfThickness,
    y: innerEnd.y + normalY * halfThickness
  };

  // Calculate outer lines for adjacent edges to find intersections (also using half thickness)
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

  // Find intersection for start corner (using half thickness)
  const prevOuterLine = {
    start: { x: prevEdgeStart.x + prevNormalX * halfThickness, y: prevEdgeStart.y + prevNormalY * halfThickness },
    end: { x: prevEdgeEnd.x + prevNormalX * halfThickness, y: prevEdgeEnd.y + prevNormalY * halfThickness }
  };
  const currentOuterLineForStart = {
    start: outerLineStart,
    end: outerLineEnd
  };
  const startCorner = findLineIntersection(prevOuterLine, currentOuterLineForStart) || outerLineStart;

  // Find intersection for end corner (using half thickness)
  const nextOuterLine = {
    start: { x: nextEdgeStart.x + nextNormalX * halfThickness, y: nextEdgeStart.y + nextNormalY * halfThickness },
    end: { x: nextEdgeEnd.x + nextNormalX * halfThickness, y: nextEdgeEnd.y + nextNormalY * halfThickness }
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

/**
 * Check if two edges match (same vertices, within tolerance)
 * Used to detect shared edges between room envelopes
 */
function edgesMatch(
  edge1Start: Vertex,
  edge1End: Vertex,
  edge2Start: Vertex,
  edge2End: Vertex,
  tolerance: number = 5 // 5cm tolerance
): boolean {
  // Check forward direction
  const forwardMatch =
    Math.abs(edge1Start.x - edge2Start.x) < tolerance &&
    Math.abs(edge1Start.y - edge2Start.y) < tolerance &&
    Math.abs(edge1End.x - edge2End.x) < tolerance &&
    Math.abs(edge1End.y - edge2End.y) < tolerance;

  // Check reverse direction
  const reverseMatch =
    Math.abs(edge1Start.x - edge2End.x) < tolerance &&
    Math.abs(edge1Start.y - edge2End.y) < tolerance &&
    Math.abs(edge1End.x - edge2Start.x) < tolerance &&
    Math.abs(edge1End.y - edge2Start.y) < tolerance;

  return forwardMatch || reverseMatch;
}

/**
 * Classify wall type based on whether it's shared with other rooms or on exterior perimeter
 *
 * @param v1 - Wall edge start (world coordinates)
 * @param v2 - Wall edge end (world coordinates)
 * @param allRoomEnvelopes - All room envelopes in world coordinates (to detect shared edges)
 * @param currentRoomIndex - Index of current room (to skip self when checking)
 * @returns Wall type (exterior or interior_division)
 */
export function classifyWallType(
  v1: Vertex,
  v2: Vertex,
  allRoomEnvelopes: Vertex[][],
  currentRoomIndex: number
): WallType {
  // Check if this edge is shared with any other room's envelope
  for (let i = 0; i < allRoomEnvelopes.length; i++) {
    if (i === currentRoomIndex) continue; // Skip self

    const otherEnvelope = allRoomEnvelopes[i];

    // Check each edge in the other envelope
    for (let j = 0; j < otherEnvelope.length; j++) {
      const otherV1 = otherEnvelope[j];
      const otherV2 = otherEnvelope[(j + 1) % otherEnvelope.length];

      if (edgesMatch(v1, v2, otherV1, otherV2)) {
        // This edge is shared with another room = interior wall
        return 'interior_division';
      }
    }
  }

  // Not shared with any other room = exterior wall
  return 'exterior';
}

/**
 * Generate walls from envelope vertices (the merged outer perimeter)
 * This replaces the old approach of generating from room.vertices
 *
 * @param envelopeVertices - Envelope vertices in LOCAL coordinates
 * @param room - Current room (for position/rotation to transform to world)
 * @param allRooms - All rooms (to detect shared edges for interior wall classification)
 * @param defaultThickness - Default wall thickness in cm
 * @param existingWalls - Optional existing walls to preserve apertures
 * @returns Array of walls with auto-classified types
 */
export function generateWallsFromEnvelope(
  envelopeVertices: Vertex[],
  room: Room,
  allRooms: Room[],
  defaultThickness: number = 30,
  existingWalls?: Wall[]
): Wall[] {
  if (envelopeVertices.length < 3) return [];

  // Transform envelope to world coordinates for classification
  const cos = Math.cos(room.rotation);
  const sin = Math.sin(room.rotation);
  const worldEnvelope = envelopeVertices.map(v => ({
    x: room.position.x + (v.x * cos - v.y * sin) * room.scale,
    y: room.position.y + (v.x * sin + v.y * cos) * room.scale
  }));

  // Get all other rooms' envelopes in world coordinates
  const allRoomEnvelopes: Vertex[][] = allRooms.map((r, idx) => {
    if (!r.envelopeVertices || r.envelopeVertices.length < 3) return [];

    const rCos = Math.cos(r.rotation);
    const rSin = Math.sin(r.rotation);
    return r.envelopeVertices.map(v => ({
      x: r.position.x + (v.x * rCos - v.y * rSin) * r.scale,
      y: r.position.y + (v.x * rSin + v.y * rCos) * r.scale
    }));
  });

  const currentRoomIndex = allRooms.findIndex(r => r.id === room.id);

  const walls: Wall[] = [];
  const numEdges = envelopeVertices.length;

  // Generate wall for each envelope edge
  for (let i = 0; i < numEdges; i++) {
    const prevIndex = (i - 1 + numEdges) % numEdges;
    const nextIndex = (i + 1) % numEdges;

    // Get edge vertices (inner side = envelope boundary)
    const innerStart = envelopeVertices[i];
    const innerEnd = envelopeVertices[nextIndex];

    // Calculate edge normal (pointing inward, since envelope is the OUTER boundary)
    const dx = innerEnd.x - innerStart.x;
    const dy = innerEnd.y - innerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalX = -dy / length; // Negative for inward
    const normalY = dx / length;  // Swapped for inward

    // Use existing wall thickness if available
    let thickness = defaultThickness;
    if (existingWalls && existingWalls[i]) {
      thickness = existingWalls[i].thickness;
    }

    // Calculate outer line (actually inner, since we're offsetting inward from envelope)
    const outerLineStart = {
      x: innerStart.x + normalX * thickness,
      y: innerStart.y + normalY * thickness
    };
    const outerLineEnd = {
      x: innerEnd.x + normalX * thickness,
      y: innerEnd.y + normalY * thickness
    };

    // Calculate intersections for proper corners
    const prevEdgeStart = envelopeVertices[prevIndex];
    const prevEdgeEnd = innerStart;
    const prevDx = prevEdgeEnd.x - prevEdgeStart.x;
    const prevDy = prevEdgeEnd.y - prevEdgeStart.y;
    const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
    const prevNormalX = -prevDy / prevLength;
    const prevNormalY = prevDx / prevLength;

    const nextEdgeStart = innerEnd;
    const nextEdgeEnd = envelopeVertices[(nextIndex + 1) % numEdges];
    const nextDx = nextEdgeEnd.x - nextEdgeStart.x;
    const nextDy = nextEdgeEnd.y - nextEdgeStart.y;
    const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
    const nextNormalX = -nextDy / nextLength;
    const nextNormalY = nextDx / nextLength;

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

    // Classify wall type based on whether edge is shared with other rooms
    const worldV1 = worldEnvelope[i];
    const worldV2 = worldEnvelope[nextIndex];
    const wallType = classifyWallType(worldV1, worldV2, allRoomEnvelopes, currentRoomIndex);

    // Try to preserve apertures from existing walls by matching positions
    let apertures: Wall['apertures'] = [];
    if (existingWalls) {
      // Find matching wall by position
      const matchingWall = existingWalls.find(w => {
        if (!room.vertices || w.vertexIndex >= room.vertices.length) return false;
        const oldV1 = room.vertices[w.vertexIndex];
        const oldV2 = room.vertices[(w.vertexIndex + 1) % room.vertices.length];

        // Check if positions roughly match (within 10cm)
        const tolerance = 10;
        return pointOnSegment(oldV1, innerStart, innerEnd, tolerance) &&
               pointOnSegment(oldV2, innerStart, innerEnd, tolerance);
      });

      if (matchingWall) {
        apertures = matchingWall.apertures ?? [];
        // Also preserve custom thickness and height
        thickness = matchingWall.thickness;
      }
    }

    // Map this envelope edge to the corresponding centerline/room edge
    // Use centerlineVertices if available, otherwise fall back to room vertices
    const referenceVertices = (room.centerlineVertices && room.centerlineVertices.length > 0)
      ? room.centerlineVertices
      : room.vertices;

    // Calculate midpoint of envelope edge
    const envMidX = (innerStart.x + innerEnd.x) / 2;
    const envMidY = (innerStart.y + innerEnd.y) / 2;

    // Find closest reference edge
    let closestEdgeIndex = i; // Default to same index
    let minDist = Infinity;

    if (referenceVertices && referenceVertices.length > 0) {
      for (let j = 0; j < referenceVertices.length; j++) {
        const v1 = referenceVertices[j];
        const v2 = referenceVertices[(j + 1) % referenceVertices.length];

        // Calculate distance from envelope midpoint to reference edge
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) continue;

        // Project envelope midpoint onto reference edge
        const t = Math.max(0, Math.min(1,
          ((envMidX - v1.x) * dx + (envMidY - v1.y) * dy) / (len * len)
        ));

        const projX = v1.x + t * dx;
        const projY = v1.y + t * dy;

        const dist = Math.sqrt((envMidX - projX) ** 2 + (envMidY - projY) ** 2);

        if (dist < minDist) {
          minDist = dist;
          closestEdgeIndex = j;
        }
      }
    }

    walls.push({
      vertexIndex: i,
      thickness,
      wallType,
      height: existingWalls?.[i]?.height ?? 2.7,
      apertures,
      normal: { x: normalX, y: normalY },
      startCorner,
      endCorner,
      roomEdgeIndex: closestEdgeIndex // Map to room/centerline edge for constraints
    });
  }

  return walls;
}
