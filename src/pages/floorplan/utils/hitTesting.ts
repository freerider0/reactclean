/**
 * Hit testing utilities - detect clicks on rooms, vertices, and edges
 */

import { Vertex, Room, HitTestResult } from '../types';
import { distance, distanceToSegment, pointInPolygon } from './geometry';
import { localToWorld } from './coordinates';
import { getRotationHandlePosition, calculateRoomCenter } from './rotation';
import type { FloorplanStore } from '../store/types/store';

/**
 * Comprehensive hit test result containing ALL clickable elements
 */
export interface ComprehensiveHitTestResult {
  // Room interior (point-in-polygon test)
  room: {
    roomId: string;
  } | null;

  // Vertex hit (highest priority for editing)
  vertex: {
    roomId: string;
    vertexId: string;
    vertexIndex: number;
    worldPosition: { x: number; y: number };
  } | null;

  // Closest edge across all rooms (for snapping/alignment)
  closestEdge: {
    roomId: string;
    wallIndex: number;
    distance: number;
    edgeStart: { x: number; y: number };
    edgeEnd: { x: number; y: number };
  } | null;

  // Closest segment on closest edge
  closestSegment: {
    roomId: string;
    wallIndex: number;
    segmentIndex: number;
    distance: number;
    segmentType: 'exterior' | 'interior';
  } | null;

  // Aperture (door/window)
  aperture: {
    roomId: string;
    wallIndex: number;
    apertureId: string;
    apertureType: 'door' | 'window';
  } | null;

  // Outer wall area (thick wall between envelope and interior)
  outerWall: {
    roomId: string;
    wallIndex: number;
  } | null;

  // Rotation handle
  rotationHandle: {
    roomId: string;
    handlePosition: { x: number; y: number };
  } | null;
}

// Hit test thresholds (in screen pixels)
const VERTEX_HIT_THRESHOLD = 20; // Larger for touch-friendly interaction
const EDGE_HIT_THRESHOLD = 8;
const WALL_HIT_THRESHOLD = 8; // Threshold for wall hit testing
const ROTATION_HANDLE_THRESHOLD = 15;

/**
 * Hit test a vertex
 */
export function hitTestVertex(
  point: Vertex,
  vertex: Vertex,
  threshold: number = VERTEX_HIT_THRESHOLD
): boolean {
  return distance(point, vertex) <= threshold;
}

/**
 * Hit test all vertices in a room
 * Returns the index of the hit vertex, or -1 if no hit
 */
export function hitTestRoomVertices(
  worldPoint: Vertex,
  room: Room,
  threshold: number = VERTEX_HIT_THRESHOLD,
  zoom: number = 1
): number {
  // Convert screen-pixel threshold to world units
  const worldThreshold = threshold / zoom;

  // Transform room vertices to world coordinates
  for (let i = 0; i < room.vertices.length; i++) {
    const localVertex = room.vertices[i];
    const worldVertex = localToWorld(localVertex, room.position, room.rotation, room.scale);

    if (hitTestVertex(worldPoint, worldVertex, worldThreshold)) {
      return i;
    }
  }

  return -1;
}

/**
 * Hit test an edge
 */
export function hitTestEdge(
  point: Vertex,
  edgeStart: Vertex,
  edgeEnd: Vertex,
  threshold: number = EDGE_HIT_THRESHOLD
): boolean {
  const { distance: dist } = distanceToSegment(point, edgeStart, edgeEnd);
  return dist <= threshold;
}

/**
 * Hit test all edges in a room
 * Returns the index of the hit edge, or -1 if no hit
 */
export function hitTestRoomEdges(
  worldPoint: Vertex,
  room: Room,
  threshold: number = EDGE_HIT_THRESHOLD
): number {
  // Transform room vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  for (let i = 0; i < worldVertices.length; i++) {
    const v1 = worldVertices[i];
    const v2 = worldVertices[(i + 1) % worldVertices.length];

    if (hitTestEdge(worldPoint, v1, v2, threshold)) {
      return i;
    }
  }

  return -1;
}

/**
 * Hit test all walls in a room
 * Returns the index of the hit wall, or -1 if no hit
 * Walls are tested based on their thickness (the thick outline around the room)
 */
