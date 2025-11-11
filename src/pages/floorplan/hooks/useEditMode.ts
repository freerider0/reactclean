/**
 * useEditMode hook - manages edit mode functionality
 * Vertex/edge selection, dragging, add/delete
 */

import { useState, useCallback, useRef } from 'react';
import { Vertex, Room, DragState } from '../types';
import { snapToGrid } from '../utils/snapping';
import { distance, recenterVertices, distanceToSegment } from '../utils/geometry';
import { localToWorld, worldToLocal } from '../utils/coordinates';
import { generateWalls } from '../utils/walls';
import { solveRoom } from '../utils/constraintSolver';

const DRAG_THRESHOLD = 5; // pixels before starting drag

export function useEditMode(
  selectedRoom: Room | null,
  updateRoom: (roomId: string, updates: Partial<Room>) => void,
  gridSnapEnabled: boolean,
  gridSize: number,
  recalculateAllEnvelopes?: () => Promise<void>
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

    // Regenerate walls (preserve existing wall properties by matching vertex positions)
    const newWalls = generateWalls(
      centeredVertices,
      selectedRoom.wallThickness,
      selectedRoom.walls,
      dragState.originalVertices // Pass original vertices for matching
    );

    // Check if we need to auto-solve constraints in real-time
    const hasEnabledConstraints = selectedRoom.constraints && selectedRoom.constraints.some(c => c.enabled);

    if (hasEnabledConstraints) {
      // Create temporary room with updated vertices for solving
      const tempRoom = {
        ...selectedRoom,
        vertices: centeredVertices,
        walls: newWalls,
        position: newPosition
      };

      // Solve constraints (fix the dragged vertex so it stays where user put it)
      solveRoom(tempRoom, vertexIndex).then(async solvedRoom => {
        updateRoom(selectedRoom.id, {
          vertices: solvedRoom.vertices,
          walls: solvedRoom.walls,
          position: newPosition,
          primitives: solvedRoom.primitives
        });
        // DON'T recalculate envelopes during drag - causes race conditions
        // Envelope will be recalculated when drag ends in endVertexDrag()
      }).catch(error => {
        console.error('Error solving during vertex drag:', error);
        // Fallback: update without solving
        updateRoom(selectedRoom.id, {
          vertices: centeredVertices,
          walls: newWalls,
          position: newPosition
        });
        // DON'T recalculate envelopes during drag - causes race conditions
      });
    } else {
      // No constraints, just update normally
      updateRoom(selectedRoom.id, {
        vertices: centeredVertices,
        walls: newWalls,
        position: newPosition
      });
      // DON'T recalculate envelopes during drag - causes race conditions
      // Envelope will be recalculated when drag ends in endVertexDrag()
    }
  }, [selectedRoom, dragState, gridSnapEnabled, gridSize, updateRoom, recalculateAllEnvelopes]);

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

    // Update originalVertices after manual drag completes
    if (selectedRoom) {
      updateRoom(selectedRoom.id, {
        originalVertices: selectedRoom.vertices.map(v => ({ ...v }))
      });
    }

    // Recalculate envelopes after drag completes
    if (recalculateAllEnvelopes) {
      recalculateAllEnvelopes();
    }
  }, [selectedRoom, updateRoom, recalculateAllEnvelopes]);

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

    // Regenerate walls (preserve existing wall properties by matching vertex positions)
    const newWalls = generateWalls(
      centeredVertices,
      selectedRoom.wallThickness,
      selectedRoom.walls,
      dragState.originalVertices // Pass original vertices for matching
    );

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });

    // DON'T recalculate envelopes during drag - causes race conditions
    // Envelope will be recalculated when drag ends in endEdgeDrag()
  }, [selectedRoom, dragState, gridSnapEnabled, gridSize, updateRoom, recalculateAllEnvelopes]);

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

    // Update originalVertices after manual drag completes
    if (selectedRoom) {
      updateRoom(selectedRoom.id, {
        originalVertices: selectedRoom.vertices.map(v => ({ ...v }))
      });
    }

    // Recalculate envelopes after drag completes
    if (recalculateAllEnvelopes) {
      recalculateAllEnvelopes();
    }
  }, [selectedRoom, updateRoom, recalculateAllEnvelopes]);


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

    // Get the edge vertices
    const v1 = selectedRoom.vertices[edgeIndex];
    const v2 = selectedRoom.vertices[(edgeIndex + 1) % selectedRoom.vertices.length];

    // Project the point onto the edge to get the exact position on the line
    const { closestPoint: projectedPoint } = distanceToSegment(localPoint, v1, v2);

    // Insert vertex after edgeIndex using the projected point
    const newVertices = [...selectedRoom.vertices];
    newVertices.splice(edgeIndex + 1, 0, projectedPoint);

    // Don't recenter - just add the vertex to the existing shape
    // Recentering causes unwanted displacement when adding vertices

    // Regenerate walls (preserve existing wall properties by matching vertex positions)
    const newWalls = generateWalls(
      newVertices,
      selectedRoom.wallThickness,
      selectedRoom.walls,
      selectedRoom.vertices // Pass original vertices for matching
    );

    updateRoom(selectedRoom.id, {
      vertices: newVertices,
      originalVertices: newVertices.map(v => ({ ...v })), // Update original vertices on manual edit
      walls: newWalls
    });

    // Recalculate envelopes after adding vertex
    if (recalculateAllEnvelopes) {
      recalculateAllEnvelopes();
    }
  }, [selectedRoom, updateRoom, recalculateAllEnvelopes]);

  /**
   * Start dragging a wall
   */
  const startWallDrag = useCallback((
    wallIndex: number,
    worldPoint: Vertex,
    screenPoint: { x: number; y: number }
  ) => {
    if (!selectedRoom) return;

    dragStartRef.current = screenPoint;

    setDragState({
      isDragging: false,
      dragType: 'edge', // Use 'edge' type since wall dragging is the same as edge dragging
      startPoint: worldPoint,
      originalVertices: [...selectedRoom.vertices],
      originalPosition: { ...selectedRoom.position },
      originalRotation: selectedRoom.rotation,
      originalScale: selectedRoom.scale
    });
  }, [selectedRoom]);

  /**
   * Update wall drag (move both vertices of the wall)
   */
  const updateWallDrag = useCallback((
    wallIndex: number,
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
      return;
    }

    // Only update if we're actually dragging
    if (!dragState.isDragging) return;

    // Calculate delta
    const deltaX = worldPoint.x - dragState.startPoint.x;
    const deltaY = worldPoint.y - dragState.startPoint.y;

    // Get the wall to find the vertex indices
    const wall = selectedRoom.walls[wallIndex];
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
      selectedRoom.wallThickness,
      selectedRoom.walls,
      dragState.originalVertices // Pass original vertices for matching
    );

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      walls: newWalls,
      position: newPosition
    });

    // DON'T recalculate envelopes during drag - causes race conditions
    // Envelope will be recalculated when drag ends in endWallDrag()
  }, [selectedRoom, dragState, gridSnapEnabled, gridSize, updateRoom, recalculateAllEnvelopes]);

  /**
   * End wall drag
   */
  const endWallDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      startPoint: null,
      originalVertices: undefined
    });
    dragStartRef.current = null;

    // Update originalVertices after manual drag completes
    if (selectedRoom) {
      updateRoom(selectedRoom.id, {
        originalVertices: selectedRoom.vertices.map(v => ({ ...v }))
      });
    }

    // Recalculate envelopes after drag completes
    if (recalculateAllEnvelopes) {
      recalculateAllEnvelopes();
    }
  }, [selectedRoom, updateRoom, recalculateAllEnvelopes]);

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

    // Regenerate walls (preserve existing wall properties by matching vertex positions)
    const newWalls = generateWalls(
      centeredVertices,
      selectedRoom.wallThickness,
      selectedRoom.walls,
      selectedRoom.vertices // Pass original vertices for matching
    );

    updateRoom(selectedRoom.id, {
      vertices: centeredVertices,
      originalVertices: centeredVertices.map(v => ({ ...v })), // Update original vertices on manual edit
      walls: newWalls,
      position: newPosition
    });

    // Recalculate envelopes after deleting vertex
    if (recalculateAllEnvelopes) {
      recalculateAllEnvelopes();
    }
  }, [selectedRoom, updateRoom, recalculateAllEnvelopes]);

  return {
    dragState,
    startVertexDrag,
    updateVertexDrag,
    endVertexDrag,
    startEdgeDrag,
    updateEdgeDrag,
    endEdgeDrag,
    startWallDrag,
    updateWallDrag,
    endWallDrag,
    addVertexToEdge,
    deleteVertex
  };
}
