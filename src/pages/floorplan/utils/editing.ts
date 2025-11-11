/**
 * Editing utilities - Pure functions for vertex/edge/wall manipulation
 * These functions contain the core business logic for edit mode operations
 */

import { Vertex, Room, Wall } from '../types';
import { snapToGrid } from './snapping';
import { recenterVertices, distanceToSegment } from './geometry';
import { localToWorld, worldToLocal } from './coordinates';
import { generateWalls } from './walls';
import { solveRoom } from './constraintSolver';

export const DRAG_THRESHOLD = 5; // pixels before starting drag

/**
 * Drag state type for edit operations
 */
export interface EditDragState {
  isDragging: boolean;
  dragType: 'vertex' | 'edge' | 'wall' | null;
  startPoint: Vertex | null;
  originalVertices?: Vertex[];
  originalPosition?: Vertex;
  originalRotation?: number;
  originalScale?: number;
  vertexIndex?: number;
  edgeIndex?: number;
  wallIndex?: number;
}

/**
 * Calculate updated room state for vertex drag
 */
export async function calculateVertexDrag(params: {
  room: Room;
  vertexIndex: number;
  worldPoint: Vertex;
  dragState: EditDragState;
  gridSnapEnabled: boolean;
  gridSize: number;
}): Promise<Partial<Room>> {
  const { room, vertexIndex, worldPoint, dragState, gridSnapEnabled, gridSize } = params;

  if (!dragState.startPoint || !dragState.originalVertices ||
      !dragState.originalPosition || dragState.originalRotation === undefined ||
      dragState.originalScale === undefined) {
    throw new Error('Invalid drag state for vertex drag');
  }

  // Calculate delta from drag start
  const deltaX = worldPoint.x - dragState.startPoint.x;
  const deltaY = worldPoint.y - dragState.startPoint.y;

  // Get original vertex in world space using ORIGINAL transform
  const originalVertexWorld = localToWorld(
    dragState.originalVertices[vertexIndex],
    dragState.originalPosition,
    dragState.originalRotation,
    dragState.originalScale
  );

  // Apply delta to original vertex
  let newVertexWorld = {
    x: originalVertexWorld.x + deltaX,
    y: originalVertexWorld.y + deltaY
  };

  // Apply snapping
  if (gridSnapEnabled) {
    const snapResult = snapToGrid(newVertexWorld, gridSize);
    if (snapResult.position) {
      newVertexWorld = snapResult.position;
    }
  }

  // Convert to local coordinates using ORIGINAL transform
  const localPoint = worldToLocal(
    newVertexWorld,
    dragState.originalPosition,
    dragState.originalRotation,
    dragState.originalScale
  );

  // Update vertex
  const newVertices = [...dragState.originalVertices];
  newVertices[vertexIndex] = localPoint;

  // Recenter vertices to maintain rotation around centroid
  const { centeredVertices, localOffset } = recenterVertices(newVertices);

  // Transform local offset to world space using ORIGINAL rotation
  const cos = Math.cos(dragState.originalRotation);
  const sin = Math.sin(dragState.originalRotation);
  const worldOffset = {
    x: localOffset.x * cos - localOffset.y * sin,
    y: localOffset.x * sin + localOffset.y * cos
  };

  // Update position to account for recentering
  const newPosition = {
    x: dragState.originalPosition.x + worldOffset.x,
    y: dragState.originalPosition.y + worldOffset.y
  };

  // Regenerate walls (preserve existing wall properties by matching vertex positions)
  const newWalls = generateWalls(
    centeredVertices,
    room.wallThickness,
    room.walls,
    dragState.originalVertices // Pass original vertices for matching
  );

  // Check if we need to auto-solve constraints in real-time
  const hasEnabledConstraints = room.constraints && room.constraints.some(c => c.enabled);

  if (hasEnabledConstraints) {
    // Create temporary room with updated vertices for solving
    const tempRoom = {
      ...room,
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    };

    try {
      // Solve constraints (fix the dragged vertex so it stays where user put it)
      const solvedRoom = await solveRoom(tempRoom, vertexIndex);
      return {
        vertices: solvedRoom.vertices,
        walls: solvedRoom.walls,
        position: newPosition,
        primitives: solvedRoom.primitives
      };
    } catch (error) {
      console.error('Error solving during vertex drag:', error);
      // Fallback: update without solving
      return {
        vertices: centeredVertices,
        walls: newWalls,
        position: newPosition
      };
    }
  } else {
    // No constraints, just update normally
    return {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    };
  }
}

