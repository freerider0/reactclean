/**
 * Levels Slice - Manages building levels/floors
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, LevelsSlice } from '../types/store';
import type { Level, Room } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Create default Ground Floor level (Planta Baja)
export const DEFAULT_LEVEL_ID = 'default-ground-floor';
const DEFAULT_LEVEL: Level = {
  id: DEFAULT_LEVEL_ID,
  name: 'Planta Baja',
  elevation: 0,
  order: 0
};

export const createLevelsSlice: StateCreator<
  FloorplanStore,
  [['zustand/immer', never]],
  [],
  LevelsSlice
> = (set, get) => ({
  // ============================================
  // STATE
  // ============================================
  levels: new Map<string, Level>([[DEFAULT_LEVEL_ID, DEFAULT_LEVEL]]),
  activeLevel: DEFAULT_LEVEL_ID,

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Create a new level
   * @param level - Level data (without id)
   * @returns Generated level ID
   */
  createLevel: (level) => {
    const id = uuidv4();
    const newLevel: Level = {
      ...level,
      id
    };

    set((state) => {
      state.levels.set(id, newLevel);

      // If this is the first level, make it active
      if (state.activeLevel === null) {
        state.activeLevel = id;
      }
    });

    return id;
  },

  /**
   * Update an existing level
   * @param id - Level ID
   * @param updates - Partial level updates
   */
  updateLevel: (id, updates) => {
    set((state) => {
      const level = state.levels.get(id);
      if (level) {
        state.levels.set(id, { ...level, ...updates });
      }
    });
  },

  /**
   * Delete a level
   * Note: Will not delete if it has rooms assigned to it
   * @param id - Level ID
   */
  deleteLevel: (id) => {
    set((state) => {
      // Check if any rooms belong to this level
      const hasRooms = Array.from(state.rooms.values()).some(room => room.levelId === id);

      if (hasRooms) {
        console.warn(`Cannot delete level ${id}: it still has rooms assigned to it`);
        return;
      }

      state.levels.delete(id);

      // If active level was deleted, switch to first available level
      if (state.activeLevel === id) {
        const remainingLevels = Array.from(state.levels.values()).sort((a, b) => a.order - b.order);
        state.activeLevel = remainingLevels.length > 0 ? remainingLevels[0].id : null;
      }
    });
  },

  /**
   * Set the active level
   * @param id - Level ID to activate
   */
  setActiveLevel: (id) => {
    set((state) => {
      if (state.levels.has(id)) {
        state.activeLevel = id;

        // Clear selections when switching levels to prevent ghost vertices from previous level
        state.selection.selectedRoomIds = [];
        state.selection.selectedVertexIndex = null;
        state.selection.selectedEdgeIndex = null;
        state.selection.selectedWallIndex = null;
        state.selection.selectedApertureId = null;
        state.selection.selectedApertureWallIndex = null;
        state.selection.selectedSegment = null;
        state.selection.diagonalConstraintMode = false;
        state.selection.diagonalVertices = [];
      }
    });
  },

  /**
   * Get all rooms for a specific level
   * @param levelId - Level ID
   * @returns Array of rooms on that level
   */
  getRoomsByLevel: (levelId) => {
    const state = get();
    return Array.from(state.rooms.values()).filter(room => room.levelId === levelId);
  },

  /**
   * Get rooms from the level below the active level
   * Used for underlevel visualization
   * @returns Array of rooms on the level below, or empty array if none
   */
  getUnderlevelRooms: () => {
    const state = get();

    if (!state.activeLevel) return [];

    const activeLevel = state.levels.get(state.activeLevel);
    if (!activeLevel) return [];

    // Find level with order = activeLevel.order - 1
    const underlevel = Array.from(state.levels.values()).find(
      level => level.order === activeLevel.order - 1
    );

    if (!underlevel) return [];

    return Array.from(state.rooms.values()).filter(room => room.levelId === underlevel.id);
  }
});