export function hitTestRoomWalls(
  worldPoint: Vertex,
  room: Room
): number {
  // Determine which vertex array the walls reference
  // Walls generated from envelope reference envelopeVertices
  // Fallback to centerlineVertices or vertices for older data
  const vertexArray = room.envelopeVertices && room.envelopeVertices.length > 0
    ? room.envelopeVertices
    : (room.centerlineVertices && room.centerlineVertices.length > 0
        ? room.centerlineVertices
        : room.vertices);
  const n = vertexArray.length;

  for (let wallIndex = 0; wallIndex < room.walls.length; wallIndex++) {
    const wall = room.walls[wallIndex];

    // Skip if wall index is invalid for the vertex array
    if (wall.vertexIndex >= n) {
      console.warn(`Wall ${wallIndex} has invalid vertexIndex ${wall.vertexIndex} (max ${n-1})`);
      continue;
    }

    // Get the two vertices for this wall
    const v1Local = vertexArray[wall.vertexIndex];
    const v2Local = vertexArray[(wall.vertexIndex + 1) % n];

    // Transform to world coordinates
    const v1World = localToWorld(v1Local, room.position, room.rotation, room.scale);
    const v2World = localToWorld(v2Local, room.position, room.rotation, room.scale);

    // Calculate the edge direction and perpendicular normal
    const dx = v2World.x - v1World.x;
    const dy = v2World.y - v1World.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) continue;

    const dirX = dx / length;
    const dirY = dy / length;

    // Perpendicular OUTWARD (for CCW polygon, right-hand normal)
    const normalX = dirY;
    const normalY = -dirX;

    // Create the four corners of the wall rectangle
    // Inner edge (floor polygon side)
    const innerStart = { x: v1World.x, y: v1World.y };
    const innerEnd = { x: v2World.x, y: v2World.y };

    // Outer edge (wall outer boundary)
    const outerStart = {
      x: v1World.x + normalX * wall.thickness * room.scale,
      y: v1World.y + normalY * wall.thickness * room.scale
    };
    const outerEnd = {
      x: v2World.x + normalX * wall.thickness * room.scale,
      y: v2World.y + normalY * wall.thickness * room.scale
    };

    // Check if point is inside the wall area (between inner and outer edges)
    // Create a polygon from the four corners
    const wallPolygon = [innerStart, innerEnd, outerEnd, outerStart];
    if (pointInPolygon(worldPoint, wallPolygon)) {
      return wallIndex;
    }
  }

  return -1;
}

/**
 * Hit test external walls (envelope-generated walls)
 * Returns the wall index if hit, or -1 if no hit
 */
export function hitTestExternalWalls(
  worldPoint: Vertex,
  room: Room
): number {
  if (!room.envelopeVertices || !room.debugContractedEnvelope) return -1;
  if (room.envelopeVertices.length !== room.debugContractedEnvelope.length) return -1;
  if (!room.walls || room.walls.length === 0) return -1;

  // Transform both envelopes to world coordinates
  const outerWorld = room.envelopeVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );
  const innerWorld = room.debugContractedEnvelope.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  const n = outerWorld.length;

  // Test each wall quadrilateral
  for (let i = 0; i < n; i++) {
    // Find the wall for this edge
    const wallIndex = room.walls.findIndex(w => w.vertexIndex === i);
    if (wallIndex === -1) continue;

    const wall = room.walls[wallIndex];

    // Get quadrilateral vertices
    const innerStart = innerWorld[i];
    const innerEnd = innerWorld[(i + 1) % n];
    const outerEnd = outerWorld[(i + 1) % n];
    const outerStart = outerWorld[i];

    // Test if point is inside quadrilateral
    const quad = [innerStart, innerEnd, outerEnd, outerStart];
    if (pointInPolygon(worldPoint, quad)) {
      return wallIndex;
    }
  }

  return -1;
}

/**
 * Hit test a room (point in polygon test)
 */
export function hitTestRoom(worldPoint: Vertex, room: Room): boolean {
  // Transform room vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  return pointInPolygon(worldPoint, worldVertices);
}

/**
 * Find all rooms that contain the given point
 */
export function findRoomsAtPoint(
  worldPoint: Vertex,
  rooms: Room[]
): Room[] {
  return rooms.filter(room => hitTestRoom(worldPoint, room));
}

/**
 * Comprehensive hit test - check vertex, edge, then room
 * Returns the most specific hit
 */
