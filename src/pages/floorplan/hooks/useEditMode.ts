/**
 * useEditMode hook - manages edit mode functionality
 * Vertex/edge selection, dragging, add/delete
 */

import { useState, useCallback, useRef } from 'react';
import { Vertex, Room, DragState } from '../types';
import { snapToGrid } from '../utils/snapping';
import { distance, recenterVertices } from '../utils/geometry';
import { localToWorld, worldToLocal } from '../utils/coordinates';
import { generateWalls } from '../utils/walls';

const DRAG_THRESHOLD = 5; // pixels before starting drag

export function useEditMode(
  selectedRoom: Room | null,
  updateRoom: (roomId: string, updates: Partial<Room>) => void,
  gridSnapEnabled: boolean,
  gridSize: number
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    startPoint: null,
    originalVertices: undefined,
    originalPosition: undefined
  });

  const dragStartRef = useRef<{ screenX: number; screenY: number } | null>(null);

  /**
   * Start dragging a vertex
   */
  const startVertexDrag = useCallback((
    vertexIndex: number,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    if (!selectedRoom) return;

    dragStartRef.current = screenPoint;

    setDragState({
      isDragging: false, // Will become true after threshold
      dragType: 'vertex',
      startPoint: worldPoint,
      originalVertices: [...selectedRoom.vertices],
      originalPosition: { ...selectedRoom.position },
      originalRotation: selectedRoom.rotation,
      originalScale: selectedRoom.scale
    });
  }, [selectedRoom]);

  /**
   * Update vertex drag
   */
  const updateVertexDrag = useCallback((
    vertexIndex: number,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    if (!selectedRoom || !dragState.startPoint || !dragState.originalVertices ||
        !dragState.originalPosition || dragState.originalRotation === undefined ||
        dragState.originalScale === undefined) return;

    // Check if we've moved enough to start dragging
    if (!dragState.isDragging && dragStartRef.current) {
      const dx = screenPoint.x - dragStartRef.current.x;
      const dy = screenPoint.y - dragStartRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < DRAG_THRESHOLD) {
        return; // Haven't moved enough yet
      }

      // Start dragging
      setDragState(prev => ({ ...prev, isDragging: true }));
      return; // Wait for next mouse move to actually update
    }

    // Only update if we're actually dragging
    if (!dragState.isDragging) return;

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

    // Regenerate walls
    const newWalls = generateWalls(centeredVertices, selectedRoom.wallThickness);

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });
  }, [selectedRoom, dragState, gridSnapEnabled, gridSize, updateRoom]);

  /**
   * End vertex drag
   */
  const endVertexDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      startPoint: null,
      originalVertices: undefined
    });
    dragStartRef.current = null;
  }, []);

  /**
   * Start dragging an edge
   */
  const startEdgeDrag = useCallback((
    edgeIndex: number,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    if (!selectedRoom) return;

    dragStartRef.current = screenPoint;

    setDragState({
      isDragging: false,
      dragType: 'edge',
      startPoint: worldPoint,
      originalVertices: [...selectedRoom.vertices],
      originalPosition: { ...selectedRoom.position },
      originalRotation: selectedRoom.rotation,
      originalScale: selectedRoom.scale
    });
  }, [selectedRoom]);

  /**
   * Update edge drag (move both vertices)
   */
  const updateEdgeDrag = useCallback((
    edgeIndex: number,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    if (!selectedRoom || !dragState.startPoint || !dragState.originalVertices ||
        !dragState.originalPosition || dragState.originalRotation === undefined ||
        dragState.originalScale === undefined) return;

    // Check drag threshold
    if (!dragState.isDragging && dragStartRef.current) {
      const dx = screenPoint.x - dragStartRef.current.x;
      const dy = screenPoint.y - dragStartRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < DRAG_THRESHOLD) {
        return;
      }

      setDragState(prev => ({ ...prev, isDragging: true }));
      return; // Wait for next mouse move to actually update
    }

    // Only update if we're actually dragging
    if (!dragState.isDragging) return;

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

    // Regenerate walls
    const newWalls = generateWalls(centeredVertices, selectedRoom.wallThickness);

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });
  }, [selectedRoom, dragState, gridSnapEnabled, gridSize, updateRoom]);

  /**
   * End edge drag
   */
  const endEdgeDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      startPoint: null,
      originalVertices: undefined
    });
    dragStartRef.current = null;
  }, []);

  /**
   * Find closest edge to a point
   * Copied from original AddVertexCommand.ts:115
   */
  const findClosestEdgeIndex = useCallback((point: Vertex, vertices: Vertex[]): number => {
    let minDistance = Infinity;
    let closestEdge = 0;

    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];

      // Calculate distance from point to line segment
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) {
        const dist = Math.hypot(point.x - v1.x, point.y - v1.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestEdge = i;
        }
        continue;
      }

      const t = Math.max(0, Math.min(1,
        ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / (length * length)
      ));

      const projection = {
        x: v1.x + t * dx,
        y: v1.y + t * dy
      };

      const dist = Math.hypot(point.x - projection.x, point.y - projection.y);

      if (dist < minDistance) {
        minDistance = dist;
        closestEdge = i;
      }
    }

    return closestEdge;
  }, []);

  /**
   * Add vertex at closest edge to world point
   * Adapted from original AddVertexCommand.ts
   */
  const addVertexToClosestEdge = useCallback((worldPoint: Vertex) => {
    if (!selectedRoom) return;

    // Convert to local coordinates
    const localPoint = worldToLocal(
      worldPoint,
      selectedRoom.position,
      selectedRoom.rotation,
      selectedRoom.scale
    );

    // Find closest edge
    const closestEdgeIndex = findClosestEdgeIndex(localPoint, selectedRoom.vertices);

    // Insert vertex after closest edge
    const newVertices = [...selectedRoom.vertices];
    newVertices.splice(closestEdgeIndex + 1, 0, localPoint);

    // Recenter vertices to maintain rotation around centroid
    const { centeredVertices, localOffset } = recenterVertices(newVertices);

    // Transform local offset to world space
    const cos = Math.cos(selectedRoom.rotation);
    const sin = Math.sin(selectedRoom.rotation);
    const worldOffset = {
      x: localOffset.x * cos - localOffset.y * sin,
      y: localOffset.x * sin + localOffset.y * cos
    };

    // Update position to account for recentering
    const newPosition = {
      x: selectedRoom.position.x + worldOffset.x,
      y: selectedRoom.position.y + worldOffset.y
    };

    // Regenerate walls
    const newWalls = generateWalls(centeredVertices, selectedRoom.wallThickness);

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });
  }, [selectedRoom, updateRoom, findClosestEdgeIndex]);

  /**
   * Add vertex to specific edge (for programmatic use)
   */
  const addVertexToEdge = useCallback((edgeIndex: number, worldPoint: Vertex) => {
    if (!selectedRoom) return;

    // Convert to local coordinates
    const localPoint = worldToLocal(
      worldPoint,
      selectedRoom.position,
      selectedRoom.rotation,
      selectedRoom.scale
    );

    // Insert vertex after edgeIndex
    const newVertices = [...selectedRoom.vertices];
    newVertices.splice(edgeIndex + 1, 0, localPoint);

    // Recenter vertices to maintain rotation around centroid
    const { centeredVertices, localOffset } = recenterVertices(newVertices);

    // Transform local offset to world space
    const cos = Math.cos(selectedRoom.rotation);
    const sin = Math.sin(selectedRoom.rotation);
    const worldOffset = {
      x: localOffset.x * cos - localOffset.y * sin,
      y: localOffset.x * sin + localOffset.y * cos
    };

    // Update position to account for recentering
    const newPosition = {
      x: selectedRoom.position.x + worldOffset.x,
      y: selectedRoom.position.y + worldOffset.y
    };

    // Regenerate walls
    const newWalls = generateWalls(centeredVertices, selectedRoom.wallThickness);

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });
  }, [selectedRoom, updateRoom]);

  /**
   * Delete vertex
   */
  const deleteVertex = useCallback((vertexIndex: number) => {
    if (!selectedRoom || selectedRoom.vertices.length <= 3) {
      console.warn('Cannot delete vertex: need at least 3 vertices');
      return;
    }

    const newVertices = selectedRoom.vertices.filter((_, i) => i !== vertexIndex);

    // Recenter vertices to maintain rotation around centroid
    const { centeredVertices, localOffset } = recenterVertices(newVertices);

    // Transform local offset to world space
    const cos = Math.cos(selectedRoom.rotation);
    const sin = Math.sin(selectedRoom.rotation);
    const worldOffset = {
      x: localOffset.x * cos - localOffset.y * sin,
      y: localOffset.x * sin + localOffset.y * cos
    };

    // Update position to account for recentering
    const newPosition = {
      x: selectedRoom.position.x + worldOffset.x,
      y: selectedRoom.position.y + worldOffset.y
    };

    // Regenerate walls
    const newWalls = generateWalls(centeredVertices, selectedRoom.wallThickness);

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });
  }, [selectedRoom, updateRoom]);

  return {
    dragState,
    startVertexDrag,
    updateVertexDrag,
    endVertexDrag,
    startEdgeDrag,
    updateEdgeDrag,
    endEdgeDrag,
    addVertexToEdge,
    addVertexToClosestEdge,
    deleteVertex
  };
}