/**
 * Calculate updated room state for edge drag (moves both vertices)
 */
export function calculateEdgeDrag(params: {
  room: Room;
  edgeIndex: number;
  worldPoint: Vertex;
  dragState: EditDragState;
  gridSnapEnabled: boolean;
  gridSize: number;
}): Partial<Room> {
  const { room, edgeIndex, worldPoint, dragState, gridSnapEnabled, gridSize } = params;

  if (!dragState.startPoint || !dragState.originalVertices ||
      !dragState.originalPosition || dragState.originalRotation === undefined ||
      dragState.originalScale === undefined) {
    throw new Error('Invalid drag state for edge drag');
  }

  // Calculate delta
  const deltaX = worldPoint.x - dragState.startPoint.x;
  const deltaY = worldPoint.y - dragState.startPoint.y;

  // Get the two vertices of the edge
  const v1Index = edgeIndex;
  const v2Index = (edgeIndex + 1) % dragState.originalVertices.length;

  // Transform original vertices to world using ORIGINAL transform, apply delta, transform back
  const originalV1World = localToWorld(
    dragState.originalVertices[v1Index],
    dragState.originalPosition,
    dragState.originalRotation,
    dragState.originalScale
  );
  const originalV2World = localToWorld(
    dragState.originalVertices[v2Index],
    dragState.originalPosition,
    dragState.originalRotation,
    dragState.originalScale
  );

  let newV1World = { x: originalV1World.x + deltaX, y: originalV1World.y + deltaY };
  let newV2World = { x: originalV2World.x + deltaX, y: originalV2World.y + deltaY };

  // Apply snapping
  if (gridSnapEnabled) {
    const snap1 = snapToGrid(newV1World, gridSize);
    const snap2 = snapToGrid(newV2World, gridSize);
    if (snap1.position) newV1World = snap1.position;
    if (snap2.position) newV2World = snap2.position;
  }

  // Convert back to local using ORIGINAL transform
  const newV1Local = worldToLocal(newV1World, dragState.originalPosition, dragState.originalRotation, dragState.originalScale);
  const newV2Local = worldToLocal(newV2World, dragState.originalPosition, dragState.originalRotation, dragState.originalScale);

  // Update vertices
  const newVertices = [...dragState.originalVertices];
  newVertices[v1Index] = newV1Local;
  newVertices[v2Index] = newV2Local;

  // Recenter vertices to maintain rotation around centroid
  const { centeredVertices, localOffset } = recenterVertices(newVertices);

  // Transform local offset to world space using ORIGINAL rotation
  const cos = Math.cos(dragState.originalRotation);
  const sin = Math.sin(dragState.originalRotation);
  const worldOffset = {
    x: localOffset.x * cos - localOffset.y * sin,
    y: localOffset.x * sin + localOffset.y * cos
  };

  // Update position to account for recentering
  const newPosition = {
    x: dragState.originalPosition.x + worldOffset.x,
    y: dragState.originalPosition.y + worldOffset.y
  };

  // Regenerate walls (preserve existing wall properties by matching vertex positions)
  const newWalls = generateWalls(
    centeredVertices,
    room.wallThickness,
    room.walls,
    dragState.originalVertices // Pass original vertices for matching
  );

  return {
    vertices: centeredVertices,
    walls: newWalls,
    position: newPosition
  };
}

