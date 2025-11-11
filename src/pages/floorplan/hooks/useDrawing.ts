/**
 * useDrawing hook - manages drawing workflow for creating rooms
 * Implements the complete drawing workflow from documentation
 */

import { useState, useCallback } from 'react';
import { Vertex, DrawingState, GuideLine, GridConfig, Room } from '../types';
import { snapToGrid, snapOrthogonal, snapWithPriority } from '../utils/snapping';
import { distance, isSelfIntersecting, isCounterClockwise, centerVertices } from '../utils/geometry';
import { generateWalls } from '../utils/walls';
import { calculateCenterline } from '../utils/roomJoining';

const CLOSE_THRESHOLD = 10; // Distance to first vertex to close polygon (in cm)
const MIN_VERTICES = 3;

export function useDrawing(
  gridConfig: GridConfig,
  zoom: number,
  onRoomCreated: (room: Omit<Room, 'id'>) => void,
  existingRooms: Room[] = []
) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    vertices: [],
    currentMouseWorld: null,
    snapPosition: null,
    activeGuideLine: null
  });

  /**
   * Close polygon and create room
   */
  const closePolygon = useCallback(() => {
    if (drawingState.vertices.length < MIN_VERTICES) {
      console.warn('Need at least 3 vertices to create a room');
      return;
    }

    // Validate polygon
    if (isSelfIntersecting(drawingState.vertices)) {
      console.error('Cannot create room: polygon is self-intersecting');
      // TODO: Show error to user
      return;
    }

    // Ensure counter-clockwise winding
    let vertices = [...drawingState.vertices];
    if (!isCounterClockwise(vertices)) {
      vertices = vertices.reverse();
    }

    // Center vertices around (0,0) so rotation happens around centroid
    const { centeredVertices, centroid } = centerVertices(vertices);

    const wallThickness = 15; // Default 15cm

    // Generate walls from centered vertices
    const walls = generateWalls(centeredVertices, wallThickness);

    // Create temporary room object to calculate centerline
    const tempRoom = {
      vertices: centeredVertices,
      wallThickness,
      walls
    };

    // Calculate centerline vertices
    const centerlineVertices = calculateCenterline(tempRoom as Room);

    // Create room with centered vertices and centroid as position
    const newRoom: Omit<Room, 'id'> = {
      name: `Room ${Date.now()}`,
      vertices: centeredVertices,
      originalVertices: [...centeredVertices], // Store original vertices for merge reset
      centerlineVertices,
      walls,
      position: centroid, // Position is the centroid
      rotation: 0,
      scale: 1,
      wallThickness,
      constraints: [],
      color: '#c8dcff'
    };

    onRoomCreated(newRoom);

    // Reset drawing state
    setDrawingState({
      isDrawing: false,
      vertices: [],
      currentMouseWorld: null,
      snapPosition: null,
      activeGuideLine: null
    });
  }, [drawingState, onRoomCreated]);

  /**
   * Start drawing
   */
  const startDrawing = useCallback((worldPos: Vertex) => {
    // Try to snap to existing vertices/edges first, then grid
    const snapResult = snapWithPriority(
      worldPos,
      null, // No last vertex yet
      [],   // No vertices yet
      gridConfig.size,
      zoom,
      false, // No orthogonal snap for first vertex
      gridConfig.snapEnabled,
      existingRooms
    );

    const firstVertex = snapResult.position || worldPos;

    setDrawingState({
      isDrawing: true,
      vertices: [firstVertex],
      currentMouseWorld: worldPos,
      snapPosition: firstVertex,
      activeGuideLine: null
    });
  }, [gridConfig, zoom, existingRooms]);

  /**
   * Add vertex to drawing
   */
  const addVertex = useCallback((worldPos: Vertex) => {
    if (!drawingState.isDrawing || drawingState.vertices.length === 0) {
      return;
    }

    // Use the current snap position (already calculated in updateMousePosition)
    const snapPos = drawingState.snapPosition || worldPos;

    // Check if we should close the polygon (use snap position for accurate detection)
    if (drawingState.vertices.length >= MIN_VERTICES) {
      const firstVertex = drawingState.vertices[0];
      const dist = distance(snapPos, firstVertex);

      if (dist < CLOSE_THRESHOLD) {
        // Close polygon and create room
        closePolygon();
        return;
      }
    }

    // Add the snapped vertex
    setDrawingState(prev => ({
      ...prev,
      vertices: [...prev.vertices, snapPos]
    }));
  }, [drawingState, closePolygon]);

  /**
   * Update mouse position (for preview)
   */
  const updateMousePosition = useCallback((worldPos: Vertex) => {
    if (!drawingState.isDrawing || drawingState.vertices.length === 0) {
      return;
    }

    const lastVertex = drawingState.vertices[drawingState.vertices.length - 1];

    // Calculate snap position with priority
    const snapResult = snapWithPriority(
      worldPos,
      lastVertex,
      drawingState.vertices,
      gridConfig.size,
      zoom,
      gridConfig.orthogonalSnapEnabled ?? false, // orthogonalEnabled
      gridConfig.snapEnabled,
      existingRooms
    );

    setDrawingState(prev => ({
      ...prev,
      currentMouseWorld: worldPos,
      snapPosition: snapResult.position || worldPos,
      activeGuideLine: snapResult.guideLine || null
    }));
  }, [drawingState, gridConfig, zoom, existingRooms]);

  /**
   * Cancel drawing
   */
  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      vertices: [],
      currentMouseWorld: null,
      snapPosition: null,
      activeGuideLine: null
    });
  }, []);

  /**
   * Undo last vertex
   */
  const undoLastVertex = useCallback(() => {
    if (drawingState.vertices.length <= 1) {
      cancelDrawing();
      return;
    }

    setDrawingState(prev => ({
      ...prev,
      vertices: prev.vertices.slice(0, -1)
    }));
  }, [drawingState, cancelDrawing]);

  /**
   * Check if mouse is near first vertex (for close indicator)
   */
  const isNearFirstVertex = useCallback((worldPos: Vertex): boolean => {
    if (drawingState.vertices.length < MIN_VERTICES) {
      return false;
    }

    const firstVertex = drawingState.vertices[0];
    return distance(worldPos, firstVertex) < CLOSE_THRESHOLD;
  }, [drawingState]);

  return {
    drawingState,
    startDrawing,
    addVertex,
    updateMousePosition,
    closePolygon,
    cancelDrawing,
    undoLastVertex,
    isNearFirstVertex
  };
}