export function comprehensiveHitTest(
  worldPoint: Vertex,
  room: Room
): HitTestResult {
  // Check vertices first (highest priority)
  const vertexIndex = hitTestRoomVertices(worldPoint, room);
  if (vertexIndex !== -1) {
    return {
      roomId: room.id,
      vertexIndex,
      distance: 0
    };
  }

  // Check edges second
  const edgeIndex = hitTestRoomEdges(worldPoint, room);
  if (edgeIndex !== -1) {
    return {
      roomId: room.id,
      edgeIndex,
      distance: 0
    };
  }

  // Check room polygon last
  if (hitTestRoom(worldPoint, room)) {
    return {
      roomId: room.id,
      distance: 0
    };
  }

  return {
    distance: Infinity
  };
}

/**
 * Find the best hit across all rooms
 * Priority: vertex > edge > room
 */
export function findBestHit(
  worldPoint: Vertex,
  rooms: Room[]
): HitTestResult | null {
  let bestHit: HitTestResult | null = null;
  let bestPriority = Infinity;

  for (const room of rooms) {
    const hit = comprehensiveHitTest(worldPoint, room);

    // Priority: vertex (1) > edge (2) > room (3)
    let priority = Infinity;
    if (hit.vertexIndex !== undefined) {
      priority = 1;
    } else if (hit.edgeIndex !== undefined) {
      priority = 2;
    } else if (hit.roomId !== undefined) {
      priority = 3;
    }

    if (priority < bestPriority) {
      bestPriority = priority;
      bestHit = hit;
    }
  }

  return bestHit;
}

/**
 * Hit test rotation handle
 * Returns true if point is within the rotation handle
 */
export function hitTestRotationHandle(
  worldPoint: Vertex,
  room: Room,
  handleDistance: number = 80
): boolean {
  // Calculate room center
  const center = calculateRoomCenter(room.vertices, room.position);

  // Calculate handle position
  const handlePos = getRotationHandlePosition(center, room.rotation, handleDistance);

  // Check distance to handle
  const dist = distance(worldPoint, handlePos);
  return dist < ROTATION_HANDLE_THRESHOLD;
}

/**
 * Hit test wall segments (for wall type assignment)
 * Returns { wallIndex, segmentIndex } if hit, or null if no hit
 */
export function hitTestRoomWallSegments(
  worldPoint: Vertex,
  room: Room
): { wallIndex: number; segmentIndex: number; distance: number } | null {
  // Check if point is inside the envelope (outer walls area)
  if (!room.envelopeVertices || room.envelopeVertices.length === 0) return null;

  const worldEnvelope = room.envelopeVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  const worldRoomVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Check if point is in envelope but not in room interior (i.e., in the wall area)
  const inEnvelope = pointInPolygon(worldPoint, worldEnvelope);
  const inRoom = pointInPolygon(worldPoint, worldRoomVertices);

  if (!inEnvelope || inRoom) {
    // Not in wall area
    return null;
  }

  // Point is in wall area - find which wall and segment
  let closestWallIndex = -1;
  let closestSegmentIndex = -1;
  let minDistance = Infinity;

  const n = room.vertices.length;

  // Build segmentVertex lookup map if available
  const segmentVertexMap = room.segmentVertices
    ? new Map(room.segmentVertices.map(v => [v.id, v]))
    : null;

  for (let wallIndex = 0; wallIndex < room.walls.length; wallIndex++) {
    const wall = room.walls[wallIndex];

    // Skip walls without segments
    if (!wall.segments || wall.segments.length === 0) continue;
    if (wallIndex >= n) continue;

    // Check each segment directly using segmentVertices
    if (segmentVertexMap && room.segmentVertices) {
      for (let segmentIndex = 0; segmentIndex < wall.segments.length; segmentIndex++) {
        const segment = wall.segments[segmentIndex];

        // Look up segment vertices
        const segStartLocal = segmentVertexMap.get(segment.startVertexId);
        const segEndLocal = segmentVertexMap.get(segment.endVertexId);

        if (!segStartLocal || !segEndLocal) continue;

        // Transform to world coordinates
        const segStart = localToWorld(segStartLocal, room.position, room.rotation, room.scale);
        const segEnd = localToWorld(segEndLocal, room.position, room.rotation, room.scale);

        // Calculate segment direction and length
        const segDx = segEnd.x - segStart.x;
        const segDy = segEnd.y - segStart.y;
        const segLength = Math.sqrt(segDx * segDx + segDy * segDy);

        if (segLength < 0.001) continue;

        // Project click point onto segment
        const pointDx = worldPoint.x - segStart.x;
        const pointDy = worldPoint.y - segStart.y;
        const projection = (pointDx * segDx + pointDy * segDy) / (segLength * segLength);
        const t = Math.max(0, Math.min(1, projection)); // Clamp to [0, 1]

        // Calculate perpendicular distance from point to segment
        const closestX = segStart.x + t * segDx;
        const closestY = segStart.y + t * segDy;
        const perpDist = Math.sqrt(
          (worldPoint.x - closestX) ** 2 + (worldPoint.y - closestY) ** 2
        );

        // If this segment is closer than previous best
        if (perpDist < minDistance) {
          minDistance = perpDist;
          closestWallIndex = wallIndex;
          closestSegmentIndex = segmentIndex;
        }
      }
    }
  }

  if (closestWallIndex !== -1 && closestSegmentIndex !== -1) {
    return { wallIndex: closestWallIndex, segmentIndex: closestSegmentIndex, distance: minDistance };
  }

  return null;
}

