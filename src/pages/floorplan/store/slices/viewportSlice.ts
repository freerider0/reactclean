/**
 * Viewport Slice - Manages pan and zoom state
 * Simplified from useViewport hook - animation logic stays in components
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, ViewportSlice } from '../types/store';
import type { Vertex } from '../../types';

const DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1.0
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;

export const createViewportSlice: StateCreator<
  FloorplanStore,
  [['zustand/immer', never]],
  [],
  ViewportSlice
> = (set, get) => ({
  // ============================================
  // STATE
  // ============================================
  viewport: DEFAULT_VIEWPORT,
  targetViewport: DEFAULT_VIEWPORT,
  isPanning: false,
  panVelocity: { x: 0, y: 0 },

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Set viewport directly (for reset, fit to content, etc.)
   */
  setViewport: (updates) => {
    set((state) => {
      state.viewport = { ...state.viewport, ...updates };
      state.targetViewport = { ...state.targetViewport, ...updates };
    });
  },

  /**
   * Pan viewport by delta (transient update - no history)
   * This is a high-frequency operation during dragging
   */
  panViewport: (dx, dy) => {
    set((state) => {
      state.viewport.x += dx;
      state.viewport.y += dy;
      state.targetViewport.x += dx;
      state.targetViewport.y += dy;
    }, true); // true = replace state (transient update)
  },

  /**
   * Zoom viewport with optional center point
   */
  zoomViewport: (delta, center) => {
    set((state) => {
      const currentZoom = state.viewport.zoom;
      const zoomFactor = 1 + delta * 0.001;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));

      if (center) {
        // Zoom towards center point
        const zoomRatio = newZoom / currentZoom;
        const dx = (center.x - state.viewport.x) * (1 - zoomRatio);
        const dy = (center.y - state.viewport.y) * (1 - zoomRatio);

        state.viewport = {
          x: state.viewport.x + dx,
          y: state.viewport.y + dy,
          zoom: newZoom
        };
        state.targetViewport = { ...state.viewport };
      } else {
        // Simple zoom
        state.viewport.zoom = newZoom;
        state.targetViewport.zoom = newZoom;
      }
    });
  },

  /**
   * Reset viewport to default
   */
  resetViewport: () => {
    set((state) => {
      state.viewport = DEFAULT_VIEWPORT;
      state.targetViewport = DEFAULT_VIEWPORT;
      state.panVelocity = { x: 0, y: 0 };
    });
  },

  /**
   * Fit viewport to show all content
   */
  fitToContent: () => {
    const rooms = get().getAllRooms();
    if (rooms.length === 0) return;

    // Calculate bounding box of all rooms
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    rooms.forEach(room => {
      room.vertices.forEach(v => {
        const worldX = v.x + room.position.x;
        const worldY = v.y + room.position.y;
        minX = Math.min(minX, worldX);
        minY = Math.min(minY, worldY);
        maxX = Math.max(maxX, worldX);
        maxY = Math.max(maxY, worldY);
      });
    });

    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate zoom to fit
    const width = maxX - minX;
    const height = maxY - minY;
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const zoomX = canvasWidth / width;
    const zoomY = canvasHeight / height;
    const zoom = Math.min(zoomX, zoomY, MAX_ZOOM);

    // Center on content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    set((state) => {
      state.viewport = {
        x: canvasWidth / 2 - centerX * zoom,
        y: canvasHeight / 2 - centerY * zoom,
        zoom
      };
      state.targetViewport = { ...state.viewport };
    });
  },

  /**
   * Center viewport on a specific room
   */
  centerOnRoom: (roomId) => {
    const room = get().rooms.get(roomId);
    if (!room) return;

    // Calculate room center
    let sumX = 0, sumY = 0;
    room.vertices.forEach(v => {
      sumX += v.x;
      sumY += v.y;
    });

    const centerX = sumX / room.vertices.length + room.position.x;
    const centerY = sumY / room.vertices.length + room.position.y;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const currentZoom = get().viewport.zoom;

    set((state) => {
      state.viewport = {
        x: canvasWidth / 2 - centerX * currentZoom,
        y: canvasHeight / 2 - centerY * currentZoom,
        zoom: currentZoom
      };
      state.targetViewport = { ...state.viewport };
    });
  },

  /**
   * Start panning
   */
  startPanning: () => {
    set((state) => {
      state.isPanning = true;
      state.panVelocity = { x: 0, y: 0 };
    });
  },

  /**
   * Stop panning
   */
  stopPanning: () => {
    set((state) => {
      state.isPanning = false;
    });
  },
});
