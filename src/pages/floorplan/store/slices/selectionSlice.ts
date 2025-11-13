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
    selectedSegment: null,
    hoverRoomId: null,
    hoverVertexIndex: null,
    hoverEdgeIndex: null,
    hoverWallIndex: null,
    hoverApertureId: null,
    hoverApertureWallIndex: null,
    hoverSegment: null,
    diagonalConstraintMode: false,
    diagonalVertices: [],
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
        selectedSegment: null,
        hoverRoomId: state.selection.hoverRoomId,
        hoverVertexIndex: state.selection.hoverVertexIndex,
        hoverEdgeIndex: state.selection.hoverEdgeIndex,
        hoverWallIndex: state.selection.hoverWallIndex,
        hoverApertureId: state.selection.hoverApertureId,
        hoverApertureWallIndex: state.selection.hoverApertureWallIndex,
        hoverSegment: state.selection.hoverSegment,
        diagonalConstraintMode: false,
        diagonalVertices: [],
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

  /**
   * Start diagonal constraint mode
   * Clears other selections and prepares for vertex selection
   */
  startDiagonalConstraintMode: () => {
    set((state) => {
      state.selection.diagonalConstraintMode = true;
      state.selection.diagonalVertices = [];
      // Clear other selections
      state.selection.selectedVertexIndex = null;
      state.selection.selectedEdgeIndex = null;
      state.selection.selectedWallIndex = null;
      state.selection.selectedApertureId = null;
      state.selection.selectedApertureWallIndex = null;
    });
  },

  /**
   * Select a wall segment
   */
  selectSegment: (roomId: string, wallIndex: number, segmentIndex: number) => {
    set((state) => {
      state.selection.selectedSegment = { roomId, wallIndex, segmentIndex };
      // Clear other selections when selecting a segment
      state.selection.selectedVertexIndex = null;
      state.selection.selectedEdgeIndex = null;
      state.selection.selectedWallIndex = null;
      state.selection.selectedApertureId = null;
      state.selection.selectedApertureWallIndex = null;
    });
  },

  /**
   * Clear segment selection
   */
  clearSegmentSelection: () => {
    set((state) => {
      state.selection.selectedSegment = null;
    });
  },

  /**
   * Set hover segment
   */
  setHoverSegment: (selection: { roomId: string; wallIndex: number; segmentIndex: number } | null) => {
    set((state) => {
      state.selection.hoverSegment = selection;
    });
  },

  /**
   * Add a vertex to diagonal constraint selection
   * Automatically creates constraint when 2 vertices are selected
   */
  addDiagonalVertex: (index) => {
    set((state) => {
      // Only add if not already in the array
      if (!state.selection.diagonalVertices.includes(index)) {
        state.selection.diagonalVertices.push(index);
      }
    });
  },

  /**
   * Clear diagonal constraint mode
   * Exits diagonal constraint mode and clears selected vertices
   */
  clearDiagonalConstraintMode: () => {
    set((state) => {
      state.selection.diagonalConstraintMode = false;
      state.selection.diagonalVertices = [];
    });
  },
});