/**
 * Hit test apertures (doors and windows) in a room
 * Returns { wallIndex, apertureId } if hit, or null if no hit
 */
export function hitTestApertures(
  worldPoint: Vertex,
  room: Room
): { wallIndex: number; apertureId: string } | null {
  // Use room.vertices (inner edge) - same as rendering uses
  const vertexArray = room.vertices;
  const n = vertexArray.length;

  let totalApertures = 0;
  room.walls.forEach(w => totalApertures += (w.apertures?.length || 0));

  if (totalApertures > 0) {
    // console.log(`    🔍 hitTestApertures: Testing ${totalApertures} apertures in room ${room.id}`);
  }

  for (let wallIndex = 0; wallIndex < room.walls.length; wallIndex++) {
    const wall = room.walls[wallIndex];

    // Skip walls without apertures
    if (!wall.apertures || wall.apertures.length === 0) continue;

    // Skip if wall index is invalid
    if (wall.vertexIndex >= n) continue;

    // Get wall vertices
    const v1Local = vertexArray[wall.vertexIndex];
    const v2Local = vertexArray[(wall.vertexIndex + 1) % n];

    // Transform to world coordinates
    const v1World = localToWorld(v1Local, room.position, room.rotation, room.scale);
    const v2World = localToWorld(v2Local, room.position, room.rotation, room.scale);

    // Calculate wall direction and normal
    const dx = v2World.x - v1World.x;
    const dy = v2World.y - v1World.y;
    const wallLength = Math.sqrt(dx * dx + dy * dy);

    if (wallLength === 0) continue;

    const dirX = dx / wallLength;
    const dirY = dy / wallLength;

    // Perpendicular normal (outward)
    const normalX = dirY;
    const normalY = -dirX;

    // Test each aperture on this wall
    for (const aperture of wall.apertures) {
      // console.log(`      Testing ${aperture.type} ${aperture.id.substring(0, 8)}...`);

      // Convert aperture dimensions from meters to pixels
      const apertureWidthPx = aperture.width * 100;

      // Calculate start position along wall based on anchor vertex
      let startDist: number;
      if (aperture.anchorVertex === 'end') {
        startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
      } else {
        startDist = aperture.distance * 100;
      }

      // console.log(`        Wall length: ${wallLength.toFixed(1)}px, Start dist: ${startDist.toFixed(1)}px, Width: ${apertureWidthPx.toFixed(1)}px`);

      // Calculate aperture corners on room edge (inner edge)
      const roomEdgeStartX = v1World.x + dirX * startDist;
      const roomEdgeStartY = v1World.y + dirY * startDist;

      const roomEdgeEndX = roomEdgeStartX + dirX * apertureWidthPx;
      const roomEdgeEndY = roomEdgeStartY + dirY * apertureWidthPx;

      // Extend aperture outward from room edge (same as rendering: wall.thickness + 10cm)
      const apertureDepth = wall.thickness + 10;

      // Create aperture rectangle (4 corners)
      // Inner edge is on room boundary
      const innerStart = {
        x: roomEdgeStartX,
        y: roomEdgeStartY
      };
      const innerEnd = {
        x: roomEdgeEndX,
        y: roomEdgeEndY
      };
      // Outer edge extends outward
      const outerEnd = {
        x: roomEdgeEndX + normalX * apertureDepth * room.scale,
        y: roomEdgeEndY + normalY * apertureDepth * room.scale
      };
      const outerStart = {
        x: roomEdgeStartX + normalX * apertureDepth * room.scale,
        y: roomEdgeStartY + normalY * apertureDepth * room.scale
      };

      // Test if point is inside aperture rectangle
      const aperturePolygon = [innerStart, innerEnd, outerEnd, outerStart];
      const isInside = pointInPolygon(worldPoint, aperturePolygon);

      // console.log(`        Polygon: [${aperturePolygon.map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(', ')}]`);
      // console.log(`        Point: (${worldPoint.x.toFixed(0)}, ${worldPoint.y.toFixed(0)})`);
      // console.log(`        Result: ${isInside ? '✅ HIT!' : '❌ miss'}`);

      if (isInside) {
        return { wallIndex, apertureId: aperture.id };
      }
    }
  }

  return null;
}