/**
 * Calculate updated room state for wall drag (moves both vertices of the wall)
 */
export function calculateWallDrag(params: {
  room: Room;
  wallIndex: number;
  worldPoint: Vertex;
  dragState: EditDragState;
  gridSnapEnabled: boolean;
  gridSize: number;
}): Partial<Room> {
  const { room, wallIndex, worldPoint, dragState, gridSnapEnabled, gridSize } = params;

  if (!dragState.startPoint || !dragState.originalVertices ||
      !dragState.originalPosition || dragState.originalRotation === undefined ||
      dragState.originalScale === undefined) {
    throw new Error('Invalid drag state for wall drag');
  }

  // Calculate delta
  const deltaX = worldPoint.x - dragState.startPoint.x;
  const deltaY = worldPoint.y - dragState.startPoint.y;

  // Get the wall to find the vertex indices
  const wall = room.walls[wallIndex];
  const v1Index = wall.vertexIndex;
  const v2Index = (wall.vertexIndex + 1) % dragState.originalVertices.length;

  // Transform original vertices to world using ORIGINAL transform, apply delta, transform back
  const originalV1World = localToWorld(
    dragState.originalVertices[v1Index],
    dragState.originalPosition,
    dragState.originalRotation,
    dragState.originalScale
  );
  const originalV2World = localToWorld(
    dragState.originalVertices[v2Index],
    dragState.originalPosition,
    dragState.originalRotation,
    dragState.originalScale
  );

  let newV1World = { x: originalV1World.x + deltaX, y: originalV1World.y + deltaY };
  let newV2World = { x: originalV2World.x + deltaX, y: originalV2World.y + deltaY };

  // Apply snapping
  if (gridSnapEnabled) {
    const snap1 = snapToGrid(newV1World, gridSize);
    const snap2 = snapToGrid(newV2World, gridSize);
    if (snap1.position) newV1World = snap1.position;
    if (snap2.position) newV2World = snap2.position;
  }

  // Convert back to local using ORIGINAL transform
  const newV1Local = worldToLocal(newV1World, dragState.originalPosition, dragState.originalRotation, dragState.originalScale);
  const newV2Local = worldToLocal(newV2World, dragState.originalPosition, dragState.originalRotation, dragState.originalScale);

  // Update vertices
  const newVertices = [...dragState.originalVertices];
  newVertices[v1Index] = newV1Local;
  newVertices[v2Index] = newV2Local;

  // Recenter vertices to maintain rotation around centroid
  const { centeredVertices, localOffset } = recenterVertices(newVertices);

  // Transform local offset to world space using ORIGINAL rotation
  const cos = Math.cos(dragState.originalRotation);
  const sin = Math.sin(dragState.originalRotation);
  const worldOffset = {
    x: localOffset.x * cos - localOffset.y * sin,
    y: localOffset.x * sin + localOffset.y * cos
  };

  // Update position to account for recentering
  const newPosition = {
    x: dragState.originalPosition.x + worldOffset.x,
    y: dragState.originalPosition.y + worldOffset.y
  };

  // Regenerate walls (preserve existing wall properties by matching vertex positions)
  const newWalls = generateWalls(
    centeredVertices,
    room.wallThickness,
    room.walls,
    dragState.originalVertices // Pass original vertices for matching
  );

  return {
    vertices: centeredVertices,
    walls: newWalls,
    position: newPosition
  };
}

/**
 * Calculate new vertices with an added vertex on an edge
 */
