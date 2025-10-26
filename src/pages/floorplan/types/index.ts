/**
 * Core types for the floorplan editor
 * Clean React-first architecture - no ECS
 */

// ============================================================================
// GEOMETRY TYPES
// ============================================================================

export interface Vertex {
  x: number;
  y: number;
}

export type Point = Vertex;

// ============================================================================
// VIEWPORT TYPES
// ============================================================================

export interface Viewport {
  x: number;      // Pan offset X
  y: number;      // Pan offset Y
  zoom: number;   // Zoom level (1.0 = 100%)
}

// ============================================================================
// EDITOR MODES
// ============================================================================

export enum EditorMode {
  Draw = 'draw',       // Drawing new rooms
  Edit = 'edit',       // Editing room geometry (vertices, constraints)
  Assembly = 'assembly' // Moving/rotating/joining rooms
}

export enum ToolMode {
  Select = 'select',
  DrawRoom = 'draw-room',
  Pan = 'pan'
}

// ============================================================================
// ROOM TYPES
// ============================================================================

export interface Wall {
  vertexIndex: number;  // Start vertex index (end is vertexIndex + 1)
  thickness: number;
  // Computed properties for rendering
  normal?: Vertex;      // Perpendicular vector pointing outward
  startCorner?: Vertex; // Intersection point at start (for mitered corners)
  endCorner?: Vertex;   // Intersection point at end (for mitered corners)
}

export interface Room {
  id: string;
  name: string;

  // Geometry (local coordinates)
  vertices: Vertex[];
  walls: Wall[];

  // Assembly transform (world coordinates)
  position: Vertex;
  rotation: number;
  scale: number;

  // Wall properties
  wallThickness: number;

  // Constraints
  constraints: Constraint[];

  // Visual properties
  color?: string;
  selected?: boolean;
}

// ============================================================================
// CONSTRAINT TYPES
// ============================================================================

export enum ConstraintType {
  Distance = 'distance',
  Angle = 'angle',
  Parallel = 'parallel',
  Perpendicular = 'perpendicular',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Equal = 'equal'
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  indices: number[];  // Vertex or edge indices involved
  value?: number;      // Target value (distance in cm, angle in radians)
  enabled: boolean;
}

// ============================================================================
// SNAPPING TYPES
// ============================================================================

export enum SnapType {
  Grid = 'grid',
  Orthogonal = 'orthogonal',
  Vertex = 'vertex',
  Edge = 'edge',
  RoomAssembly = 'room-assembly'
}

export interface SnapResult {
  snapped: boolean;
  position: Vertex | null;
  snapType?: SnapType;
  guideLine?: GuideLine;
}

export interface GuideLine {
  start: Vertex;
  end: Vertex;
  type: 'horizontal' | 'vertical' | 'orthogonal';
}

// ============================================================================
// GRID CONFIG
// ============================================================================

export interface GridConfig {
  enabled: boolean;
  size: number;        // Grid size in cm
  majorLines: number;  // Draw major line every N grid lines
  snapEnabled: boolean;
}

// ============================================================================
// DRAWING STATE
// ============================================================================

export interface DrawingState {
  isDrawing: boolean;
  vertices: Vertex[];
  currentMouseWorld: Vertex | null;
  snapPosition: Vertex | null;
  activeGuideLine: GuideLine | null;
}

// ============================================================================
// SELECTION STATE
// ============================================================================

export interface SelectionState {
  selectedRoomIds: string[];
  selectedVertexIndex: number | null;
  selectedEdgeIndex: number | null;
  hoverRoomId: string | null;
  hoverVertexIndex: number | null;
  hoverEdgeIndex: number | null;
}

export interface SelectionRectangleState {
  isSelecting: boolean;
  startPoint: Vertex | null;
  currentPoint: Vertex | null;
}

// ============================================================================
// DRAG STATE
// ============================================================================

export interface DragState {
  isDragging: boolean;
  dragType: 'vertex' | 'edge' | 'room' | 'rotation' | null;
  startPoint: Vertex | null;
  originalVertices?: Vertex[];
  originalPosition?: Vertex;
  originalRotation?: number;
  originalScale?: number;
}

// ============================================================================
// DIMENSION EDITING
// ============================================================================

export interface DimensionEdit {
  edgeIndex: number;
  value: string;
  position: Vertex;
}

// ============================================================================
// RENDER SETTINGS
// ============================================================================

export interface RenderSettings {
  showGrid: boolean;
  showDimensions: boolean;
  showConstraints: boolean;
  showGuides: boolean;
  showHandles: boolean;
}

// ============================================================================
// HIT TEST RESULT
// ============================================================================

export interface HitTestResult {
  roomId?: string;
  vertexIndex?: number;
  edgeIndex?: number;
  distance: number;
}
