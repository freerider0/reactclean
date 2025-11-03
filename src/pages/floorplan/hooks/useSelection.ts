/**
 * useSelection hook - manages selection state for rooms, vertices, and edges
 */

import { useState, useCallback } from 'react';
import { SelectionState } from '../types';

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>({
    selectedRoomIds: [],
    selectedVertexIndex: null,
    selectedEdgeIndex: null,
    selectedWallIndex: null,
    hoverRoomId: null,
    hoverVertexIndex: null,
    hoverEdgeIndex: null,
    hoverWallIndex: null
  });

  /**
   * Select a single room
   */
  const selectRoom = useCallback((roomId: string, addToSelection: boolean = false) => {
    setSelection(prev => ({
      ...prev,
      selectedRoomIds: addToSelection
        ? [...prev.selectedRoomIds, roomId]
        : [roomId],
      selectedVertexIndex: null,
      selectedEdgeIndex: null,
      selectedWallIndex: null
    }));
  }, []);

  /**
   * Select multiple rooms
   */
  const selectRooms = useCallback((roomIds: string[]) => {
    setSelection(prev => ({
      ...prev,
      selectedRoomIds: roomIds,
      selectedVertexIndex: null,
      selectedEdgeIndex: null,
      selectedWallIndex: null
    }));
  }, []);

  /**
   * Deselect a room
   */
  const deselectRoom = useCallback((roomId: string) => {
    setSelection(prev => ({
      ...prev,
      selectedRoomIds: prev.selectedRoomIds.filter(id => id !== roomId)
    }));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelection({
      selectedRoomIds: [],
      selectedVertexIndex: null,
      selectedEdgeIndex: null,
      selectedWallIndex: null,
      hoverRoomId: null,
      hoverVertexIndex: null,
      hoverEdgeIndex: null,
      hoverWallIndex: null
    });
  }, []);

  /**
   * Select a vertex
   */
  const selectVertex = useCallback((vertexIndex: number) => {
    setSelection(prev => ({
      ...prev,
      selectedVertexIndex: vertexIndex,
      selectedEdgeIndex: null
    }));
  }, []);

  /**
   * Select an edge
   */
  const selectEdge = useCallback((edgeIndex: number) => {
    setSelection(prev => ({
      ...prev,
      selectedEdgeIndex: edgeIndex,
      selectedVertexIndex: null,
      selectedWallIndex: null
    }));
  }, []);

  /**
   * Select a wall
   */
  const selectWall = useCallback((wallIndex: number) => {
    setSelection(prev => ({
      ...prev,
      selectedWallIndex: wallIndex,
      selectedVertexIndex: null,
      selectedEdgeIndex: null
    }));
  }, []);

  /**
   * Clear vertex selection
   */
  const clearVertexSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedVertexIndex: null
    }));
  }, []);

  /**
   * Clear edge selection
   */
  const clearEdgeSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedEdgeIndex: null
    }));
  }, []);

  /**
   * Clear wall selection
   */
  const clearWallSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedWallIndex: null
    }));
  }, []);

  /**
   * Set hover room
   */
  const setHoverRoom = useCallback((roomId: string | null) => {
    setSelection(prev => ({
      ...prev,
      hoverRoomId: roomId
    }));
  }, []);

  /**
   * Set hover vertex
   */
  const setHoverVertex = useCallback((vertexIndex: number | null) => {
    setSelection(prev => ({
      ...prev,
      hoverVertexIndex: vertexIndex,
      hoverEdgeIndex: null
    }));
  }, []);

  /**
   * Set hover edge
   */
  const setHoverEdge = useCallback((edgeIndex: number | null) => {
    setSelection(prev => ({
      ...prev,
      hoverEdgeIndex: edgeIndex,
      hoverVertexIndex: null,
      hoverWallIndex: null
    }));
  }, []);

  /**
   * Set hover wall
   */
  const setHoverWall = useCallback((wallIndex: number | null) => {
    setSelection(prev => ({
      ...prev,
      hoverWallIndex: wallIndex,
      hoverVertexIndex: null,
      hoverEdgeIndex: null
    }));
  }, []);

  /**
   * Toggle room selection
   */
  const toggleRoomSelection = useCallback((roomId: string) => {
    setSelection(prev => {
      const isSelected = prev.selectedRoomIds.includes(roomId);
      return {
        ...prev,
        selectedRoomIds: isSelected
          ? prev.selectedRoomIds.filter(id => id !== roomId)
          : [...prev.selectedRoomIds, roomId]
      };
    });
  }, []);

  /**
   * Check if room is selected
   */
  const isRoomSelected = useCallback((roomId: string): boolean => {
    return selection.selectedRoomIds.includes(roomId);
  }, [selection]);

  /**
   * Get first selected room ID
   */
  const getFirstSelectedRoomId = useCallback((): string | null => {
    return selection.selectedRoomIds[0] || null;
  }, [selection]);

  return {
    selection,
    selectRoom,
    selectRooms,
    deselectRoom,
    clearSelection,
    selectVertex,
    selectEdge,
    selectWall,
    clearVertexSelection,
    clearEdgeSelection,
    clearWallSelection,
    setHoverRoom,
    setHoverVertex,
    setHoverEdge,
    setHoverWall,
    toggleRoomSelection,
    isRoomSelected,
    getFirstSelectedRoomId
  };
}
