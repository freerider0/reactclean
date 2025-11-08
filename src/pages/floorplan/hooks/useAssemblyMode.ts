/**
 * useAssemblyMode hook - manages assembly mode functionality
 * Room selection, dragging, rotation
 */

import { useState, useCallback, useRef } from 'react';
import { Vertex, Room, DragState, GuideLine } from '../types';
import { snapToGrid } from '../utils/snapping';
import { snapRoomToRooms, RoomSnapResult } from '../utils/roomJoining';
import { calculateAngle, snapAngleToIncrement, normalizeAngle, calculateRoomCenter } from '../utils/rotation';

const DRAG_THRESHOLD = 3; // pixels before starting drag

export function useAssemblyMode(
  rooms: Room[],
  updateRoom: (roomId: string, updates: Partial<Room>) => void,
  gridSnapEnabled: boolean,
  gridSize: number,
  roomJoiningEnabled: boolean = true,
  recalculateAllEnvelopes?: () => void
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    startPoint: null,
    originalPosition: undefined,
    originalRotation: undefined
  });

  const [assemblyGuideLines, setAssemblyGuideLines] = useState<GuideLine[]>([]);
  const [lastSnapResult, setLastSnapResult] = useState<RoomSnapResult | null>(null);

  const dragStartRef = useRef<{ screenX: number; screenY: number } | null>(null);

  /**
   * Start dragging a room
   */
  const startRoomDrag = useCallback((
    room: Room,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    dragStartRef.current = screenPoint;

    setDragState({
      isDragging: false,
      dragType: 'room',
      startPoint: worldPoint,
      originalPosition: { ...room.position },
      originalRotation: room.rotation
    });
  }, []);

  /**
   * Update room drag
   */
  const updateRoomDrag = useCallback((
    roomId: string,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    if (!dragState.startPoint || !dragState.originalPosition) return;

    // Check drag threshold
    if (!dragState.isDragging && dragStartRef.current) {
      const dx = screenPoint.x - dragStartRef.current.x;
      const dy = screenPoint.y - dragStartRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < DRAG_THRESHOLD) {
        return;
      }

      setDragState(prev => ({ ...prev, isDragging: true }));
    }

    // Calculate delta (proposed offset from original position)
    const deltaX = worldPoint.x - dragState.startPoint.x;
    const deltaY = worldPoint.y - dragState.startPoint.y;

    const proposedOffset = { x: deltaX, y: deltaY };

    // Find the dragged room
    const draggedRoom = rooms.find(r => r.id === roomId);
    if (!draggedRoom) return;

    // Apply room joining snap (visualization only during drag)
    if (roomJoiningEnabled) {
      // Create a version of the room with original position/rotation for snap calculation
      const originalRoom = {
        ...draggedRoom,
        position: dragState.originalPosition!,
        rotation: dragState.originalRotation!
      };

      const snapResult = snapRoomToRooms(originalRoom, proposedOffset, rooms, true);
      setLastSnapResult(snapResult);

      // Just update position during drag (rotation will be applied on drag end)
      const newPosition = {
        x: dragState.originalPosition.x + deltaX,
        y: dragState.originalPosition.y + deltaY
      };

      updateRoom(roomId, { position: newPosition });
    } else {
      setLastSnapResult(null);

      let newPosition = {
        x: dragState.originalPosition.x + deltaX,
        y: dragState.originalPosition.y + deltaY
      };

      // Apply grid snapping if room joining is disabled
      if (gridSnapEnabled) {
        const snapResult = snapToGrid(newPosition, gridSize);
        if (snapResult.position) {
          newPosition = snapResult.position;
        }
      }

      updateRoom(roomId, { position: newPosition });
    }
  }, [dragState, gridSnapEnabled, gridSize, roomJoiningEnabled, updateRoom, rooms]);

  /**
   * End room drag
   */
  const endRoomDrag = useCallback((roomId?: string, worldPoint?: Vertex) => {
    // Apply final snap transformation if room joining is enabled
    if (roomJoiningEnabled && lastSnapResult && lastSnapResult.snapped && roomId && worldPoint && dragState.startPoint && dragState.originalPosition && dragState.originalRotation !== undefined) {
      // Calculate final offset
      const deltaX = worldPoint.x - dragState.startPoint.x;
      const deltaY = worldPoint.y - dragState.startPoint.y;
      const proposedOffset = { x: deltaX, y: deltaY };

      // Find the dragged room
      const draggedRoom = rooms.find(r => r.id === roomId);
      if (draggedRoom) {
        // Create a version of the room with original position/rotation for snap calculation
        const originalRoom = {
          ...draggedRoom,
          position: dragState.originalPosition,
          rotation: dragState.originalRotation
        };

        // Get final snap result (not visualization only)
        const finalSnapResult = snapRoomToRooms(originalRoom, proposedOffset, rooms, false);

        if (finalSnapResult.snapped) {
          // Apply translation
          const newPosition = {
            x: dragState.originalPosition.x + finalSnapResult.translation.x,
            y: dragState.originalPosition.y + finalSnapResult.translation.y
          };

          // Apply rotation (for edge-only and edge-vertex modes)
          const updates: Partial<Room> = { position: newPosition };
          if (finalSnapResult.mode === 'edge-only' || finalSnapResult.mode === 'edge-vertex') {
            updates.rotation = dragState.originalRotation + finalSnapResult.rotation;
          }

          updateRoom(roomId, updates);
        }
      }
    }

    setDragState({
      isDragging: false,
      dragType: null,
      startPoint: null,
      originalPosition: undefined,
      originalRotation: undefined
    });
    setAssemblyGuideLines([]);
    setLastSnapResult(null);
    dragStartRef.current = null;

    // Recalculate envelopes after EVERY drag end
    if (recalculateAllEnvelopes) {
      // Use setTimeout to ensure state updates complete first
      setTimeout(() => recalculateAllEnvelopes(), 0);
    }
  }, [roomJoiningEnabled, lastSnapResult, dragState, rooms, updateRoom, recalculateAllEnvelopes]);

  // Store original rotation for relative dragging
  const originalRotationRef = useRef<number>(0);

  /**
   * Start rotation
   */
  const startRotation = useCallback((
    room: Room,
    handleWorldPoint: Vertex
  ) => {
    originalRotationRef.current = room.rotation;

    setDragState({
      isDragging: true,
      dragType: 'rotation',
      startPoint: handleWorldPoint,
      originalPosition: room.position
    });
  }, []);

  /**
   * Update rotation
   */
  const updateRotation = useCallback((
    roomId: string,
    room: Room,
    worldPoint: Vertex,
    snapEnabled: boolean = false
  ) => {
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

    updateRoom(roomId, { rotation: newAngle });
  }, [updateRoom]);

  /**
   * End rotation
   */
  const endRotation = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      startPoint: null,
      originalPosition: undefined
    });
    originalRotationRef.current = 0;
  }, []);

  return {
    dragState,
    assemblyGuideLines,
    lastSnapResult,
    startRoomDrag,
    updateRoomDrag,
    endRoomDrag,
    startRotation,
    updateRotation,
    endRotation
  };
}
