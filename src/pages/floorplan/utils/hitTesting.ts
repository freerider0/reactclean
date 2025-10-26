/**
 * Hit testing utilities - detect clicks on rooms, vertices, and edges
 */

import { Vertex, Room, HitTestResult } from '../types';
import { distance, distanceToSegment, pointInPolygon } from './geometry';
import { localToWorld } from './coordinates';
import { getRotationHandlePosition, calculateRoomCenter } from './rotation';

// Hit test thresholds (in screen pixels)
const VERTEX_HIT_THRESHOLD = 20; // Larger for touch-friendly interaction
const EDGE_HIT_THRESHOLD = 8;
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
