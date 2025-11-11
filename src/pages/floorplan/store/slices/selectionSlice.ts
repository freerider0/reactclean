/**
 * Selection Slice - Manages selection state for rooms, vertices, edges
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, SelectionSlice } from '../types/store';
import type { Room } from '../../types';

export const createSelectionSlice: StateCreator<
  FloorplanStore,
  [['zustand/immer', never]],
  [],
  SelectionSlice
> = (set, get) => ({
  // ============================================
  // STATE
  // ============================================
  selection: {
    selectedRoomIds: [],
    selectedVertexIndex: null,
    selectedEdgeIndex: null,
    selectedWallIndex: null,
    selectedApertureId: null,
    selectedApertureWallIndex: null,
    hoverRoomId: null,
    hoverVertexIndex: null,
    hoverEdgeIndex: null,
    hoverWallIndex: null,
    hoverApertureId: null,
    hoverApertureWallIndex: null,
  },

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Select a room (with optional multi-selection)
   */
  selectRoom: (id, multi = false) => {
    set((state) => {
      if (multi) {
        // Toggle selection in multi-select mode
        if (state.selection.selectedRoomIds.includes(id)) {
          state.selection.selectedRoomIds = state.selection.selectedRoomIds.filter(rid => rid !== id);
        } else {
          state.selection.selectedRoomIds.push(id);
        }
      } else {
        // Single selection
        state.selection.selectedRoomIds = [id];
      }

      // Clear vertex/edge/aperture selection when selecting rooms
      state.selection.selectedVertexIndex = null;
      state.selection.selectedEdgeIndex = null;
      state.selection.selectedWallIndex = null;
      state.selection.selectedApertureId = null;
      state.selection.selectedApertureWallIndex = null;
    });
  },

  /**
   * Deselect a specific room
   */
  deselectRoom: (id) => {
    set((state) => {
      state.selection.selectedRoomIds = state.selection.selectedRoomIds.filter(rid => rid !== id);
    });
  },

  /**
   * Toggle room selection
   */
  toggleRoomSelection: (id) => {
    set((state) => {
      if (state.selection.selectedRoomIds.includes(id)) {
        state.selection.selectedRoomIds = state.selection.selectedRoomIds.filter(rid => rid !== id);
      } else {
        state.selection.selectedRoomIds.push(id);
      }
    });
  },

  /**
   * Clear room selection
   */
  clearRoomSelection: () => {
    set((state) => {
      state.selection.selectedRoomIds = [];
    });
  },

  /**
   * Select all rooms
   */
  selectAllRooms: () => {
    const allRoomIds = Array.from(get().rooms.keys());
    set((state) => {
      state.selection.selectedRoomIds = allRoomIds;
    });
  },

  /**
   * Select a vertex
   */
  selectVertex: (index) => {
    set((state) => {
      state.selection.selectedVertexIndex = index;
      state.selection.selectedEdgeIndex = null;
      state.selection.selectedWallIndex = null;
      state.selection.selectedApertureId = null;
      state.selection.selectedApertureWallIndex = null;
    });
  },

  /**
   * Select an edge
   */
  selectEdge: (index) => {
    set((state) => {
      state.selection.selectedEdgeIndex = index;
      state.selection.selectedWallIndex = index; // Wall index same as edge index
      state.selection.selectedVertexIndex = null;
      state.selection.selectedApertureId = null;
      state.selection.selectedApertureWallIndex = null;
    });
  },

  /**
   * Select an aperture (door or window)
   */
  selectAperture: (apertureId, wallIndex) => {
    set((state) => {
      state.selection.selectedApertureId = apertureId;
      state.selection.selectedApertureWallIndex = wallIndex;
      state.selection.selectedVertexIndex = null;
      state.selection.selectedEdgeIndex = null;
      state.selection.selectedWallIndex = null;
    });
  },

  /**
   * Clear vertex selection
   */
  clearVertexSelection: () => {
    set((state) => {
      state.selection.selectedVertexIndex = null;
    });
  },

  /**
   * Clear edge selection
   */
  clearEdgeSelection: () => {
    set((state) => {
      state.selection.selectedEdgeIndex = null;
    });
  },

  /**
   * Clear wall selection
   */
  clearWallSelection: () => {
    set((state) => {
      state.selection.selectedWallIndex = null;
      state.selection.selectedEdgeIndex = null;
    });
  },

  /**
   * Clear aperture selection
   */
  clearApertureSelection: () => {
    set((state) => {
      state.selection.selectedApertureId = null;
      state.selection.selectedApertureWallIndex = null;
    });
  },

  /**
   * Clear all selection
   */
  clearAllSelection: () => {
    set((state) => {
      state.selection = {
        selectedRoomIds: [],
        selectedVertexIndex: null,
        selectedEdgeIndex: null,
        selectedWallIndex: null,
        selectedApertureId: null,
        selectedApertureWallIndex: null,
        hoverRoomId: state.selection.hoverRoomId,
        hoverVertexIndex: state.selection.hoverVertexIndex,
        hoverEdgeIndex: state.selection.hoverEdgeIndex,
        hoverWallIndex: state.selection.hoverWallIndex,
        hoverApertureId: state.selection.hoverApertureId,
        hoverApertureWallIndex: state.selection.hoverApertureWallIndex,
      };
    });
  },

  /**
   * Set hover room
   */
  setHoverRoom: (id) => {
    set((state) => {
      state.selection.hoverRoomId = id;
    });
  },

  /**
   * Set hover vertex
   */
  setHoverVertex: (index) => {
    set((state) => {
      state.selection.hoverVertexIndex = index;
    });
  },

  /**
   * Set hover edge
   */
  setHoverEdge: (index) => {
    set((state) => {
      state.selection.hoverEdgeIndex = index;
      state.selection.hoverWallIndex = index;
    });
  },

  /**
   * Set hover wall (same as setHoverEdge)
   */
  setHoverWall: (index) => {
    set((state) => {
      state.selection.hoverEdgeIndex = index;
      state.selection.hoverWallIndex = index;
    });
  },

  /**
   * Set hover aperture
   */
  setHoverAperture: (apertureId, wallIndex) => {
    set((state) => {
      state.selection.hoverApertureId = apertureId;
      state.selection.hoverApertureWallIndex = wallIndex;
    });
  },

  /**
   * Select multiple rooms (replaces current selection)
   */
  selectRooms: (ids) => {
    set((state) => {
      state.selection.selectedRoomIds = ids;
      // Clear vertex/edge selection when selecting rooms
      state.selection.selectedVertexIndex = null;
      state.selection.selectedEdgeIndex = null;
      state.selection.selectedWallIndex = null;
    });
  },

  /**
   * Get the first selected room (or undefined)
   */
  getSelectedRoom: () => {
    const selectedIds = get().selection.selectedRoomIds;
    if (selectedIds.length === 0) return undefined;
    return get().rooms.get(selectedIds[0]);
  },

  /**
   * Get the first selected room ID (or null)
   */
  getFirstSelectedRoomId: () => {
    const selectedIds = get().selection.selectedRoomIds;
    return selectedIds.length > 0 ? selectedIds[0] : null;
  },

  /**
   * Get all selected rooms
   */
  getSelectedRooms: () => {
    const selectedIds = get().selection.selectedRoomIds;
    return selectedIds
      .map(id => get().rooms.get(id))
      .filter(room => room !== undefined) as Room[];
  },
});
