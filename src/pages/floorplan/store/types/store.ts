/**
 * Zustand Store Types for Floorplan Editor
 * Centralized state management replacing distributed hook-based state
 */

import type {
  Room,
  Vertex,
  Viewport,
  EditorMode,
  ToolMode,
  FloorplanConfig,
  Constraint,
  DrawingState,
  SelectionState,
  DragState,
  GeoReference,
  GuideLine
} from '../../types';

// ============================================================================
// STORE SLICES
// ============================================================================

/**
 * Rooms Slice - Manages all room entities
 */
export interface RoomsSlice {
  // State
  rooms: Map<string, Room>;

  // Actions
  createRoom: (room: Omit<Room, 'id'>) => string;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  deleteRooms: (ids: string[]) => void;
  duplicateRoom: (id: string) => string;
  mergeRooms: (roomIds: string[]) => Promise<void>;
  getRoomById: (id: string) => Room | undefined;
  getAllRooms: () => Room[];

  // Aperture actions
  updateAperture: (roomId: string, wallIndex: number, apertureId: string, updates: Partial<import('../../types').Aperture>) => void;
  moveAperture: (roomId: string, sourceWallIndex: number, targetWallIndex: number, apertureId: string, newDistance: number, newAnchor: 'start' | 'end') => void;
  moveApertureCrossRoom: (sourceRoomId: string, sourceWallIndex: number, targetRoomId: string, targetWallIndex: number, apertureId: string, newDistance: number, newAnchor: 'start' | 'end') => void;
  deleteAperture: (roomId: string, wallIndex: number, apertureId: string) => void;

  // Envelope recalculation
  recalculateAllEnvelopes: () => Promise<void>;
  isCalculatingEnvelopes: boolean;
}

/**
 * Selection Slice - Manages selection state
 */
export interface SelectionSlice {
  // State
  selection: SelectionState;

  // Actions
  selectRoom: (id: string, multi?: boolean) => void;
  deselectRoom: (id: string) => void;
  toggleRoomSelection: (id: string) => void;
  clearRoomSelection: () => void;
  selectAllRooms: () => void;
  selectVertex: (index: number) => void;
  selectEdge: (index: number) => void;
  selectAperture: (apertureId: string, wallIndex: number) => void;
  clearVertexSelection: () => void;
  clearEdgeSelection: () => void;
  clearWallSelection: () => void;
  clearApertureSelection: () => void;
  clearAllSelection: () => void;
  setHoverRoom: (id: string | null) => void;
  setHoverVertex: (index: number | null) => void;
  setHoverEdge: (index: number | null) => void;
  setHoverAperture: (apertureId: string | null, wallIndex: number | null) => void;

  // Computed
  getSelectedRoom: () => Room | undefined;
  getSelectedRooms: () => Room[];
}

/**
 * Viewport Slice - Manages pan/zoom state
 */
export interface ViewportSlice {
  // State
  viewport: Viewport;
  targetViewport: Viewport;
  isPanning: boolean;
  panVelocity: { x: number; y: number };

  // Actions
  setViewport: (viewport: Partial<Viewport>) => void;
  panViewport: (dx: number, dy: number) => void;  // Transient update
  zoomViewport: (delta: number, center?: Vertex) => void;
  resetViewport: () => void;
  fitToContent: () => void;
  centerOnRoom: (roomId: string) => void;

  // Animation
  startPanning: () => void;
  stopPanning: () => void;
}

/**
 * Drawing Slice - Manages drawing workflow state
 */
export interface DrawingSlice {
  // State
  drawing: DrawingState;
  drawingRoomId: string | null;

  // Actions
  startDrawing: () => void;
  addDrawingVertex: (vertex: Vertex) => void;
  updateLastDrawingVertex: (vertex: Vertex) => void;
  removeLastDrawingVertex: () => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  setSnapPosition: (pos: Vertex | null) => void;
  setCurrentMouseWorld: (pos: Vertex | null) => void;
  setActiveGuideLine: (guideLine: GuideLine | null) => void;
}

/**
 * History Slice - Manages undo/redo
 */
export interface HistorySlice {
  // State
  history: {
    past: HistoryEntry[];
    present: HistoryEntry;
    future: HistoryEntry[];
  };

  // Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (description: string) => void;
  clearHistory: () => void;
}

export interface HistoryEntry {
  rooms: Map<string, Room>;
  description: string;
  timestamp: number;
}

// ============================================================================
// MAIN STORE
// ============================================================================

/**
 * Complete Floorplan Store
 * Combines all slices + global state
 */
export interface FloorplanStore extends
  RoomsSlice,
  SelectionSlice,
  ViewportSlice,
  DrawingSlice,
  HistorySlice {

  // ============================================
  // GLOBAL STATE
  // ============================================

  // Editor mode
  editorMode: EditorMode;
  toolMode: ToolMode;

  // Configuration
  config: FloorplanConfig;

  // Geo-reference
  geoReference: GeoReference | null;

  // Keyboard state
  spacePressed: boolean;
  shiftPressed: boolean;
  ctrlPressed: boolean;

  // Clipboard
  clipboard: Room[];
  pasteOffset: number;
  apertureClipboard: {
    aperture: import('../../types').Aperture;
    sourceRoomId: string;
    sourceWallIndex: number;
  } | null;

  // Drag state
  dragState: DragState;

  // Async operations
  isSolving: boolean;

  // ============================================
  // GLOBAL ACTIONS
  // ============================================

  // Editor mode
  setEditorMode: (mode: EditorMode) => void;
  setToolMode: (mode: ToolMode) => void;

  // Configuration
  updateConfig: (updates: Partial<FloorplanConfig>) => void;
  resetConfig: () => void;

  // Geo-reference
  setGeoReference: (geoRef: GeoReference) => void;
  clearGeoReference: () => void;

  // Keyboard
  setSpacePressed: (pressed: boolean) => void;
  setShiftPressed: (pressed: boolean) => void;
  setCtrlPressed: (pressed: boolean) => void;

  // Clipboard
  copy: (roomIds: string[]) => void;
  cut: (roomIds: string[]) => void;
  paste: () => void;

  // Aperture clipboard
  copyAperture: (roomId: string, wallIndex: number, apertureId: string) => void;
  pasteAperture: (targetRoomId: string, targetWallIndex: number, targetDistance?: number, targetAnchor?: 'start' | 'end') => void;
  clearApertureClipboard: () => void;

  // Drag state
  setDragState: (state: Partial<DragState>) => void;
  clearDragState: () => void;

  // Solving
  setIsSolving: (solving: boolean) => void;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Utility type for deep partial updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
