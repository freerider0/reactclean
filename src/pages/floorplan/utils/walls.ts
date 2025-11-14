/**
 * Wall generation utilities
 * Pure functions for creating walls from room vertices
 * ALGORITHM COPIED FROM ORIGINAL WallGenerationService.ts
 */

import { Vertex, Wall, Room, WallType, Aperture } from '../types';

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
 * Filter and adjust apertures for a subsegment of a wall that was split
 *
 * @param apertures - Original apertures from the unsplit wall
 * @param oldV1 - Start vertex of original wall
 * @param oldV2 - End vertex of original wall
 * @param newV1 - Start vertex of new wall segment
 * @param newV2 - End vertex of new wall segment
 * @returns Filtered and adjusted apertures that belong to this segment
 */
function filterAperturesForSegment(
  apertures: Aperture[] | undefined,
  oldV1: Vertex,
  oldV2: Vertex,
  newV1: Vertex,
  newV2: Vertex
): Aperture[] {
  if (!apertures || apertures.length === 0) {
    return [];
  }

  // Calculate old edge length
  const oldDx = oldV2.x - oldV1.x;
  const oldDy = oldV2.y - oldV1.y;
  const oldLength = Math.sqrt(oldDx * oldDx + oldDy * oldDy);

  if (oldLength === 0) return [];

  // Calculate parametric position of new segment on old edge
  // t = 0 means at oldV1, t = 1 means at oldV2
  const getParametricPosition = (point: Vertex): number => {
    const dx = point.x - oldV1.x;
    const dy = point.y - oldV1.y;
    const projection = (dx * oldDx + dy * oldDy) / (oldLength * oldLength);
    return Math.max(0, Math.min(1, projection)); // Clamp to [0, 1]
  };

  const t_start = getParametricPosition(newV1);
  const t_end = getParametricPosition(newV2);

  // Calculate absolute positions in meters
  const abs_start = t_start * oldLength;
  const abs_end = t_end * oldLength;
  const newLength = abs_end - abs_start;

  if (newLength <= 0) return [];

  // Filter and adjust apertures
  const filteredApertures: Aperture[] = [];

  for (const aperture of apertures) {
    // Calculate aperture's absolute position on old edge (in meters from oldV1)
    let apertureAbsPos: number;
    if (aperture.anchorVertex === 'start') {
      apertureAbsPos = aperture.distance;
    } else {
      // anchorVertex === 'end', measure from oldV2
      apertureAbsPos = oldLength - aperture.distance;
    }

    // Check if aperture falls within the new segment
    // Use small tolerance to handle floating point precision
    const tolerance = 0.001; // 1mm tolerance
    if (apertureAbsPos >= abs_start - tolerance && apertureAbsPos <= abs_end + tolerance) {
      // Calculate new distance from start of new segment
      const newDistance = apertureAbsPos - abs_start;

      // Create adjusted aperture (always measure from start of new segment)
      filteredApertures.push({
        ...aperture,
        anchorVertex: 'start',
        distance: Math.max(0, newDistance) // Ensure non-negative
      });
    }
  }

  return filteredApertures;
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

  // Strategy 0 (PREFERRED): Match by stable vertex IDs
  // This works even when vertices are recentered or positions change
  if (v1.id && v2.id) {
    const matchingWall = existingWalls.find(w => {
      if (!w.startVertexId || !w.endVertexId) return false;

      // Check forward direction
      const forwardMatch = w.startVertexId === v1.id && w.endVertexId === v2.id;
      // Check reverse direction (shouldn't happen, but be defensive)
      const reverseMatch = w.startVertexId === v2.id && w.endVertexId === v1.id;

      return forwardMatch || reverseMatch;
    });

    if (matchingWall) {
      // console.log(`✅ Wall match found (Strategy 0 - Vertex IDs): wall[${newWallIndex}] matched with vertex IDs ${v1.id} → ${v2.id}`);
      return matchingWall;
    } else {
      // Log when Strategy 0 fails - this is the primary cause of aperture loss
      console.warn(`⚠️ Wall match failed (Strategy 0): wall[${newWallIndex}] vertices ${v1.id} → ${v2.id} not found in existing walls`);
      const wallsWithIds = existingWalls.filter(w => w.startVertexId && w.endVertexId);
      if (wallsWithIds.length > 0) {
        console.warn(`   Available walls with IDs:`, wallsWithIds.map(w => `${w.startVertexId} → ${w.endVertexId}`));
      }
    }
  } else {
    console.warn(`⚠️ Wall match Strategy 0 skipped: wall[${newWallIndex}] vertices missing IDs (v1.id=${v1.id}, v2.id=${v2.id})`);
  }

  // Strategy 1: If vertex count is the same, match by topology (vertexIndex)
  // This handles vertex movement correctly
  if (newVertices.length === oldVertices.length) {
    const matchingWall = existingWalls.find(w => w.vertexIndex === newWallIndex);
    if (matchingWall) {
      // console.log(`✅ Wall match found (Strategy 1 - Topology): wall[${newWallIndex}] matched by vertex index`);
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
      // console.log(`✅ Wall match found (Strategy 2 - Position): wall[${newWallIndex}] matched by exact position`);
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
      // Filter apertures to only include those that fall within this segment
      const filteredApertures = filterAperturesForSegment(
        wall.apertures,
        oldV1,
        oldV2,
        v1,
        v2
      );

      // console.log(`✅ Wall match found (Strategy 3 - Subsegment): wall[${newWallIndex}] is a subsegment of old wall`);
      // Return wall with filtered apertures
      return {
        ...wall,
        apertures: filteredApertures
      };
    }
  }

  // No match found - apertures will be lost!
  console.error(`❌ NO WALL MATCH FOUND: wall[${newWallIndex}] (${v1.id} → ${v2.id}) - APERTURES WILL BE LOST!`);
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

  // Validation: Ensure all vertices have IDs for proper wall matching
  const verticesWithoutIds = vertices.filter(v => !v.id);
  if (verticesWithoutIds.length > 0) {
    console.error(`❌ generateWalls called with ${verticesWithoutIds.length} vertices missing IDs!`, verticesWithoutIds);
    console.error('   This will cause aperture loss when walls are regenerated.');
  }

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
      startVertexId: innerStart.id, // Stable vertex ID reference
      endVertexId: innerEnd.id,     // Stable vertex ID reference
      thickness: existingWall?.thickness ?? thickness,
      wallType: existingWall?.wallType ?? 'interior_division', // Preserve or default
      height: existingWall?.height ?? 2.7, // Preserve or default
      apertures: existingWall?.apertures ?? [], // Preserve or default to empty
      normal: { x: normalX, y: normalY },
      // Store the computed corner intersections
      startCorner,
      endCorner,
      // Preserve roomEdgeIndex for proper matching during envelope recalculation
      roomEdgeIndex: existingWall?.roomEdgeIndex ?? i
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

    // Match this envelope wall directly to existing walls by checking ALL existing walls
    // Don't use proximity! Just iterate through existing walls and see if any match by index or topology
    let matchedWall: Wall | undefined;
    let wallStartId: string | undefined;
    let wallEndId: string | undefined;

    if (existingWalls) {
      // Try to match by the SAME index first (works when vertex count doesn't change)
      if (i < existingWalls.length) {
        const candidateWall = existingWalls[i];
        // Use this wall's vertex IDs as our IDs
        wallStartId = candidateWall.startVertexId;
        wallEndId = candidateWall.endVertexId;
        matchedWall = candidateWall;
        // console.log(`🗺️ Envelope wall ${i} → using existing wall[${i}] IDs: ${wallStartId?.substring(0,8)} → ${wallEndId?.substring(0,8)}`);
      }
    }

    // Now match apertures using the wall we found
    let apertures: Wall['apertures'] = [];
    let preservedHeight: number | undefined;
    if (matchedWall) {
      // console.log(`✅ generateWallsFromEnvelope: Matched envelope wall ${i} to existing wall (${matchedWall.apertures?.length || 0} apertures)`);
      apertures = matchedWall.apertures ?? [];
      thickness = matchedWall.thickness;
      preservedHeight = matchedWall.height;
    } else {
      console.warn(`⚠️ generateWallsFromEnvelope: No existing wall found for envelope wall ${i}`);
    }

    walls.push({
      vertexIndex: i,
      startVertexId: wallStartId, // Preserve from existing wall
      endVertexId: wallEndId,     // Preserve from existing wall
      thickness,
      wallType,
      height: preservedHeight ?? 2.7,
      apertures,
      normal: { x: normalX, y: normalY },
      startCorner,
      endCorner,
      roomEdgeIndex: matchedWall?.roomEdgeIndex ?? i // Preserve roomEdgeIndex
    });
  }

  return walls;
}
