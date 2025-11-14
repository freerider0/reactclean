/**
 * Drawing Slice - Manages drawing workflow state
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, DrawingSlice } from '../types/store';
import type { Vertex } from '../../types';
import { isSelfIntersecting, isCounterClockwise, centerVertices } from '../../utils/geometry';
import { generateWalls } from '../../utils/walls';
import { calculateCenterline } from '../../utils/roomJoining';
import { createVertex, migrateVerticesToIds } from '../../utils/vertexUtils';

export const createDrawingSlice: StateCreator<
  FloorplanStore,
  [['zustand/immer', never]],
  [],
  DrawingSlice
> = (set, get) => ({
  // ============================================
  // STATE
  // ============================================
  drawing: {
    isDrawing: false,
    vertices: [],
    currentMouseWorld: null,
    snapPosition: null,
    activeGuideLine: null,
  },
  drawingRoomId: null,

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Start drawing a new room
   */
  startDrawing: () => {
    set((state) => {
      state.drawing = {
        isDrawing: true,
        vertices: [],
        currentMouseWorld: null,
        snapPosition: null,
        activeGuideLine: null,
      };
      state.drawingRoomId = null;
    });
  },

  /**
   * Add a vertex to the current drawing
   */
  addDrawingVertex: (vertex) => {
    set((state) => {
      if (!state.drawing.isDrawing) return;
      state.drawing.vertices.push(vertex);
    });
  },

  /**
   * Update the last drawing vertex (for preview)
   */
  updateLastDrawingVertex: (vertex) => {
    set((state) => {
      if (!state.drawing.isDrawing || state.drawing.vertices.length === 0) return;
      state.drawing.vertices[state.drawing.vertices.length - 1] = vertex;
    });
  },

  /**
   * Remove the last drawing vertex (undo last point)
   */
  removeLastDrawingVertex: () => {
    set((state) => {
      if (!state.drawing.isDrawing || state.drawing.vertices.length === 0) return;
      state.drawing.vertices.pop();
    });
  },

  /**
   * Finish drawing and create the room
   */
  finishDrawing: () => {
    // console.log('🏁 finishDrawing called!');
    const vertices = get().drawing.vertices;
    // console.log('📊 Vertices to process:', vertices.length, vertices);

    if (vertices.length < 3) {
      console.warn('❌ Cannot finish drawing: need at least 3 vertices');
      get().cancelDrawing();
      return;
    }

    // Validate polygon
    if (isSelfIntersecting(vertices)) {
      console.error('❌ Cannot create room: polygon is self-intersecting');
      // TODO: Show error to user
      return;
    }

    // console.log('✅ Polygon validation passed, creating room...');

    // Ensure all vertices have IDs (safety net for backwards compatibility)
    // Note: As of UUID upgrade, vertices should already have IDs from drawing phase
    const verticesWithIds = migrateVerticesToIds(vertices);

    // Ensure counter-clockwise winding
    let processedVertices = [...verticesWithIds];
    if (!isCounterClockwise(processedVertices)) {
      processedVertices = processedVertices.reverse();
    }

    // Center vertices around (0,0) so rotation happens around centroid
    const { centeredVertices, centroid } = centerVertices(processedVertices);

    const wallThickness = get().config.defaultInteriorWallThickness;

    // Generate walls from centered vertices
    const walls = generateWalls(centeredVertices, wallThickness);

    // Create temporary room object to calculate centerline
    const tempRoom = {
      vertices: centeredVertices,
      wallThickness,
      walls
    };

    // Calculate centerline vertices
    const centerlineVertices = calculateCenterline(tempRoom as any).vertices;

    // Create the room with centered vertices and centroid as position
    const roomId = get().createRoom({
      name: `Room ${get().rooms.size + 1}`,
      vertices: centeredVertices,
      originalVertices: [...centeredVertices], // Store original vertices for merge reset
      segmentVertices: [...centeredVertices], // Initialize with same vertices (will be populated with intersections after envelope calc)
      centerlineVertices,
      walls,
      position: centroid, // Position is the centroid
      rotation: 0,
      scale: 1,
      wallThickness,
      constraints: [],
      color: '#c8dcff',
    });

    // console.log('🆕 New room created:', roomId);

    // Recalculate envelope for the new room
    const recalcEnvelopes = get().recalculateAllEnvelopes;
    if (recalcEnvelopes) {
      // console.log('🔄 Recalculating envelopes for new room...');
      recalcEnvelopes();
    }

    // Enter edit mode for the new room
    get().setEditorMode('edit');
    get().selectRoom(roomId);

    // Clear drawing state
    set((state) => {
      state.drawing = {
        isDrawing: false,
        vertices: [],
        currentMouseWorld: null,
        snapPosition: null,
        activeGuideLine: null,
      };
      state.drawingRoomId = null;
    });

    // console.log('✅ Entered edit mode for room:', roomId);
  },

  /**
   * Cancel drawing
   */
  cancelDrawing: () => {
    set((state) => {
      state.drawing = {
        isDrawing: false,
        vertices: [],
        currentMouseWorld: null,
        snapPosition: null,
        activeGuideLine: null,
      };
      state.drawingRoomId = null;
    });
  },

  /**
   * Set snap position for current mouse
   */
  setSnapPosition: (pos) => {
    set((state) => {
      state.drawing.snapPosition = pos;
    });
  },

  /**
   * Set current mouse world position
   */
  setCurrentMouseWorld: (pos) => {
    set((state) => {
      state.drawing.currentMouseWorld = pos;
    });
  },

  /**
   * Set active guide line
   */
  setActiveGuideLine: (guideLine) => {
    set((state) => {
      state.drawing.activeGuideLine = guideLine;
    });
  },
});
