/**
 * Floorplan Store - Central Zustand store for all floorplan state
 * Combines all slices with middleware for devtools and immer
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Immer MapSet plugin for Map/Set support
enableMapSet();

import type { FloorplanStore } from './types/store';
import type { EditorMode, ToolMode, FloorplanConfig, DragState } from '../types';
import type { GeoReference } from '../types/geo';

import { createRoomsSlice } from './slices/roomsSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createViewportSlice } from './slices/viewportSlice';
import { createDrawingSlice } from './slices/drawingSlice';
import { createHistorySlice } from './slices/historySlice';

// Default configuration
const DEFAULT_FLOORPLAN_CONFIG: FloorplanConfig = {
  // Grid settings
  enabled: true,
  size: 50, // 50cm grid
  majorLines: 5, // Major line every 250cm (2.5m)
  snapEnabled: false,
  orthogonalSnapEnabled: false,

  // Visibility settings
  showGuideLines: false,
  showEnvelopeVertices: true,
  showDebugLines: false, // Hide debug lines (pink, yellow, green) by default
  showDimensions: false, // Hide dimensions by default

  // Wall thickness settings
  defaultInteriorWallThickness: 15, // 15cm
  defaultExteriorWallThickness: 30, // 30cm

  // Aperture settings
  apertureDefaults: {
    cristal: 'doble',
    color: 'blanco',
    material: 'pvc',
    persiana: false,
    porcentajeMarcoVentana: 20,  // 20% marco para ventanas
    porcentajeMarcoPuerta: 100   // 100% marco para puertas
  },

  // Rendering settings
  miterLimit: 2.0, // Default miter limit

  // UI settings
  menuOpenByDefault: true, // Show tools menu open on load
};

/**
 * Main Zustand store for floorplan editor
 * Uses immer for easier immutable updates and devtools for debugging
 */
