/**
 * Assembly utilities - Pure functions for room positioning and rotation
 * These functions contain the core business logic for assembly mode operations
 */

import { Vertex, Room } from '../types';
import { snapToGrid } from './snapping';
import { snapRoomToRooms, RoomSnapResult } from './roomJoining';
import { calculateAngle, snapAngleToIncrement, normalizeAngle, calculateRoomCenter } from './rotation';

export const DRAG_THRESHOLD = 3; // pixels before starting drag

/**
 * Drag state type for assembly operations
 */
export interface AssemblyDragState {
  isDragging: boolean;
  dragType: 'room' | 'rotation' | null;
  startPoint: Vertex | null;
  originalPosition?: Vertex;
  originalRotation?: number;
}

/**
 * Calculate new room position during drag
 */
export function calculateRoomDragPosition(params: {
  originalPosition: Vertex;
  startPoint: Vertex;
  currentPoint: Vertex;
  gridSnapEnabled: boolean;
  gridSize: number;
  roomJoiningEnabled: boolean;
  draggedRoom: Room;
  allRooms: Room[];
  visualizationOnly: boolean;
}): {
  position: Vertex;
  snapResult: RoomSnapResult | null;
} {
  const {
    originalPosition,
    startPoint,
    currentPoint,
    gridSnapEnabled,
    gridSize,
    roomJoiningEnabled,
    draggedRoom,
    allRooms,
    visualizationOnly
  } = params;

  // Calculate delta (proposed offset from original position)
  const deltaX = currentPoint.x - startPoint.x;
  const deltaY = currentPoint.y - startPoint.y;

  const proposedOffset = { x: deltaX, y: deltaY };

  // Apply room joining snap
  if (roomJoiningEnabled) {
    const snapResult = snapRoomToRooms(draggedRoom, proposedOffset, allRooms, visualizationOnly);

    // During drag, just use the delta (rotation will be applied on drag end)
    const newPosition = {
      x: originalPosition.x + deltaX,
      y: originalPosition.y + deltaY
    };

    return { position: newPosition, snapResult };
  } else {
    // No room joining - use grid snap if enabled
    let newPosition = {
      x: originalPosition.x + deltaX,
      y: originalPosition.y + deltaY
    };

    if (gridSnapEnabled) {
      const snapResult = snapToGrid(newPosition, gridSize);
      if (snapResult.position) {
        newPosition = snapResult.position;
      }
    }

    return { position: newPosition, snapResult: null };
  }
}

/**
 * Calculate final room transformation when drag ends with room joining
 */
export function calculateFinalRoomSnap(params: {
  draggedRoom: Room;
  originalPosition: Vertex;
  originalRotation: number;
  startPoint: Vertex;
  endPoint: Vertex;
  allRooms: Room[];
}): {
  position: Vertex;
  rotation?: number;
  snapped: boolean;
} | null {
  const {
    draggedRoom,
    originalPosition,
    originalRotation,
    startPoint,
    endPoint,
    allRooms
  } = params;

  // Calculate final offset
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const proposedOffset = { x: deltaX, y: deltaY };

  // Create a version of the room with original position/rotation for snap calculation
  const originalRoom = {
    ...draggedRoom,
    position: originalPosition,
    rotation: originalRotation
  };

  // Get final snap result (not visualization only)
  const finalSnapResult = snapRoomToRooms(originalRoom, proposedOffset, allRooms, false);

  if (finalSnapResult.snapped) {
    // Apply translation
    const newPosition = {
      x: originalPosition.x + finalSnapResult.translation.x,
      y: originalPosition.y + finalSnapResult.translation.y
    };

    // Apply rotation (for edge-only and edge-vertex modes)
    const result: { position: Vertex; rotation?: number; snapped: boolean } = {
      position: newPosition,
      snapped: true
    };

    if (finalSnapResult.mode === 'edge-only' || finalSnapResult.mode === 'edge-vertex') {
      result.rotation = originalRotation + finalSnapResult.rotation;
    }

    return result;
  }

  return null;
}

/**
 * Calculate new rotation angle for a room
 */
export function calculateRoomRotation(params: {
  room: Room;
  worldPoint: Vertex;
  snapEnabled: boolean;
}): number {
  const { room, worldPoint, snapEnabled } = params;

  // Calculate room center
  const center = calculateRoomCenter(room.vertices, room.position);

  // Calculate angle from center to mouse
  let newAngle = calculateAngle(center, worldPoint);

  // Apply angle snapping if enabled (snap to 15-degree increments)
  if (snapEnabled) {
    newAngle = snapAngleToIncrement(newAngle);
  }

  // Normalize angle
  newAngle = normalizeAngle(newAngle);

  return newAngle;
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
 * Create initial drag state for room drag
 */
export function createRoomDragState(
  room: Room,
  worldPoint: Vertex
): AssemblyDragState {
  return {
    isDragging: false,
    dragType: 'room',
    startPoint: worldPoint,
    originalPosition: { ...room.position },
    originalRotation: room.rotation
  };
}

/**
 * Create initial drag state for rotation
 */
export function createRotationDragState(
  room: Room,
  handleWorldPoint: Vertex
): AssemblyDragState {
  return {
    isDragging: true,
    dragType: 'rotation',
    startPoint: handleWorldPoint,
    originalPosition: room.position
  };
}
