/**
 * Core types for the floorplan editor
 * Clean React-first architecture - no ECS
 */

import type { Primitive } from '../../../lib/geometry/GradientDescentSolver';

// Re-export geo types
export type { GeoReference, InitialGeoReference } from './geo';

// ============================================================================
// GEOMETRY TYPES
// ============================================================================

export interface Vertex {
  id: string;
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
  Assembly = 'assembly', // Moving/rotating/joining rooms
  GeoRef = 'geoRef'    // Geo-referencing floorplan on map
}

export enum ToolMode {
  Select = 'select',
  DrawRoom = 'draw-room',
  Pan = 'pan'
}

// ============================================================================
// ROOM TYPES
// ============================================================================

export type WallType =
  | 'exterior'
  | 'interior_division'
  | 'interior_structural'
  | 'interior_partition'
  | 'terrain_contact'
  | 'adiabatic'
  | 'neighbor_same_block'
  | 'neighbor_other_block';

export interface Aperture {
  id: string;
  type: 'door' | 'window';
  anchorVertex: 'start' | 'end';
  distance: number;  // Distance from anchor vertex in meters
  width: number;     // Width in meters
  height: number;    // Height in meters
  sillHeight?: number; // Sill height for windows in meters
  // Material properties (defaults from config.apertureDefaults)
  cristal?: GlassType;
  color?: WindowColor;
  material?: WindowMaterial;
  persiana?: boolean;
  porcentajeMarco?: number; // Frame percentage (uses porcentajeMarcoVentana or porcentajeMarcoPuerta from defaults)
}

export interface WallSegment {
  id: string;  // UUID for stable reference
  startVertexId: string;  // ID referencing vertex in room.segmentVertices
  endVertexId: string;  // ID referencing vertex in room.segmentVertices
  wallType: WallType;  // Classification for this segment (exterior, interior, etc.)
}

export interface Wall {
  vertexIndex: number;  // Start vertex index (end is vertexIndex + 1)
  startVertexId?: string;  // Stable ID for start vertex (preferred over vertexIndex)
  endVertexId?: string;    // Stable ID for end vertex (preferred over vertexIndex)
  thickness: number;
  wallType?: WallType;  // Type of wall (affects thermal properties)
  height?: number;      // Wall height in meters (default 2.7m)
  apertures?: Aperture[]; // Doors and windows
  segments?: WallSegment[]; // Virtual subdivisions for wall type assignment (non-geometric)
  // Computed properties for rendering
  normal?: Vertex;      // Perpendicular vector pointing outward
  startCorner?: Vertex; // Intersection point at start (for mitered corners)
  endCorner?: Vertex;   // Intersection point at end (for mitered corners)
  roomEdgeIndex?: number; // Maps envelope wall to room edge (for wall type classification)
}

export interface Room {
  id: string;
  name: string;

  // Geometry (local coordinates)
  vertices: Vertex[];  // Inner floor boundary - SOURCE OF TRUTH with UUIDs
  originalVertices?: Vertex[];  // Original vertices before auto-insertion from merging (for reset on re-merge)
  assemblyVertices?: Vertex[];  // Vertices with collinear points inserted for envelope calculation (assembly only, not geometry)
  segmentVertices: Vertex[];  // Derived geometry: vertices + intersection points for segments - DRIVEN BY vertices
  centerlineVertices: Vertex[];  // Wall centerline (offset by half thickness) - PINK LINE
  innerBoundaryVertices?: Vertex[];  // Inner boundary of exterior walls (centerline + interior wall thickness) - YELLOW LINE
  walls: Wall[];  // Wall metadata for each edge - tied to vertices, never to envelope
  envelopeVertices?: Vertex[];  // Outer boundary from polygon merging (inflated) - UI ONLY
  debugMergedCenterline?: Vertex[];  // DEBUG: Merged centerline before inflation
  debugContractedEnvelope?: Vertex[];  // DEBUG: Envelope contracted back to room perimeter

  // Assembly transform (world coordinates)
  position: Vertex;
  rotation: number;
  scale: number;

  // Wall properties
  wallThickness: number;

  // Constraints
  constraints: Constraint[];
  primitives?: Primitive[];  // Optional - solver primitives (only used when constraints active)

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
  indices: number[];  // Vertex or edge indices involved (deprecated, use vertexIds)
  vertexIds?: string[];  // Vertex IDs involved (preferred over indices)
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
// FLOORPLAN CONFIG
// ============================================================================

// Aperture configuration types
export type GlassType = 'simple' | 'doble' | 'triple';
export type WindowColor = 'azul' | 'blanco' | 'verde';
export type WindowMaterial = 'madera' | 'pvc' | 'aluminio' | 'aluminio_puente_termico';

export interface ApertureDefaults {
  cristal: GlassType;
  color: WindowColor;
  material: WindowMaterial;
  persiana: boolean;
  porcentajeMarcoVentana: number; // Porcentaje del marco respecto al cristal (ventanas)
  porcentajeMarcoPuerta: number;  // Porcentaje del marco respecto al cristal (puertas)
}

export interface FloorplanConfig {
  // Grid settings
  enabled: boolean;
  size: number;        // Grid size in cm
  majorLines: number;  // Draw major line every N grid lines
  snapEnabled: boolean;
  orthogonalSnapEnabled?: boolean; // Enable/disable orthogonal snapping

  // Visibility settings
  showGuideLines?: boolean; // Show/hide guide lines
  showEnvelopeVertices?: boolean; // Show/hide envelope vertices
  showDebugLines?: boolean; // Show/hide debug lines (pink centerline, yellow inner boundary, green contracted)
  showDimensions?: boolean; // Show/hide wall dimensions

  // Wall thickness settings
  defaultInteriorWallThickness: number; // Default interior wall thickness in cm
  defaultExteriorWallThickness: number; // Default exterior wall thickness in cm

  // Aperture settings
  apertureDefaults?: ApertureDefaults; // Default aperture properties

  // Rendering settings
  miterLimit?: number; // Clipper miter limit (1.0-10.0), controls when beveling occurs

  // UI settings
  menuOpenByDefault?: boolean; // Show tools menu open on load
}

// Legacy type alias for backwards compatibility
export type GridConfig = FloorplanConfig;

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

export interface SegmentSelection {
  roomId: string;
  wallIndex: number;
  segmentIndex: number;
}

export interface SelectionState {
  selectedRoomIds: string[];
  selectedVertexIndex: number | null;
  selectedEdgeIndex: number | null;
  selectedWallIndex: number | null;
  selectedApertureId: string | null;
  selectedApertureWallIndex: number | null;
  selectedSegment: SegmentSelection | null;  // Selected wall segment
  hoverRoomId: string | null;
  hoverVertexIndex: number | null;
  hoverEdgeIndex: number | null;
  hoverWallIndex: number | null;
  hoverApertureId: string | null;
  hoverApertureWallIndex: number | null;
  hoverSegment: SegmentSelection | null;  // Hovered wall segment
  // Diagonal constraint mode
  diagonalConstraintMode: boolean;
  diagonalVertices: number[];
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
  dragType: 'vertex' | 'edge' | 'room' | 'rotation' | 'aperture' | null;
  startPoint: Vertex | null;
  originalVertices?: Vertex[];
  originalPosition?: Vertex;
  originalRotation?: number;
  originalScale?: number;
  // Aperture drag specific fields
  apertureId?: string;
  sourceWallIndex?: number;
  sourceRoomId?: string;
  originalApertureDistance?: number;
  originalApertureAnchor?: 'start' | 'end';
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