/**
 * Perform comprehensive hit testing on all clickable elements
 * Returns a single structured object with ALL hit data
 */
export function performHitTest(
  worldPoint: Vertex,
  state: Pick<FloorplanStore, 'rooms' | 'viewport' | 'selection'>
): ComprehensiveHitTestResult {
  const rooms = Array.from(state.rooms.values());
  const zoom = state.viewport.zoom;

  const result: ComprehensiveHitTestResult = {
    room: null,
    vertex: null,
    closestEdge: null,
    closestSegment: null,
    aperture: null,
    outerWall: null,
    rotationHandle: null
  };

  // Test vertices across all rooms (highest priority)
  for (const room of rooms) {
    const vertexIndex = hitTestRoomVertices(worldPoint, room, VERTEX_HIT_THRESHOLD, zoom);
    if (vertexIndex !== -1) {
      const vertex = room.vertices[vertexIndex];
      const worldVertex = localToWorld(vertex, room.position, room.rotation, room.scale);
      result.vertex = {
        roomId: room.id,
        vertexId: vertex.id,
        vertexIndex,
        worldPosition: worldVertex
      };
      break; // Take first vertex hit
    }
  }

  // Test rotation handles (only for selected rooms)
  if (state.selection.selectedRoomIds.length > 0) {
    for (const roomId of state.selection.selectedRoomIds) {
      const room = state.rooms.get(roomId);
      if (room && hitTestRotationHandle(worldPoint, room)) {
        const center = calculateRoomCenter(room.vertices, room.position);
        const handlePos = getRotationHandlePosition(center, room.rotation, 80);
        result.rotationHandle = {
          roomId: room.id,
          handlePosition: handlePos
        };
        break;
      }
    }
  }

  // Test apertures across all rooms
  for (const room of rooms) {
    const apertureHit = hitTestApertures(worldPoint, room);
    if (apertureHit) {
      const wall = room.walls[apertureHit.wallIndex];
      const aperture = wall.apertures?.find(a => a.id === apertureHit.apertureId);
      if (aperture) {
        let finalRoomId = room.id;
        let finalWallIndex = apertureHit.wallIndex;
        let finalApertureId = apertureHit.apertureId;

        // For doors, check if there's a paired door in another room
        if (aperture.type === 'door') {
          // Calculate door center position
          const worldVertices = room.vertices.map(v =>
            localToWorld(v, room.position, room.rotation, room.scale)
          );
          const v1 = worldVertices[wall.vertexIndex];
          const v2 = worldVertices[(wall.vertexIndex + 1) % worldVertices.length];
          const wallDx = v2.x - v1.x;
          const wallDy = v2.y - v1.y;
          const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

          const apertureWidthPx = aperture.width * 100;
          let startDist: number;
          if (aperture.anchorVertex === 'end') {
            startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
          } else {
            startDist = aperture.distance * 100;
          }
          const doorCenterDist = startDist + apertureWidthPx / 2;
          const currentCenter = {
            x: v1.x + (wallDx / wallLength) * doorCenterDist,
            y: v1.y + (wallDy / wallLength) * doorCenterDist
          };

          // Check other rooms for paired doors
          let oldestRoom = room;
          let oldestWallIndex = apertureHit.wallIndex;
          let oldestApertureId = apertureHit.apertureId;

          for (const otherRoom of rooms) {
            if (otherRoom.id === room.id) continue;
            if (!otherRoom.walls) continue;

            const otherWorldVertices = otherRoom.vertices.map(v =>
              localToWorld(v, otherRoom.position, otherRoom.rotation, otherRoom.scale)
            );

            for (let otherWallIndex = 0; otherWallIndex < otherRoom.walls.length; otherWallIndex++) {
              const otherWall = otherRoom.walls[otherWallIndex];
              if (!otherWall.apertures) continue;

              for (const otherAperture of otherWall.apertures) {
                if (otherAperture.type !== 'door') continue;

                // Calculate other door center
                const ov1 = otherWorldVertices[otherWall.vertexIndex];
                const ov2 = otherWorldVertices[(otherWall.vertexIndex + 1) % otherWorldVertices.length];
                const oWallDx = ov2.x - ov1.x;
                const oWallDy = ov2.y - ov1.y;
                const oWallLength = Math.sqrt(oWallDx * oWallDx + oWallDy * oWallDy);

                const oApertureWidthPx = otherAperture.width * 100;
                let oStartDist: number;
                if (otherAperture.anchorVertex === 'end') {
                  oStartDist = oWallLength - (otherAperture.distance * 100) - oApertureWidthPx;
                } else {
                  oStartDist = otherAperture.distance * 100;
                }
                const oDoorCenterDist = oStartDist + oApertureWidthPx / 2;
                const otherCenter = {
                  x: ov1.x + (oWallDx / oWallLength) * oDoorCenterDist,
                  y: ov1.y + (oWallDy / oWallLength) * oDoorCenterDist
                };

                // Check if doors are at same position (within 5px threshold)
                const dist = Math.sqrt(
                  (currentCenter.x - otherCenter.x) ** 2 + (currentCenter.y - otherCenter.y) ** 2
                );

                if (dist < 5) {
                  // Found a paired door - keep the one from the older room
                  if ((otherRoom.createdAt || 0) < (oldestRoom.createdAt || 0)) {
                    oldestRoom = otherRoom;
                    oldestWallIndex = otherWallIndex;
                    oldestApertureId = otherAperture.id;
                  }
                }
              }
            }
          }

          // Use the door from the oldest room
          finalRoomId = oldestRoom.id;
          finalWallIndex = oldestWallIndex;
          finalApertureId = oldestApertureId;
        }

        result.aperture = {
          roomId: finalRoomId,
          wallIndex: finalWallIndex,
          apertureId: finalApertureId,
          apertureType: aperture.type
        };
        break; // Take first aperture hit
      }
    }
  }

  // Find globally closest edge across all rooms
  let minEdgeDistance = Infinity;
  for (const room of rooms) {
    const worldVertices = room.vertices.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );

    for (let i = 0; i < worldVertices.length; i++) {
      const v1 = worldVertices[i];
      const v2 = worldVertices[(i + 1) % worldVertices.length];
      const { distance: dist } = distanceToSegment(worldPoint, v1, v2);

      if (dist < minEdgeDistance) {
        minEdgeDistance = dist;
        result.closestEdge = {
          roomId: room.id,
          wallIndex: i,
          distance: dist,
          edgeStart: v1,
          edgeEnd: v2
        };
      }
    }
  }

  // Find segment on closest edge (if edge found and distance reasonable)
  if (result.closestEdge && result.closestEdge.distance < 50) {
    const room = state.rooms.get(result.closestEdge.roomId);
    if (room) {
      const segmentHit = hitTestRoomWallSegments(worldPoint, room);
      if (segmentHit && segmentHit.wallIndex === result.closestEdge.wallIndex) {
        const wall = room.walls[segmentHit.wallIndex];
        const segment = wall.segments?.[segmentHit.segmentIndex];
        if (segment) {
          result.closestSegment = {
            roomId: room.id,
            wallIndex: segmentHit.wallIndex,
            segmentIndex: segmentHit.segmentIndex,
            distance: segmentHit.distance,
            segmentType: segment.type
          };
        }
      }
    }
  }

  // Test room interiors (point-in-polygon)
  for (const room of rooms) {
    if (hitTestRoom(worldPoint, room)) {
      result.room = {
        roomId: room.id
      };
      break; // Take first room hit (for overlapping cases)
    }
  }

  // Test outer wall areas
  for (const room of rooms) {
    const wallIndex = hitTestRoomWalls(worldPoint, room);
    if (wallIndex !== -1) {
      result.outerWall = {
        roomId: room.id,
        wallIndex
      };
      break;
    }
  }

  return result;
}
