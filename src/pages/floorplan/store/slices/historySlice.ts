/**
 * History Slice - Manages undo/redo functionality
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, HistorySlice, HistoryEntry } from '../types/store';
import type { Room } from '../../types';

const MAX_HISTORY_SIZE = 50;

export const createHistorySlice: StateCreator<
  FloorplanStore,
  [['zustand/immer', never]],
  [],
  HistorySlice
> = (set, get) => ({
  // ============================================
  // STATE
  // ============================================
  history: {
    past: [],
    present: {
      rooms: new Map<string, Room>(),
      description: 'Initial state',
      timestamp: Date.now(),
    },
    future: [],
  },

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Push current state to history
   */
  pushHistory: (description) => {
    set((state) => {
      // Create snapshot of current rooms
      const snapshot: HistoryEntry = {
        rooms: new Map(state.rooms),
        description,
        timestamp: Date.now(),
      };

      // Add current present to past
      state.history.past.push(state.history.present);

      // Limit history size
      if (state.history.past.length > MAX_HISTORY_SIZE) {
        state.history.past.shift();
      }

      // Update present
      state.history.present = snapshot;

      // Clear future (new action invalidates redo)
      state.history.future = [];
    });
  },

  /**
   * Undo last action
   */
  undo: () => {
    const { past, present, future } = get().history;

    if (past.length === 0) {
      // console.log('Nothing to undo');
      return;
    }

    set((state) => {
      // Move present to future
      state.history.future.unshift(present);

      // Restore last past state as present
      const previous = past[past.length - 1];
      state.history.past = past.slice(0, -1);
      state.history.present = previous;

      // Restore rooms from history
      state.rooms = new Map(previous.rooms);
    });

    // console.log(`↩️ Undo: ${get().history.present.description}`);
  },

  /**
   * Redo last undone action
   */
  redo: () => {
    const { future, present } = get().history;

    if (future.length === 0) {
      // console.log('Nothing to redo');
      return;
    }

    set((state) => {
      // Move present to past
      state.history.past.push(present);

      // Restore first future state as present
      const next = future[0];
      state.history.future = future.slice(1);
      state.history.present = next;

      // Restore rooms from history
      state.rooms = new Map(next.rooms);
    });

    // console.log(`↪️ Redo: ${get().history.present.description}`);
  },

  /**
   * Check if undo is available
   */
  canUndo: () => {
    return get().history.past.length > 0;
  },

  /**
   * Check if redo is available
   */
  canRedo: () => {
    return get().history.future.length > 0;
  },

  /**
   * Clear all history
   */
  clearHistory: () => {
    set((state) => {
      state.history = {
        past: [],
        present: {
          rooms: new Map(state.rooms),
          description: 'Reset history',
          timestamp: Date.now(),
        },
        future: [],
      };
    });
  },
});