export function calculateAddVertexToEdge(params: {
  room: Room;
  edgeIndex: number;
  worldPoint: Vertex;
}): Partial<Room> {
  const { room, edgeIndex, worldPoint } = params;

  // Convert to local coordinates
  const localPoint = worldToLocal(
    worldPoint,
    room.position,
    room.rotation,
    room.scale
  );

  // Get the edge vertices
  const v1 = room.vertices[edgeIndex];
  const v2 = room.vertices[(edgeIndex + 1) % room.vertices.length];

  // Project the point onto the edge to get the exact position on the line
  const { closestPoint: projectedPoint } = distanceToSegment(localPoint, v1, v2);

  // Insert vertex after edgeIndex using the projected point
  const newVertices = [...room.vertices];
  newVertices.splice(edgeIndex + 1, 0, projectedPoint);

  // Don't recenter - just add the vertex to the existing shape
  // Recentering causes unwanted displacement when adding vertices

  // Regenerate walls (preserve existing wall properties by matching vertex positions)
  const newWalls = generateWalls(
    newVertices,
    room.wallThickness,
    room.walls,
    room.vertices // Pass original vertices for matching
  );

  return {
    vertices: newVertices,
    originalVertices: newVertices.map(v => ({ ...v })), // Update original vertices on manual edit
    walls: newWalls
  };
}

/**
 * Calculate new vertices with a vertex deleted
 */
export function calculateDeleteVertex(params: {
  room: Room;
  vertexIndex: number;
}): Partial<Room> | null {
  const { room, vertexIndex } = params;

  if (room.vertices.length <= 3) {
    console.warn('Cannot delete vertex: need at least 3 vertices');
    return null;
  }

  const newVertices = room.vertices.filter((_, i) => i !== vertexIndex);

  // Recenter vertices to maintain rotation around centroid
  const { centeredVertices, localOffset } = recenterVertices(newVertices);

  // Transform local offset to world space
  const cos = Math.cos(room.rotation);
  const sin = Math.sin(room.rotation);
  const worldOffset = {
    x: localOffset.x * cos - localOffset.y * sin,
    y: localOffset.x * sin + localOffset.y * cos
  };

  // Update position to account for recentering
  const newPosition = {
    x: room.position.x + worldOffset.x,
    y: room.position.y + worldOffset.y
  };

  // Regenerate walls (preserve existing wall properties by matching vertex positions)
  const newWalls = generateWalls(
    centeredVertices,
    room.wallThickness,
    room.walls,
    room.vertices // Pass original vertices for matching
  );

  return {
    vertices: centeredVertices,
    originalVertices: centeredVertices.map(v => ({ ...v })), // Update original vertices on manual edit
    walls: newWalls,
    position: newPosition
  };
}

/**
 * Check if drag threshold has been exceeded
 */
export function isDragThresholdExceeded(
  startPoint: { x: number; y: number },
  currentPoint: { x: number; y: number },
  threshold: number = DRAG_THRESHOLD
): boolean {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist >= threshold;
}

/**
 * Create initial drag state for vertex drag
 */
export function createVertexDragState(
  room: Room,
  vertexIndex: number,
  worldPoint: Vertex
): EditDragState {
  return {
    isDragging: false,
    dragType: 'vertex',
    startPoint: worldPoint,
    originalVertices: [...room.vertices],
    originalPosition: { ...room.position },
    originalRotation: room.rotation,
    originalScale: room.scale,
    vertexIndex
  };
}

/**
 * Create initial drag state for edge drag
 */
export function createEdgeDragState(
  room: Room,
  edgeIndex: number,
  worldPoint: Vertex
): EditDragState {
  return {
    isDragging: false,
    dragType: 'edge',
    startPoint: worldPoint,
    originalVertices: [...room.vertices],
    originalPosition: { ...room.position },
    originalRotation: room.rotation,
    originalScale: room.scale,
    edgeIndex
  };
}

/**
 * Create initial drag state for wall drag
 */
export function createWallDragState(
  room: Room,
  wallIndex: number,
  worldPoint: Vertex
): EditDragState {
  return {
    isDragging: false,
    dragType: 'wall',
    startPoint: worldPoint,
    originalVertices: [...room.vertices],
    originalPosition: { ...room.position },
    originalRotation: room.rotation,
    originalScale: room.scale,
    wallIndex
  };
}
