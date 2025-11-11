/**
 * Editing utilities - Pure functions for vertex/edge/wall/aperture manipulation
 * These functions contain the core business logic for edit mode operations
 */

import { Vertex, Room, Wall, Aperture } from '../types';
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
  dragType: 'vertex' | 'edge' | 'wall' | 'aperture' | null;
  startPoint: Vertex | null;
  originalVertices?: Vertex[];
  originalPosition?: Vertex;
  originalRotation?: number;
  originalScale?: number;
  vertexIndex?: number;
  edgeIndex?: number;
  wallIndex?: number;
  // Aperture drag specific fields
  apertureId?: string;
  sourceWallIndex?: number;
  sourceRoomId?: string;
  targetWallIndex?: number | null; // Target wall during drag (can be different from source)
  originalApertureDistance?: number;
  originalApertureAnchor?: 'start' | 'end';
  apertureClickOffsetPx?: number; // Offset from aperture start where user clicked (for better UX)
  apertureWidth?: number; // Aperture width in meters (needed for correct anchor='end' calculation)
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

/**
 * Create initial drag state for aperture drag
 */
export function createApertureDragState(
  room: Room,
  wallIndex: number,
  apertureId: string,
  worldPoint: Vertex
): EditDragState {
  const wall = room.walls[wallIndex];
  const aperture = wall.apertures?.find(a => a.id === apertureId);

  if (!aperture) {
    throw new Error(`Aperture ${apertureId} not found on wall ${wallIndex}`);
  }

  // Calculate the click offset within the aperture for better UX
  // This allows the user to drag from where they clicked, not from the aperture start
  const vertexArray = room.vertices;
  const n = vertexArray.length;

  let clickOffsetPx = 0; // Offset from aperture start where user clicked

  if (wall.vertexIndex < n) {
    const v1Local = vertexArray[wall.vertexIndex];
    const v2Local = vertexArray[(wall.vertexIndex + 1) % n];
    const v1World = localToWorld(v1Local, room.position, room.rotation, room.scale);
    const v2World = localToWorld(v2Local, room.position, room.rotation, room.scale);

    // Calculate wall direction
    const dx = v2World.x - v1World.x;
    const dy = v2World.y - v1World.y;
    const wallLength = Math.sqrt(dx * dx + dy * dy);

    if (wallLength > 0) {
      // Calculate aperture position on wall
      const apertureWidthPx = aperture.width * 100;
      let apertureStartPx: number;

      if (aperture.anchorVertex === 'end') {
        apertureStartPx = wallLength - (aperture.distance * 100) - apertureWidthPx;
      } else {
        apertureStartPx = aperture.distance * 100;
      }

      // Project click point onto wall to find click position
      const pointDx = worldPoint.x - v1World.x;
      const pointDy = worldPoint.y - v1World.y;
      const dotProduct = pointDx * dx + pointDy * dy;
      const t = Math.max(0, Math.min(1, dotProduct / (wallLength * wallLength)));
      const clickPositionPx = t * wallLength;

      // Calculate offset from aperture start
      clickOffsetPx = clickPositionPx - apertureStartPx;

      // Clamp to aperture bounds
      clickOffsetPx = Math.max(0, Math.min(apertureWidthPx, clickOffsetPx));
    }
  }

  return {
    isDragging: false,
    dragType: 'aperture',
    startPoint: worldPoint,
    originalVertices: [...room.vertices],
    originalPosition: { ...room.position },
    originalRotation: room.rotation,
    originalScale: room.scale,
    apertureId,
    sourceWallIndex: wallIndex,
    sourceRoomId: room.id,
    originalApertureDistance: aperture.distance,
    originalApertureAnchor: aperture.anchorVertex,
    apertureClickOffsetPx: clickOffsetPx, // Store click offset for drag
    apertureWidth: aperture.width // Store width for correct anchor='end' calculation
  };
}

/**
 * Calculate aperture position during drag
 * Returns the target wall index, new distance, and anchor vertex
 */
export function calculateApertureDrag(params: {
  worldPoint: Vertex;
  dragState: EditDragState;
  targetRoom: Room;
  targetWallIndex: number | null;
}): {
  targetWallIndex: number;
  newDistance: number;
  newAnchor: 'start' | 'end';
  isValid: boolean;
} | null {
  const { worldPoint, dragState, targetRoom, targetWallIndex } = params;

  if (!dragState.startPoint || dragState.originalPosition === undefined ||
      dragState.originalRotation === undefined || dragState.originalScale === undefined) {
    return null;
  }

  // If no target wall detected, return null
  if (targetWallIndex === null) {
    return null;
  }

  const wall = targetRoom.walls[targetWallIndex];
  if (!wall) {
    return null;
  }

  // Get wall vertices in world space
  const vertexArray = targetRoom.vertices;
  const n = vertexArray.length;

  if (wall.vertexIndex >= n) {
    return null;
  }

  const v1Local = vertexArray[wall.vertexIndex];
  const v2Local = vertexArray[(wall.vertexIndex + 1) % n];

  const v1World = localToWorld(v1Local, targetRoom.position, targetRoom.rotation, targetRoom.scale);
  const v2World = localToWorld(v2Local, targetRoom.position, targetRoom.rotation, targetRoom.scale);

  // Calculate wall direction
  const dx = v2World.x - v1World.x;
  const dy = v2World.y - v1World.y;
  const wallLength = Math.sqrt(dx * dx + dy * dy);

  if (wallLength === 0) {
    return null;
  }

  // Project worldPoint onto wall edge to find position along wall
  const pointDx = worldPoint.x - v1World.x;
  const pointDy = worldPoint.y - v1World.y;
  const dotProduct = pointDx * dx + pointDy * dy;
  const t = Math.max(0, Math.min(1, dotProduct / (wallLength * wallLength)));

  // Distance from start in pixels (where cursor is)
  const cursorPositionPx = t * wallLength;

  // Get click offset from drag state (where user clicked within aperture)
  const clickOffsetPx = dragState.apertureClickOffsetPx || 0;

  // Get aperture width from drag state
  const apertureWidthPx = (dragState.apertureWidth || 0) * 100;

  // Calculate aperture start position by subtracting the click offset
  // This makes the aperture follow the cursor maintaining the relative position
  const apertureStartPx = cursorPositionPx - clickOffsetPx;

  // Calculate aperture end position
  const apertureEndPx = apertureStartPx + apertureWidthPx;

  // Distance from start to aperture start
  const distanceFromStartPx = apertureStartPx;

  // Distance from end to aperture END (not start!)
  // This is critical: anchor='end' measures from wall end to aperture end
  const distanceFromEndPx = wallLength - apertureEndPx;

  // Choose anchor based on which end is closer
  let newAnchor: 'start' | 'end';
  let newDistance: number;

  if (distanceFromStartPx < distanceFromEndPx) {
    // Closer to start
    newAnchor = 'start';
    newDistance = distanceFromStartPx / 100; // Convert to meters: distance from wall start to aperture start
  } else {
    // Closer to end
    newAnchor = 'end';
    newDistance = distanceFromEndPx / 100; // Convert to meters: distance from wall end to aperture end
  }

  return {
    targetWallIndex,
    newDistance,
    newAnchor,
    isValid: true // Will be validated by positioning algorithm
  };
}