export const useFloorplanStore = create<FloorplanStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // ============================================
        // SLICES (combine all slice creators)
        // ============================================
        ...createRoomsSlice(set, get),
        ...createSelectionSlice(set, get),
        ...createViewportSlice(set, get),
        ...createDrawingSlice(set, get),
        ...createHistorySlice(set, get),

        // ============================================
        // GLOBAL STATE
        // ============================================

        // Editor mode
        editorMode: 'draw' as EditorMode,
        toolMode: 'draw-room' as ToolMode,

        // Configuration
        config: DEFAULT_FLOORPLAN_CONFIG,

        // Geo-reference
        geoReference: null,

        // Contracted envelopes (one per room group)
        contractedEnvelopes: [],

        // Keyboard state
        spacePressed: false,
        shiftPressed: false,
        ctrlPressed: false,

        // Clipboard
        clipboard: [],
        pasteOffset: 0,
        apertureClipboard: null,

        // Drag state
        dragState: {
          isDragging: false,
          dragType: null,
          startPoint: null,
        },

        // Async operations
        isSolving: false,

        // ============================================
        // GLOBAL ACTIONS
        // ============================================

        /**
         * Set editor mode
         */
        setEditorMode: (mode) => {
          set((state) => {
            state.editorMode = mode;
          });
        },

        /**
         * Set tool mode
         */
        setToolMode: (mode) => {
          set((state) => {
            state.toolMode = mode;
          });
        },

        /**
         * Update configuration
         */
        updateConfig: (updates) => {
          set((state) => {
            state.config = { ...state.config, ...updates };
          });
        },

        /**
         * Reset configuration to defaults
         */
        resetConfig: () => {
          set((state) => {
            state.config = DEFAULT_FLOORPLAN_CONFIG;
          });
        },

        /**
         * Set geo-reference
         */
        setGeoReference: (geoRef) => {
          set((state) => {
            state.geoReference = geoRef;
          });
        },

        /**
         * Clear geo-reference
         */
        clearGeoReference: () => {
          set((state) => {
            state.geoReference = null;
          });
        },

        /**
         * Set space key pressed state
         */
        setSpacePressed: (pressed) => {
          set((state) => {
            state.spacePressed = pressed;
          });
        },

        /**
         * Set shift key pressed state
         */
        setShiftPressed: (pressed) => {
          set((state) => {
            state.shiftPressed = pressed;
          });
        },

        /**
         * Set ctrl key pressed state
         */
        setCtrlPressed: (pressed) => {
          set((state) => {
            state.ctrlPressed = pressed;
          });
        },

        /**
         * Copy selected rooms to clipboard
         */
        copy: (roomIds) => {
          const rooms = roomIds
            .map((id) => get().rooms.get(id))
            .filter((r) => r !== undefined);

          set((state) => {
            state.clipboard = rooms;
            state.pasteOffset = 0;
          });

          console.log(`📋 Copied ${rooms.length} rooms to clipboard`);
        },

        /**
         * Cut selected rooms to clipboard
         */
        cut: (roomIds) => {
          get().copy(roomIds);
          get().deleteRooms(roomIds);
          console.log(`✂️ Cut ${roomIds.length} rooms`);
        },

        /**
         * Paste rooms from clipboard
         */
        paste: () => {
          const clipboard = get().clipboard;
          if (clipboard.length === 0) {
            console.log('Nothing to paste');
            return;
          }

          const offset = get().pasteOffset + 100; // Offset by 100px each time

          clipboard.forEach((room) => {
            get().createRoom({
              ...room,
              name: `${room.name} (copy)`,
              position: {
                x: room.position.x + offset,
                y: room.position.y + offset,
              },
            });
          });

          set((state) => {
            state.pasteOffset = offset;
          });

          console.log(`📌 Pasted ${clipboard.length} rooms`);
        },

        /**
         * Copy an aperture to the aperture clipboard
         */
        copyAperture: (roomId, wallIndex, apertureId) => {
          const room = get().rooms.get(roomId);
          if (!room) {
            console.warn(`Room ${roomId} not found`);
            return;
          }

          const wall = room.walls[wallIndex];
          if (!wall || !wall.apertures) {
            console.warn(`Wall ${wallIndex} not found or has no apertures`);
            return;
          }

          const aperture = wall.apertures.find(a => a.id === apertureId);
          if (!aperture) {
            console.warn(`Aperture ${apertureId} not found on wall ${wallIndex}`);
            return;
          }

          // Deep copy the aperture to clipboard
          set((state) => {
            state.apertureClipboard = {
              aperture: { ...aperture },
              sourceRoomId: roomId,
              sourceWallIndex: wallIndex,
            };
          });

          console.log(`📋 Copied aperture ${apertureId} to clipboard`);
        },

        /**
         * Paste an aperture from the aperture clipboard
         */
        pasteAperture: (targetRoomId, targetWallIndex, targetDistance, targetAnchor) => {
          const clipboard = get().apertureClipboard;
          if (!clipboard) {
            console.log('No aperture to paste');
            return;
          }

          const targetRoom = get().rooms.get(targetRoomId);
          if (!targetRoom) {
            console.warn(`Target room ${targetRoomId} not found`);
            return;
          }

          const targetWall = targetRoom.walls[targetWallIndex];
          if (!targetWall) {
            console.warn(`Target wall ${targetWallIndex} not found`);
            return;
          }

          // Create new aperture with new ID
          const newApertureId = `aperture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newAperture = {
            ...clipboard.aperture,
            id: newApertureId,
            distance: targetDistance ?? clipboard.aperture.distance,
            anchorVertex: targetAnchor ?? clipboard.aperture.anchorVertex,
          };

          // Add to target wall
          set((state) => {
            const room = state.rooms.get(targetRoomId);
            if (!room) return;

            const wall = room.walls[targetWallIndex];
            if (!wall) return;

            if (!wall.apertures) {
              wall.apertures = [];
            }

            wall.apertures.push(newAperture);
          });

          // Push to history
          get().pushHistory(`Pasted aperture`);

          console.log(`📌 Pasted aperture to room ${targetRoomId} wall ${targetWallIndex}`);
        },

        /**
         * Clear the aperture clipboard
         */
        clearApertureClipboard: () => {
          set((state) => {
            state.apertureClipboard = null;
          });

          console.log(`🗑️ Cleared aperture clipboard`);
        },

        /**
         * Set drag state
         */
        setDragState: (state) => {
          set((s) => {
            s.dragState = { ...s.dragState, ...state };
          });
        },

        /**
         * Clear drag state
         */
        clearDragState: () => {
          set((state) => {
            state.dragState = {
              isDragging: false,
              dragType: null,
              startPoint: null,
            };
          });
        },

        /**
         * Set solving state (for constraint solver)
         */
        setIsSolving: (solving) => {
          set((state) => {
            state.isSolving = solving;
          });
        },
      }))
    ),
    { name: 'FloorplanStore' } // Name for Redux DevTools
  )
);

// ============================================
// SELECTORS
// ============================================

/**
 * Memoized selectors for better performance
 * Components can use these to subscribe to specific slices of state
 */

export const selectRooms = (state: FloorplanStore) => state.rooms;
export const selectAllRooms = (state: FloorplanStore) => state.getAllRooms();
export const selectSelectedRoom = (state: FloorplanStore) => state.getSelectedRoom();
export const selectSelectedRooms = (state: FloorplanStore) => state.getSelectedRooms();
export const selectViewport = (state: FloorplanStore) => state.viewport;
export const selectConfig = (state: FloorplanStore) => state.config;
export const selectSelection = (state: FloorplanStore) => state.selection;
export const selectDrawing = (state: FloorplanStore) => state.drawing;
export const selectEditorMode = (state: FloorplanStore) => state.editorMode;
export const selectToolMode = (state: FloorplanStore) => state.toolMode;
