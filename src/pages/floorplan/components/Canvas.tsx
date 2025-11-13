/**
 * Canvas component - main canvas for floorplan editor
 * Handles rendering and user interactions
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { EditorMode, ToolMode, Vertex, SelectionRectangleState, Room, ConstraintType } from '../types';
import { screenToWorld, worldToScreen, localToWorld, worldToLocal } from '../utils/coordinates';
import {
  clearCanvas,
  drawGrid,
  drawRoom,
  drawWalls,
  drawEnvelope,
  drawExternalWalls,
  drawApertures,
  drawApertureGhost,
  drawDrawingPreview,
  drawGuideLine,
  drawVertexHandles,
  drawEdgeHandles,
  drawRotationHandle,
  drawDimensionLabels,
  drawRoomSnapIndicators,
  drawConstraintIndicators,
  drawCenterlineVertexNumbers,
  drawContractedEnvelopeVertexNumbers
} from '../utils/rendering';
import {
  hitTestRoomVertices,
  hitTestRoomEdges,
  hitTestRoomWalls,
  hitTestExternalWalls,
  hitTestRoom,
  findBestHit,
  hitTestRotationHandle,
  hitTestApertures
} from '../utils/hitTesting';
import { polygonIntersectsRectangle, pointInPolygon, distance } from '../utils/geometry';
import { snapWithPriority } from '../utils/snapping';
import { createVertex } from '../utils/vertexUtils';
import { useFloorplanStore, selectAllRooms } from '../store/floorplanStore';
import { useEditableDimensions } from '../hooks/useEditableDimensions';
import { createDistanceConstraint } from '../utils/constraints';
import { DimensionInput } from './ui/DimensionInput';
import {
  EditDragState,
  calculateVertexDrag,
  calculateEdgeDrag,
  calculateWallDrag,
  calculateAddVertexToEdge,
  calculateDeleteVertex,
  createVertexDragState,
  createEdgeDragState,
  createWallDragState,
  createApertureDragState,
  calculateApertureDrag,
  isDragThresholdExceeded as isEditDragThresholdExceeded,
  DRAG_THRESHOLD as EDIT_DRAG_THRESHOLD
} from '../utils/editing';
import {
  validateAperturePosition,
  calculateWallLength
} from '../utils/aperturePositioning';
import {
  AssemblyDragState,
  calculateRoomDragPosition,
  calculateFinalRoomSnap,
  calculateRoomRotation,
  createRoomDragState,
  createRotationDragState,
  isDragThresholdExceeded as isAssemblyDragThresholdExceeded,
  DRAG_THRESHOLD as ASSEMBLY_DRAG_THRESHOLD
} from '../utils/assembly';
import { RoomSnapResult } from '../utils/roomJoining';
import { GuideLine } from '../types';

const CLOSE_THRESHOLD = 20; // Distance to first vertex to close polygon (in cm)
const MIN_VERTICES = 3;

interface CanvasProps {
  showDimensions?: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({ showDimensions = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Get state from Zustand store - subscribe to rooms Map, convert to array with useMemo
  const roomsMap = useFloorplanStore(state => state.rooms);
  const rooms = useMemo(() => Array.from(roomsMap.values()), [roomsMap]);
  const editorMode = useFloorplanStore(state => state.editorMode);
  const toolMode = useFloorplanStore(state => state.toolMode);
  const config = useFloorplanStore(state => state.config);
  const spacePressed = useFloorplanStore(state => state.spacePressed);
  const viewport = useFloorplanStore(state => state.viewport);
  const drawing = useFloorplanStore(state => state.drawing);
  const selection = useFloorplanStore(state => state.selection);
  const isPanning = useFloorplanStore(state => state.isPanning);

  // Get actions from store
  const updateRoom = useFloorplanStore(state => state.updateRoom);
  const getRoomById = useFloorplanStore(state => state.getRoomById);
  const getSelectedRoom = useFloorplanStore(state => state.getSelectedRoom);
  const setEditorMode = useFloorplanStore(state => state.setEditorMode);
  const recalculateAllEnvelopes = useFloorplanStore(state => state.recalculateAllEnvelopes);
  const addConstraint = useFloorplanStore(state => state.addConstraint);
  const selectRoom = useFloorplanStore(state => state.selectRoom);
  const selectVertex = useFloorplanStore(state => state.selectVertex);
  const selectEdge = useFloorplanStore(state => state.selectEdge);
  const selectAperture = useFloorplanStore(state => state.selectAperture);
  const moveAperture = useFloorplanStore(state => state.moveAperture);
  const moveApertureCrossRoom = useFloorplanStore(state => state.moveApertureCrossRoom);
  const copyAperture = useFloorplanStore(state => state.copyAperture);
  const pasteAperture = useFloorplanStore(state => state.pasteAperture);
  const apertureClipboard = useFloorplanStore(state => state.apertureClipboard);
  const clearAllSelection = useFloorplanStore(state => state.clearAllSelection);
  // Diagonal constraint mode
  const addDiagonalVertex = useFloorplanStore(state => state.addDiagonalVertex);
  const clearDiagonalConstraintMode = useFloorplanStore(state => state.clearDiagonalConstraintMode);
  const setHoverRoom = useFloorplanStore(state => state.setHoverRoom);
  const setHoverVertex = useFloorplanStore(state => state.setHoverVertex);
  const setHoverEdge = useFloorplanStore(state => state.setHoverEdge);
  const setHoverWall = useFloorplanStore(state => state.setHoverWall);
  const clearVertexSelection = useFloorplanStore(state => state.clearVertexSelection);
  const clearEdgeSelection = useFloorplanStore(state => state.clearEdgeSelection);
  const clearWallSelection = useFloorplanStore(state => state.clearWallSelection);
  const selectRooms = useFloorplanStore(state => state.selectRooms);
  const getFirstSelectedRoomId = useFloorplanStore(state => state.getFirstSelectedRoomId);
  const panViewport = useFloorplanStore(state => state.panViewport);
  const zoomViewport = useFloorplanStore(state => state.zoomViewport);
  const startPanning = useFloorplanStore(state => state.startPanning);
  const stopPanning = useFloorplanStore(state => state.stopPanning);
  const startDrawing = useFloorplanStore(state => state.startDrawing);
  const addDrawingVertex = useFloorplanStore(state => state.addDrawingVertex);
  const setCurrentMouseWorld = useFloorplanStore(state => state.setCurrentMouseWorld);
  const finishDrawing = useFloorplanStore(state => state.finishDrawing);
  const setSnapPosition = useFloorplanStore(state => state.setSnapPosition);
  const setActiveGuideLine = useFloorplanStore(state => state.setActiveGuideLine);

  // Track pan state for mouse move handling
  const [panStartPoint, setPanStartPoint] = useState<Vertex | null>(null);

  // Selection rectangle state
  const [selectionRectangle, setSelectionRectangle] = useState<SelectionRectangleState>({
    isSelecting: false,
    startPoint: null,
    currentPoint: null
  });

  // Visual feedback state for copy/paste operations
  const [visualFeedback, setVisualFeedback] = useState<{
    show: boolean;
    message: string;
    position: { x: number; y: number };
  } | null>(null);

  // Edit mode drag state (use refs for animation loop access)
  const editDragState = useRef<EditDragState>({
    isDragging: false,
    dragType: null,
    startPoint: null
  });
  const editDragScreenStart = useRef<{ x: number; y: number } | null>(null);
  const editDragCurrentWorldPoint = useRef<Vertex | null>(null); // Track current mouse position during drag

  // Assembly mode drag state (use refs for animation loop access)
  const assemblyDragState = useRef<AssemblyDragState>({
    isDragging: false,
    dragType: null,
    startPoint: null
  });
  const assemblyDragScreenStart = useRef<{ x: number; y: number } | null>(null);
  const assemblyGuideLines = useRef<GuideLine[]>([]);
  const lastSnapResult = useRef<RoomSnapResult | null>(null);

  // Long press detection for copy/paste
  const LONG_PRESS_DURATION = 500; // ms
  const LONG_PRESS_MOVE_THRESHOLD = 5; // px
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressStartPos = useRef<{ x: number; y: number } | null>(null);
  const isLongPressing = useRef<boolean>(false);

  // Editable dimensions hook
  const editableDimensions = useEditableDimensions();

  /**
   * Setup canvas size and DPI scaling
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  /**
   * Render everything
   * Note: NOT using useCallback to avoid animation loop restarts
   * Reads fresh values from store on every frame
   */
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // Get fresh values from store on each render
    const currentState = useFloorplanStore.getState();
    const rooms = Array.from(currentState.rooms.values());
    const editorMode = currentState.editorMode;
    const config = currentState.config;
    const viewport = currentState.viewport;
    const drawing = currentState.drawing;
    const selection = currentState.selection;

    // Clear canvas
    clearCanvas(ctx, rect.width, rect.height);

    // Clear dimension labels at start of render
    editableDimensions.clearDimensionLabels();

    // Draw grid
    drawGrid(ctx, viewport, config, rect.width, rect.height);

    // Draw envelopes FIRST (bottom layer) - ALWAYS draw them to show walls during drag
    const isAnyRoomDragging = editorMode === EditorMode.Assembly && assemblyDragState.current.isDragging;
    const isEditModeDragging = editorMode === EditorMode.Edit && editDragState.current.isDragging;

    // Hide dark gray fill (external walls) when dragging in either mode
    // When true, drawEnvelope will call drawWalls() to show half-thickness walls with orange snap indicators
    // When false, drawEnvelope shows the full dark gray fill without calling drawWalls()
    const hideExternalWallsFill = isAnyRoomDragging || isEditModeDragging;

    rooms.forEach(room => {
      // Skip rendering walls for the selected room when dragging in edit mode
      // (because they're not being updated during drag and would show stale positions)
      const isSelected = selection.selectedRoomIds.includes(room.id);
      if (isEditModeDragging && isSelected) {
        return; // Don't draw envelope (walls) for selected room during edit mode drag
      }

      // Check if this room is involved in snapping (for orange wall highlight)
      let snapSegmentWorld: { p1: Vertex; p2: Vertex } | undefined;

      if (editorMode === EditorMode.Assembly && lastSnapResult.current?.snapped) {
        const snapResult = lastSnapResult.current; // Access .current to get the actual result
        // Highlight walls that will snap for both edge-vertex and edge-only modes
        if (snapResult.mode === 'edge-vertex' || snapResult.mode === 'edge-only') {
          if (room.id === snapResult.movingRoomId) {
            snapSegmentWorld = snapResult.movingSegmentWorld;
          } else if (room.id === snapResult.stationaryRoomId) {
            snapSegmentWorld = snapResult.stationarySegmentWorld;
          }
        }
      }

      // Draw envelope with snap information for orange highlight
      // Pass isDragging flag to hide dark gray fill and show half-thickness walls with snap indicators
      // Pass showDebugLines from config
      drawEnvelope(ctx, room, viewport, snapSegmentWorld, hideExternalWallsFill, config.showDebugLines ?? false);
    });

    // Draw apertures (doors/windows) on top of walls
    // Must be drawn after envelope to be visible on black outer walls
    rooms.forEach(room => {
      drawApertures(ctx, room, viewport);
    });

    // Draw aperture ghost preview (when dragging in edit mode)
    if (editorMode === EditorMode.Edit && editDragState.current.dragType === 'aperture' &&
        editDragState.current.isDragging && editDragState.current.targetWallIndex !== null &&
        editDragState.current.targetWallIndex !== undefined && editDragState.current.targetRoomId) {

      // Get source room to get aperture info
      const sourceRoomId = editDragState.current.sourceRoomId;
      const sourceRoom = rooms.find(r => r.id === sourceRoomId);

      // Get target room to draw ghost on
      const targetRoomId = editDragState.current.targetRoomId;
      const targetRoom = rooms.find(r => r.id === targetRoomId);

      if (sourceRoom && targetRoom && editDragState.current.apertureId && editDragState.current.sourceWallIndex !== undefined) {
        const sourceWall = sourceRoom.walls[editDragState.current.sourceWallIndex];
        const aperture = sourceWall?.apertures?.find(a => a.id === editDragState.current.apertureId);

        if (aperture) {
          // Calculate target position for ghost using current mouse position
          const currentWorldPoint = editDragCurrentWorldPoint.current;
          if (currentWorldPoint) {
            const result = calculateApertureDrag({
              worldPoint: currentWorldPoint,
              dragState: editDragState.current,
              targetRoom, // Use target room (can be different from source)
              targetWallIndex: editDragState.current.targetWallIndex
            });

            if (result) {
              // Get target wall to calculate validation
              const targetWall = targetRoom.walls[result.targetWallIndex];
              const vertexArray = targetRoom.vertices;
              const n = vertexArray.length;

              let isValid = true;
              if (targetWall && targetWall.vertexIndex < n) {
                const v1Local = vertexArray[targetWall.vertexIndex];
                const v2Local = vertexArray[(targetWall.vertexIndex + 1) % n];
                const v1World = localToWorld(v1Local, targetRoom.position, targetRoom.rotation, targetRoom.scale);
                const v2World = localToWorld(v2Local, targetRoom.position, targetRoom.rotation, targetRoom.scale);
                const wallLengthPx = calculateWallLength(v1World, v2World);

                // Validate position
                // For cross-room moves, don't exclude the aperture ID since it's on a different wall
                const validation = validateAperturePosition({
                  aperture,
                  targetWall,
                  targetDistance: result.newDistance,
                  targetAnchor: result.newAnchor,
                  wallLengthPx,
                  excludeApertureId: (sourceRoomId === targetRoomId && editDragState.current.sourceWallIndex === result.targetWallIndex) ?
                    editDragState.current.apertureId : undefined
                });

                isValid = validation.isValid;

                // If invalid due to collision but we have a suggested position, use that and mark as valid
                if (!isValid && validation.reason === 'collision' && validation.suggestedPosition) {
                  result.newDistance = validation.suggestedPosition.distance;
                  result.newAnchor = validation.suggestedPosition.anchor;
                  isValid = true; // Will be placed at suggested position
                }
              }

              // Draw the ghost on TARGET room
              drawApertureGhost(
                ctx,
                targetRoom, // Draw on target room (can be different from source)
                result.targetWallIndex,
                aperture,
                result.newDistance,
                result.newAnchor,
                viewport,
                isValid
              );
            }
          }
        }
      }
    }

    // Draw rooms
    rooms.forEach(room => {
      const isSelected = selection.selectedRoomIds.includes(room.id);
      const isHover = selection.hoverRoomId === room.id;

      // Draw room floor (always draw all rooms, even during drag)
      drawRoom(ctx, room, viewport, {
        selected: isSelected,
        strokeColor: isSelected ? '#3b82f6' : isHover ? '#60a5fa' : '#64748b',
        selectedEdgeIndex: isSelected ? selection.selectedEdgeIndex : null
      });

      // Draw dimension labels if enabled
      if (config.showDimensions) {
        drawDimensionLabels(ctx, room, viewport, {
          selected: isSelected,
          onRegisterLabel: editableDimensions.registerDimensionLabel
        });

        // Draw diagonal distance constraint labels
        if (room.constraints) {
          const worldVertices = room.vertices.map(v =>
            localToWorld(v, room.position, room.rotation, room.scale)
          );

          room.constraints.forEach(constraint => {
            if (!constraint.enabled) return;
            if (constraint.type !== ConstraintType.Distance) return;
            if (constraint.indices.length !== 2) return;

            const v1Index = constraint.indices[0];
            const v2Index = constraint.indices[1];

            // Check if this is a diagonal constraint (non-adjacent vertices)
            const isAdjacent = (v2Index === (v1Index + 1) % room.vertices.length) ||
                               (v1Index === (v2Index + 1) % room.vertices.length);

            if (isAdjacent) return; // Skip edge constraints (already drawn above)

            // Draw diagonal dimension label
            const v1World = worldVertices[v1Index];
            const v2World = worldVertices[v2Index];

            const dx = v2World.x - v1World.x;
            const dy = v2World.y - v1World.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const midWorld = {
              x: (v1World.x + v2World.x) / 2,
              y: (v1World.y + v2World.y) / 2
            };
            const midScreen = worldToScreen(midWorld, viewport);

            // Format text
            const text = distance < 1000 ? `${(distance / 100).toFixed(2)}m` : `${(distance / 100).toFixed(1)}m`;

            // Draw label background
            ctx.save();
            ctx.font = '12px sans-serif';
            const metrics = ctx.measureText(text);
            const padding = 6;
            const labelWidth = metrics.width + padding * 2;
            const labelHeight = 20;

            const bounds = {
              x: midScreen.x - labelWidth / 2,
              y: midScreen.y - labelHeight / 2,
              width: labelWidth,
              height: labelHeight
            };

            // Background
            ctx.fillStyle = '#8b5cf6'; // Purple for diagonal constraints
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

            // Border
            ctx.strokeStyle = '#6d28d9';
            ctx.lineWidth = 1;
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

            // Text
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, midScreen.x, midScreen.y);

            ctx.restore();

            // Register label for click detection (reusing the same editable dimensions system)
            if (isSelected && editableDimensions.registerDimensionLabel) {
              editableDimensions.registerDimensionLabel({
                roomId: room.id,
                edgeIndex: v1Index * 1000 + v2Index, // Unique ID for diagonal constraint
                position: midScreen,
                bounds,
                currentValue: distance,
                wallVertices: [v1World, v2World]
              });
            }
          });
        }
      }

      // Draw constraint indicators (in edit mode) - NEW: Additive constraint visualization
      if (editorMode === EditorMode.Edit && isSelected) {
        drawConstraintIndicators(ctx, room, viewport);
      }
    });

    // Draw drawing preview (in draw mode)
    if (editorMode === EditorMode.Draw && drawing.isDrawing) {
      drawDrawingPreview(
        ctx,
        drawing.vertices,
        drawing.currentMouseWorld,
        drawing.snapPosition,
        viewport
      );

      // Draw guide line (if enabled)
      if (config.showGuideLines !== false && drawing.activeGuideLine) {
        drawGuideLine(ctx, drawing.activeGuideLine, viewport);
      }
    }

    // Draw assembly guide lines (in assembly mode, if enabled)
    if (config.showGuideLines !== false && editorMode === EditorMode.Assembly && assemblyGuideLines.current.length > 0) {
      assemblyGuideLines.current.forEach(guideLine => {
        drawGuideLine(ctx, guideLine, viewport);
      });
    }

    // Draw room joining snap indicators (in assembly mode during drag)
    if (editorMode === EditorMode.Assembly && lastSnapResult) {
      drawRoomSnapIndicators(ctx, lastSnapResult.current, viewport);
    }

    // Draw selection rectangle (in assembly mode)
    if (editorMode === EditorMode.Assembly && selectionRectangle.isSelecting &&
        selectionRectangle.startPoint && selectionRectangle.currentPoint) {
      const start = worldToScreen(selectionRectangle.startPoint, viewport);
      const current = worldToScreen(selectionRectangle.currentPoint, viewport);

      ctx.save();

      // Draw filled rectangle with transparency
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(
        start.x,
        start.y,
        current.x - start.x,
        current.y - start.y
      );

      // Draw rectangle border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        start.x,
        start.y,
        current.x - start.x,
        current.y - start.y
      );

      ctx.restore();
    }

    // Draw diagonal constraint preview line (in edit mode with diagonal mode active)
    if (editorMode === EditorMode.Edit && selection.diagonalConstraintMode) {
      const selectedRoom = getSelectedRoom();
      if (selectedRoom) {
        const worldVertices = selectedRoom.vertices.map(v =>
          localToWorld(v, selectedRoom.position, selectedRoom.rotation, selectedRoom.scale)
        );

        ctx.save();

        if (selection.diagonalVertices.length === 1) {
          // Draw preview line from first selected vertex to cursor
          const v1World = worldVertices[selection.diagonalVertices[0]];
          const v1Screen = worldToScreen(v1World, viewport);
          const cursorWorld = drawing.currentMouseWorld;

          if (cursorWorld) {
            const cursorScreen = worldToScreen(cursorWorld, viewport);

            // Draw dashed line
            ctx.strokeStyle = '#f59e0b'; // Orange color
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(v1Screen.x, v1Screen.y);
            ctx.lineTo(cursorScreen.x, cursorScreen.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Calculate and draw distance label
            const dx = cursorWorld.x - v1World.x;
            const dy = cursorWorld.y - v1World.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const midX = (v1Screen.x + cursorScreen.x) / 2;
            const midY = (v1Screen.y + cursorScreen.y) / 2;

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${distance.toFixed(1)}cm`, midX, midY - 5);
          }
        } else if (selection.diagonalVertices.length === 2) {
          // Draw dashed line between two selected vertices
          const v1World = worldVertices[selection.diagonalVertices[0]];
          const v2World = worldVertices[selection.diagonalVertices[1]];
          const v1Screen = worldToScreen(v1World, viewport);
          const v2Screen = worldToScreen(v2World, viewport);

          // Draw dashed line
          ctx.strokeStyle = '#10b981'; // Green color
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 5]);
          ctx.beginPath();
          ctx.moveTo(v1Screen.x, v1Screen.y);
          ctx.lineTo(v2Screen.x, v2Screen.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Calculate and draw distance label
          const dx = v2World.x - v1World.x;
          const dy = v2World.y - v1World.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const midX = (v1Screen.x + v2Screen.x) / 2;
          const midY = (v1Screen.y + v2Screen.y) / 2;

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${distance.toFixed(1)}cm`, midX, midY - 5);
        }

        ctx.restore();

        // Draw highlighted diagonal vertices
        selection.diagonalVertices.forEach(vertexIndex => {
          const vWorld = worldVertices[vertexIndex];
          const vScreen = worldToScreen(vWorld, viewport);

          ctx.save();
          // Draw larger blue circle for diagonal vertices
          ctx.strokeStyle = '#3b82f6';
          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(vScreen.x, vScreen.y, 12 / viewport.zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }
    }

    // Draw vertex/edge handles (in edit mode)
    if (editorMode === EditorMode.Edit) {
      const selectedRoom = getSelectedRoom();
      if (selectedRoom) {
        // Transform vertices to world coordinates (with full transformation)
        const worldVertices = selectedRoom.vertices.map(v =>
          localToWorld(v, selectedRoom.position, selectedRoom.rotation, selectedRoom.scale)
        );

        drawVertexHandles(ctx, worldVertices, viewport, {
          selectedIndex: selection.selectedVertexIndex,
          hoverIndex: selection.hoverVertexIndex
        });

        drawEdgeHandles(ctx, worldVertices, viewport, {
          selectedIndex: selection.selectedEdgeIndex,
          hoverIndex: selection.hoverEdgeIndex
        });
      }
    }

    // Draw rotation handle (in assembly mode)
    if (editorMode === EditorMode.Assembly) {
      const selectedRoom = getSelectedRoom();
      if (selectedRoom) {
        drawRotationHandle(ctx, selectedRoom, viewport, {
          isDragging: assemblyDragState.current.dragType === 'rotation'
        });
      }
    }
  };

  /**
   * Animation loop
   */
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Handle dimension editing submission
   */
  const handleDimensionSubmit = useCallback((newValueCm: number) => {
    if (!editableDimensions.editingDimension) {
      editableDimensions.cancelEditingDimension();
      return;
    }

    const { roomId, edgeIndex } = editableDimensions.editingDimension;

    // Get room
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      editableDimensions.cancelEditingDimension();
      return;
    }

    let v1Index: number, v2Index: number;
    let isDiagonal = false;

    // Check if this is a diagonal constraint (encoded as v1*1000 + v2)
    if (edgeIndex >= 1000) {
      // Diagonal constraint
      v1Index = Math.floor(edgeIndex / 1000);
      v2Index = edgeIndex % 1000;
      isDiagonal = true;
      console.log('📝 Editing diagonal constraint between v', v1Index, 'and v', v2Index);
    } else {
      // Edge constraint (adjacent vertices)
      v1Index = edgeIndex;
      v2Index = (edgeIndex + 1) % room.vertices.length;
      console.log('📝 Editing edge constraint between v', v1Index, 'and v', v2Index);
    }

    // Find existing distance constraint for these vertices
    const existingConstraint = room.constraints.find(c =>
      c.type === ConstraintType.Distance &&
      c.enabled &&
      ((c.indices[0] === v1Index && c.indices[1] === v2Index) ||
       (c.indices[0] === v2Index && c.indices[1] === v1Index))
    );

    if (existingConstraint) {
      // Update existing constraint by removing old and adding new
      console.log('  ✏️ Updating existing constraint', existingConstraint.id, 'from', existingConstraint.value, 'to', newValueCm);
      const removeConstraint = useFloorplanStore.getState().removeConstraint;
      removeConstraint(roomId, existingConstraint.id);
    } else {
      console.log('  ➕ Creating new constraint with value', newValueCm);
    }

    // Add new constraint with updated value
    const constraint = createDistanceConstraint(room, v1Index, v2Index, newValueCm);
    addConstraint(roomId, constraint, true);

    // Clear editing state
    editableDimensions.cancelEditingDimension();
  }, [editableDimensions, addConstraint, rooms]);

  /**
   * Handle dimension editing cancellation
   */
  const handleDimensionCancel = useCallback(() => {
    editableDimensions.cancelEditingDimension();
  }, [editableDimensions]);

  /**
   * Double click handler
   * - Assembly mode: Enter edit mode on the clicked room
   * - Edit mode: Add vertex at click position
   */
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    console.log('🖱️🖱️ Double click detected:', { editorMode });
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport);

    // Assembly mode - double click on a room to enter edit mode
    if (editorMode === EditorMode.Assembly) {
      // Find which room was clicked
      const hit = findBestHit(worldPoint, rooms);
      if (hit && hit.roomId) {
        // Select the room and enter edit mode
        selectRoom(hit.roomId);
        setEditorMode(EditorMode.Edit);
      }
    }

    // Edit mode - double-click on vertex to delete it, or on edge to add vertex, or on aperture to edit it
    if (editorMode === EditorMode.Edit) {
      const selectedRoom = getSelectedRoom();
      console.log('🖱️ Edit mode double-click at world:', worldPoint);
      console.log('  Selected room:', selectedRoom?.id);
      if (selectedRoom) {
        // Check if double-click is on an aperture first (highest priority)
        console.log('  Testing apertures...');
        const apertureHit = hitTestApertures(worldPoint, selectedRoom);
        if (apertureHit) {
          console.log('  ✅ HIT APERTURE:', apertureHit);
          // Select the aperture (this will open the edit modal)
          selectAperture(apertureHit.apertureId, apertureHit.wallIndex);
          return;
        }
        console.log('  ❌ No aperture hit');

        // Check if double-click is on a vertex second
        const vertexIndex = hitTestRoomVertices(worldPoint, selectedRoom, 20, viewport.zoom);

        if (vertexIndex !== -1 && selectedRoom.vertices.length > 3) {
          // Delete vertex on double-click
          console.log('🗑️ Delete vertex on double-click:', vertexIndex);
          const result = calculateDeleteVertex({
            room: selectedRoom,
            vertexIndex
          });

          if (result) {
            console.log('✅ Vertex deleted successfully');
            updateRoom(selectedRoom.id, result);
            if (recalculateAllEnvelopes) {
              setTimeout(async () => await recalculateAllEnvelopes(), 0);
            }
          } else {
            console.log('❌ Failed to delete vertex (need at least 3 vertices)');
          }
          return;
        }

        // Not on a vertex, so add vertex at click position (finds closest edge automatically)
        console.log('➕ Edit mode double click - adding vertex');

        // Convert to local coordinates and find closest edge
        const localPoint = {
          x: (worldPoint.x - selectedRoom.position.x) * Math.cos(-selectedRoom.rotation) -
             (worldPoint.y - selectedRoom.position.y) * Math.sin(-selectedRoom.rotation),
          y: (worldPoint.x - selectedRoom.position.x) * Math.sin(-selectedRoom.rotation) +
             (worldPoint.y - selectedRoom.position.y) * Math.cos(-selectedRoom.rotation)
        };

        // Find closest edge
        let minDistance = Infinity;
        let closestEdge = 0;
        for (let i = 0; i < selectedRoom.vertices.length; i++) {
          const v1 = selectedRoom.vertices[i];
          const v2 = selectedRoom.vertices[(i + 1) % selectedRoom.vertices.length];
          const dx = v2.x - v1.x;
          const dy = v2.y - v1.y;
          const lengthSquared = dx * dx + dy * dy;

          if (lengthSquared === 0) continue;

          let t = ((localPoint.x - v1.x) * dx + (localPoint.y - v1.y) * dy) / lengthSquared;
          t = Math.max(0, Math.min(1, t));

          const projX = v1.x + t * dx;
          const projY = v1.y + t * dy;
          const dist = Math.hypot(localPoint.x - projX, localPoint.y - projY);

          if (dist < minDistance) {
            minDistance = dist;
            closestEdge = i;
          }
        }

        // Add vertex to the closest edge using the utility function
        console.log('📍 Adding vertex to edge:', closestEdge, 'at distance:', minDistance.toFixed(2));
        const result = calculateAddVertexToEdge({
          room: selectedRoom,
          edgeIndex: closestEdge,
          worldPoint
        });

        if (result) {
          console.log('✅ Vertex added successfully, updating room');
          updateRoom(selectedRoom.id, result);
          if (recalculateAllEnvelopes) {
            recalculateAllEnvelopes();
          }
        } else {
          console.log('❌ Failed to add vertex');
        }
      }
    }
  }, [editorMode, viewport, getSelectedRoom, rooms, selectRoom, setEditorMode, updateRoom, recalculateAllEnvelopes]);

  /**
   * Clear long press timer helper
   */
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStartPos.current = null;
    isLongPressing.current = false;
  }, []);

  /**
   * Show visual feedback for copy/paste operations
   */
  const showVisualFeedback = useCallback((message: string, x: number, y: number) => {
    setVisualFeedback({ show: true, message, position: { x, y } });

    // Auto-hide after 1.5 seconds
    setTimeout(() => {
      setVisualFeedback(null);
    }, 1500);
  }, []);

  /**
   * Mouse down handler
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport);

    // Pan with middle mouse or space + click
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      startPanning();
      setPanStartPoint({ x: screenX, y: screenY });
      e.preventDefault();
      return;
    }

    // Left click
    if (e.button === 0) {
      console.log('🖱️ Left click detected:', {
        editorMode,
        toolMode,
        isDrawing: drawing.isDrawing,
        vertexCount: drawing.vertices.length
      });

      // Check for dimension label click first (if dimensions are shown)
      if (config.showDimensions) {
        const hitLabel = editableDimensions.hitTestDimensionLabel(screenX, screenY);
        if (hitLabel) {
          console.log('Dimension label clicked:', hitLabel);
          editableDimensions.startEditingDimension(hitLabel);
          console.log('Editing dimension state:', editableDimensions.editingDimension);
          return;
        }
      }

      // Drawing mode
      if (editorMode === EditorMode.Draw && toolMode === ToolMode.DrawRoom) {
        console.log('📐 In drawing mode, processing click...');
        if (!drawing.isDrawing) {
          // Start drawing - calculate snap for first vertex
          const snapResult = snapWithPriority(
            worldPoint,
            null,
            [],
            config.size,
            viewport.zoom,
            false,
            config.snapEnabled,
            rooms
          );
          const firstVertex = snapResult.position || worldPoint;
          startDrawing();
          // Create vertex with UUID to ensure ID is assigned from the start
          const vertexWithId = createVertex(firstVertex.x, firstVertex.y);
          addDrawingVertex(vertexWithId);
          setSnapPosition(vertexWithId);
        } else {
          // Check if we're close to the first vertex (for closing)
          if (drawing.vertices.length >= MIN_VERTICES) {
            const firstVertex = drawing.vertices[0];
            const distToFirst = distance(worldPoint, firstVertex);

            console.log('🔍 Polygon closing check on CLICK (raw distance to first):', {
              vertexCount: drawing.vertices.length,
              distanceToFirst: distToFirst.toFixed(2),
              threshold: CLOSE_THRESHOLD,
              willClose: distToFirst < CLOSE_THRESHOLD,
              worldPoint,
              firstVertex
            });

            if (distToFirst < CLOSE_THRESHOLD) {
              // Close polygon and create room
              console.log('✅ Closing polygon!');
              finishDrawing();
              return;
            }
          }

          // Not closing - calculate snap position and add vertex
          const lastVertex = drawing.vertices[drawing.vertices.length - 1];
          const snapResult = snapWithPriority(
            worldPoint,
            lastVertex,
            drawing.vertices,
            config.size,
            viewport.zoom,
            config.orthogonalSnapEnabled ?? false,
            config.snapEnabled,
            rooms
          );
          const snapPos = snapResult.position || worldPoint;

          // Add the snapped vertex with UUID
          console.log('➕ Adding vertex at:', snapPos);
          const vertexWithId = createVertex(snapPos.x, snapPos.y);
          addDrawingVertex(vertexWithId);
        }
        return;
      }

      // Edit mode - vertex/edge/wall selection and dragging
      if (editorMode === EditorMode.Edit) {
        const selectedRoom = getSelectedRoom();

        // HIGHEST PRIORITY: Check vertex hit first (with zoom-aware hit testing)
        if (selectedRoom) {
          const vertexIndex = hitTestRoomVertices(worldPoint, selectedRoom, 20, viewport.zoom);
          if (vertexIndex !== -1) {
            // Check if in diagonal constraint mode
            if (selection.diagonalConstraintMode) {
              console.log('🎯 Diagonal mode: clicked vertex', vertexIndex);
              console.log('  Current selection:', selection.diagonalVertices);

              // Calculate what the new length will be after adding this vertex
              const currentVertices = selection.diagonalVertices;
              const alreadySelected = currentVertices.includes(vertexIndex);

              if (alreadySelected) {
                console.log('  ⚠️ Vertex already selected, ignoring');
                return;
              }

              // Add vertex to diagonal selection
              addDiagonalVertex(vertexIndex);
              console.log('  ✅ Added vertex to selection');

              // Check if we now have 2 vertices (will have after adding)
              const newLength = currentVertices.length + 1;
              console.log('  New length will be:', newLength);

              if (newLength === 2) {
                // Create constraint with both vertices
                const v1 = currentVertices[0];
                const v2 = vertexIndex;
                console.log('  🔧 Creating distance constraint between v', v1, 'and v', v2);

                const constraint = createDistanceConstraint(selectedRoom, v1, v2);
                addConstraint(selectedRoom.id, constraint, true);
                clearDiagonalConstraintMode();
                console.log('  ✅ Constraint created and diagonal mode cleared');
              }
              return;
            }

            // Normal vertex selection and drag
            selectVertex(vertexIndex);
            editDragState.current = createVertexDragState(selectedRoom, vertexIndex, worldPoint);
            editDragScreenStart.current = { x: screenX, y: screenY };
            return;
          }
        }

        // SECOND PRIORITY: Check aperture hit (doors and windows)
        if (selectedRoom) {
          const apertureHit = hitTestApertures(worldPoint, selectedRoom);
          if (apertureHit) {
            console.log(`🚪 Aperture hit detected: ${apertureHit.apertureId} on wall ${apertureHit.wallIndex}`);

            // Start long press timer for copy operation
            longPressStartPos.current = { x: screenX, y: screenY };
            isLongPressing.current = true;

            // Store the aperture hit info for potential drag or copy
            const tempDragState = createApertureDragState(
              selectedRoom,
              apertureHit.wallIndex,
              apertureHit.apertureId,
              worldPoint
            );

            longPressTimer.current = setTimeout(() => {
              // Long press completed - trigger copy
              console.log('⏱️ Long press completed - copying aperture');
              copyAperture(selectedRoom.id, apertureHit.wallIndex, apertureHit.apertureId);

              // Show visual feedback
              if (longPressStartPos.current) {
                showVisualFeedback('Aperture Copied', longPressStartPos.current.x, longPressStartPos.current.y);
              }

              isLongPressing.current = false;
              longPressStartPos.current = null;
            }, LONG_PRESS_DURATION);

            // Store drag state for potential drag (if user moves before timer expires)
            editDragState.current = tempDragState;
            editDragScreenStart.current = { x: screenX, y: screenY };

            return;
          }
        }

        // Third priority: Check ALL room envelopes to see if click is in any envelope area
        let clickedInEnvelopeArea = false;
        for (const room of rooms) {
          if (!room.envelopeVertices) continue;

          const worldEnvelope = room.envelopeVertices.map(v =>
            localToWorld(v, room.position, room.rotation, room.scale)
          );
          const worldRoomVertices = room.vertices.map(v =>
            localToWorld(v, room.position, room.rotation, room.scale)
          );

          const insideEnvelope = pointInPolygon(worldPoint, worldEnvelope);
          const insideRoom = pointInPolygon(worldPoint, worldRoomVertices);

          if (insideEnvelope && !insideRoom) {
            // Click is in the wall thickness area - find closest room edge across ALL rooms
            let closestRoomId: string | null = null;
            let closestEdgeIndex = -1;
            let minDistance = Infinity;

            rooms.forEach(room => {
              // Use vertices for edge selection
              const edgeVertices = room.vertices;

              for (let i = 0; i < edgeVertices.length; i++) {
                const v1Local = edgeVertices[i];
                const v2Local = edgeVertices[(i + 1) % edgeVertices.length];

                // Transform to world coordinates
                const v1 = localToWorld(v1Local, room.position, room.rotation, room.scale);
                const v2 = localToWorld(v2Local, room.position, room.rotation, room.scale);

                // Calculate distance from point to edge segment
                const dx = v2.x - v1.x;
                const dy = v2.y - v1.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len === 0) continue;

                const t = Math.max(0, Math.min(1, ((worldPoint.x - v1.x) * dx + (worldPoint.y - v1.y) * dy) / (len * len)));
                const projX = v1.x + t * dx;
                const projY = v1.y + t * dy;
                const dist = Math.sqrt((worldPoint.x - projX) ** 2 + (worldPoint.y - projY) ** 2);

                if (dist < minDistance) {
                  minDistance = dist;
                  closestRoomId = room.id;
                  closestEdgeIndex = i;
                }
              }
            });

            if (closestRoomId && closestEdgeIndex !== -1) {
              console.log(`🎯 Clicked envelope area - Closest edge: Room ${closestRoomId}, Edge ${closestEdgeIndex}, Distance: ${minDistance.toFixed(2)}cm`);

              // Select the room if not already selected
              selectRoom(closestRoomId);
              // Select the edge
              selectEdge(closestEdgeIndex);

              // Start long press timer for paste operation (if clipboard has data)
              if (apertureClipboard) {
                console.log('📋 Aperture clipboard has data, starting long press timer for paste');
                longPressStartPos.current = { x: screenX, y: screenY };
                isLongPressing.current = true;

                longPressTimer.current = setTimeout(() => {
                  // Long press completed - trigger paste
                  console.log('⏱️ Long press completed on wall - pasting aperture');

                  // Find closest wall to paste on
                  let targetRoomId: string | null = null;
                  let targetWallIndex: number | null = null;
                  let minWallDistance = Infinity;
                  let targetDistance = 0;
                  let targetAnchor: 'start' | 'end' = 'start';

                  for (const room of rooms) {
                    const vertexArray = room.vertices;
                    const n = vertexArray.length;

                    for (let i = 0; i < room.walls.length; i++) {
                      const wall = room.walls[i];
                      if (wall.vertexIndex >= n) continue;

                      const v1Local = vertexArray[wall.vertexIndex];
                      const v2Local = vertexArray[(wall.vertexIndex + 1) % n];
                      const v1World = localToWorld(v1Local, room.position, room.rotation, room.scale);
                      const v2World = localToWorld(v2Local, room.position, room.rotation, room.scale);

                      const dx = v2World.x - v1World.x;
                      const dy = v2World.y - v1World.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      if (len === 0) continue;

                      const t = Math.max(0, Math.min(1, ((worldPoint.x - v1World.x) * dx + (worldPoint.y - v1World.y) * dy) / (len * len)));
                      const projX = v1World.x + t * dx;
                      const projY = v1World.y + t * dy;
                      const dist = Math.sqrt((worldPoint.x - projX) ** 2 + (worldPoint.y - projY) ** 2);

                      if (dist < minWallDistance) {
                        minWallDistance = dist;
                        targetRoomId = room.id;
                        targetWallIndex = i;

                        // Calculate position on wall
                        const positionPx = t * len;
                        const distanceFromStartPx = positionPx;
                        const distanceFromEndPx = len - positionPx;

                        if (distanceFromStartPx < distanceFromEndPx) {
                          targetAnchor = 'start';
                          targetDistance = distanceFromStartPx / 100;
                        } else {
                          targetAnchor = 'end';
                          targetDistance = distanceFromEndPx / 100;
                        }
                      }
                    }
                  }

                  if (targetRoomId && targetWallIndex !== null) {
                    console.log(`📌 Pasting aperture to room ${targetRoomId} wall ${targetWallIndex}`);
                    pasteAperture(targetRoomId, targetWallIndex, targetDistance, targetAnchor);

                    // Show visual feedback
                    if (longPressStartPos.current) {
                      showVisualFeedback('Aperture Pasted', longPressStartPos.current.x, longPressStartPos.current.y);
                    }
                  }

                  isLongPressing.current = false;
                  longPressStartPos.current = null;
                }, LONG_PRESS_DURATION);
              }

              clickedInEnvelopeArea = true;
              break;
            }
          }
        }

        if (clickedInEnvelopeArea) {
          return;
        }

        if (selectedRoom) {
          // Check regular wall hit
          const wallIndex = hitTestRoomWalls(worldPoint, selectedRoom);
          if (wallIndex !== -1) {
            // Note: selectWall doesn't exist yet in store, we'll use wall index in dragState
            editDragState.current = createWallDragState(selectedRoom, wallIndex, worldPoint);
            editDragScreenStart.current = { x: screenX, y: screenY };
            return;
          }

          // Check edge hit (fallback if no walls)
          const edgeIndex = hitTestRoomEdges(worldPoint, selectedRoom);
          if (edgeIndex !== -1) {
            selectEdge(edgeIndex);
            editDragState.current = createEdgeDragState(selectedRoom, edgeIndex, worldPoint);
            editDragScreenStart.current = { x: screenX, y: screenY };
            return;
          }
        }

        // No selected room OR clicked outside selected room - try to select a room
        const hit = findBestHit(worldPoint, rooms);
        if (hit && hit.roomId) {
          selectRoom(hit.roomId, e.shiftKey);
          return;
        }

        // Clicked outside any room - exit to Assembly mode
        if (!e.shiftKey) {
          setEditorMode(EditorMode.Assembly);
        }
        return;
      }

      // Assembly mode - room selection, dragging, and rotation
      if (editorMode === EditorMode.Assembly) {
        console.log('🏠 Assembly mode click');
        const selectedRoom = getSelectedRoom();
        console.log('Selected room:', selectedRoom?.id);

        // Check rotation handle first (highest priority)
        if (selectedRoom) {
          const handleHit = hitTestRotationHandle(worldPoint, selectedRoom);
          console.log('Rotation handle hit test:', handleHit);
          if (handleHit) {
            console.log('🎯 Rotation handle clicked!');
            assemblyDragState.current = createRotationDragState(selectedRoom, worldPoint);
            assemblyDragScreenStart.current = { x: screenX, y: screenY }; // IMPORTANT: Set screen start for mouse move to work!
            console.log('Assembly drag state:', assemblyDragState.current);
            return;
          }
        }

        // Find room at click position
        const hit = findBestHit(worldPoint, rooms);
        if (hit && hit.roomId) {
          const room = rooms.find(r => r.id === hit.roomId);
          if (room) {
            console.log('🎯 Room clicked:', room.id);
            selectRoom(room.id, e.shiftKey);
            assemblyDragState.current = createRoomDragState(room, worldPoint);
            assemblyDragScreenStart.current = { x: screenX, y: screenY };
          }
          return;
        }

        // Click on empty space - start rectangle selection or clear selection
        if (!e.shiftKey) {
          // Start rectangle selection
          setSelectionRectangle({
            isSelecting: true,
            startPoint: worldPoint,
            currentPoint: worldPoint
          });
        } else {
          clearAllSelection();
        }
        return;
      }
    }
  }, [editorMode, toolMode, spacePressed, viewport, drawing, selection, rooms, getSelectedRoom, selectRoom, selectVertex, selectEdge, setEditorMode, clearAllSelection, startDrawing, addDrawingVertex, startPanning, updateRoom, recalculateAllEnvelopes, copyAperture, pasteAperture, apertureClipboard, showVisualFeedback]);

  /**
   * Mouse move handler
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport);

    // Check for long press cancellation due to movement
    if (isLongPressing.current && longPressStartPos.current) {
      const dx = screenX - longPressStartPos.current.x;
      const dy = screenY - longPressStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > LONG_PRESS_MOVE_THRESHOLD) {
        // Movement exceeded threshold - cancel long press and start drag
        console.log('🚫 Long press cancelled due to movement - starting drag');
        clearLongPressTimer();
        // Drag will be handled by existing edit mode logic below
      }
    }

    // Update panning
    if (isPanning && panStartPoint) {
      const dx = screenX - panStartPoint.x;
      const dy = screenY - panStartPoint.y;
      panViewport(dx, dy);
      setPanStartPoint({ x: screenX, y: screenY });
      return;
    }

    // Update drawing preview with snapping
    if (editorMode === EditorMode.Draw && drawing.isDrawing) {
      if (drawing.vertices.length > 0) {
        const lastVertex = drawing.vertices[drawing.vertices.length - 1];

        // Calculate snap position with priority
        const snapResult = snapWithPriority(
          worldPoint,
          lastVertex,
          drawing.vertices,
          config.size,
          viewport.zoom,
          config.orthogonalSnapEnabled ?? false, // orthogonalEnabled
          config.snapEnabled,
          rooms
        );

        setCurrentMouseWorld(worldPoint);
        setSnapPosition(snapResult.position || worldPoint);
        setActiveGuideLine(snapResult.guideLine || null);
      } else {
        setCurrentMouseWorld(worldPoint);
        setSnapPosition(null);
        setActiveGuideLine(null);
      }
      return;
    }

    // Edit mode - update vertex/edge drag
    if (editorMode === EditorMode.Edit) {
      const selectedRoom = getSelectedRoom();

      // Check if we're dragging (or about to start dragging)
      if (selectedRoom && editDragState.current.dragType !== null && editDragScreenStart.current) {
        // Check threshold first
        if (!editDragState.current.isDragging) {
          if (isEditDragThresholdExceeded(editDragScreenStart.current, { x: screenX, y: screenY }, EDIT_DRAG_THRESHOLD)) {
            editDragState.current = { ...editDragState.current, isDragging: true };
          }
          return; // Wait for next mouse move to actually update
        }

        // Perform drag update based on type
        if (editDragState.current.dragType === 'vertex' && editDragState.current.vertexIndex !== undefined) {
          calculateVertexDrag({
            room: selectedRoom,
            vertexIndex: editDragState.current.vertexIndex,
            worldPoint,
            dragState: editDragState.current,
            gridSnapEnabled: config.snapEnabled,
            gridSize: config.size
          }).then(result => {
            updateRoom(selectedRoom.id, result);
          });
          return;
        } else if (editDragState.current.dragType === 'aperture' && editDragState.current.apertureId) {
          // Aperture drag - detect target wall across ALL rooms
          let targetWallIndex: number | null = null;
          let targetRoomId: string | null = null;
          let minDistance = Infinity;

          // Store current world point for rendering ghost
          editDragCurrentWorldPoint.current = worldPoint;

          // Check walls on ALL rooms (not just selected room) - find closest wall
          for (const room of rooms) {
            const vertexArray = room.vertices;
            const n = vertexArray.length;

            for (let i = 0; i < room.walls.length; i++) {
              const wall = room.walls[i];

              if (wall.vertexIndex >= n) continue;

              const v1Local = vertexArray[wall.vertexIndex];
              const v2Local = vertexArray[(wall.vertexIndex + 1) % n];
              const v1World = localToWorld(v1Local, room.position, room.rotation, room.scale);
              const v2World = localToWorld(v2Local, room.position, room.rotation, room.scale);

              // Check if mouse is close to this wall edge
              const dx = v2World.x - v1World.x;
              const dy = v2World.y - v1World.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len === 0) continue;

              const t = Math.max(0, Math.min(1, ((worldPoint.x - v1World.x) * dx + (worldPoint.y - v1World.y) * dy) / (len * len)));
              const projX = v1World.x + t * dx;
              const projY = v1World.y + t * dy;
              const dist = Math.sqrt((worldPoint.x - projX) ** 2 + (worldPoint.y - projY) ** 2);

              // Keep track of closest wall across all rooms
              if (dist < minDistance && dist < 30) {
                minDistance = dist;
                targetWallIndex = i;
                targetRoomId = room.id;
              }
            }
          }

          // Store target wall AND room in drag state for use in mouseUp and rendering
          editDragState.current = {
            ...editDragState.current,
            targetWallIndex,
            targetRoomId
          };

          return;
        } else if (editDragState.current.dragType === 'edge' && editDragState.current.edgeIndex !== undefined) {
          const result = calculateEdgeDrag({
            room: selectedRoom,
            edgeIndex: editDragState.current.edgeIndex,
            worldPoint,
            dragState: editDragState.current,
            gridSnapEnabled: config.snapEnabled,
            gridSize: config.size
          });
          updateRoom(selectedRoom.id, result);
          return;
        } else if (editDragState.current.dragType === 'wall' && editDragState.current.wallIndex !== undefined) {
          const result = calculateWallDrag({
            room: selectedRoom,
            wallIndex: editDragState.current.wallIndex,
            worldPoint,
            dragState: editDragState.current,
            gridSnapEnabled: config.snapEnabled,
            gridSize: config.size
          });
          updateRoom(selectedRoom.id, result);
          return;
        }
      }

      // Update hover state for vertices/edges/walls
      if (selectedRoom) {
        const vertexIndex = hitTestRoomVertices(worldPoint, selectedRoom, 20, viewport.zoom);
        if (vertexIndex !== -1) {
          setHoverVertex(vertexIndex);
          return;
        }

        // Check external wall hover first
        const externalWallIndex = hitTestExternalWalls(worldPoint, selectedRoom);
        if (externalWallIndex !== -1) {
          setHoverWall(externalWallIndex);
          return;
        }

        // Check wall hover before edge (same priority as click)
        const wallIndex = hitTestRoomWalls(worldPoint, selectedRoom);
        if (wallIndex !== -1) {
          setHoverWall(wallIndex);
          return;
        }

        const edgeIndex = hitTestRoomEdges(worldPoint, selectedRoom);
        if (edgeIndex !== -1) {
          setHoverEdge(edgeIndex);
          return;
        }

        setHoverVertex(null);
        setHoverEdge(null);
        setHoverWall(null);
      }
      return;
    }

    // Assembly mode - update room drag, rotation, or selection rectangle
    if (editorMode === EditorMode.Assembly) {
      // Update selection rectangle if selecting
      if (selectionRectangle.isSelecting) {
        setSelectionRectangle(prev => ({
          ...prev,
          currentPoint: worldPoint
        }));
        return;
      }

      const selectedRoom = getSelectedRoom();
      const selectedRoomId = getFirstSelectedRoomId();

      console.log('🖱️ Assembly mouse move:', {
        hasSelectedRoom: !!selectedRoom,
        selectedRoomId,
        dragType: assemblyDragState.current.dragType,
        hasScreenStart: !!assemblyDragScreenStart.current
      });

      if (selectedRoom && selectedRoomId && assemblyDragState.current.dragType !== null && assemblyDragScreenStart.current) {
        console.log('✅ In drag mode, type:', assemblyDragState.current.dragType);
        if (assemblyDragState.current.dragType === 'rotation') {
          // Update rotation using utility function
          const newRotation = calculateRoomRotation({
            room: selectedRoom,
            worldPoint,
            snapEnabled: config.snapEnabled
          });
          console.log('🔄 Rotating room to:', (newRotation * 180 / Math.PI).toFixed(1), 'degrees');
          updateRoom(selectedRoomId, { rotation: newRotation });
          return;
        } else if (assemblyDragState.current.dragType === 'room') {
          // Check threshold first
          if (!assemblyDragState.current.isDragging) {
            if (isAssemblyDragThresholdExceeded(assemblyDragScreenStart.current, { x: screenX, y: screenY }, ASSEMBLY_DRAG_THRESHOLD)) {
              assemblyDragState.current = { ...assemblyDragState.current, isDragging: true };
            }
          }

          // Update room drag position using utility function
          if (assemblyDragState.current.startPoint && assemblyDragState.current.originalPosition) {
            const { position, snapResult } = calculateRoomDragPosition({
              originalPosition: assemblyDragState.current.originalPosition,
              startPoint: assemblyDragState.current.startPoint,
              currentPoint: worldPoint,
              gridSnapEnabled: config.snapEnabled,
              gridSize: config.size,
              roomJoiningEnabled: true,
              draggedRoom: { ...selectedRoom, position: assemblyDragState.current.originalPosition, rotation: assemblyDragState.current.originalRotation || selectedRoom.rotation },
              allRooms: rooms,
              visualizationOnly: true
            });

            lastSnapResult.current = snapResult;
            updateRoom(selectedRoomId, { position });
          }
          return;
        }
      }

      // Update hover state for rooms
      const hit = findBestHit(worldPoint, rooms);
      if (hit && hit.roomId) {
        setHoverRoom(hit.roomId);
      } else {
        setHoverRoom(null);
      }
      return;
    }
  }, [editorMode, viewport, drawing, selection, rooms, getSelectedRoom, getFirstSelectedRoomId, config, selectionRectangle, updateRoom, setHoverRoom, setHoverVertex, setHoverEdge, setHoverWall, panViewport, isPanning, panStartPoint, setCurrentMouseWorld, clearLongPressTimer]);

  /**
   * Mouse up handler
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const screenX = rect ? e.clientX - rect.left : 0;
    const screenY = rect ? e.clientY - rect.top : 0;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport);

    // Handle long press release for paste operation on wall
    if (editorMode === EditorMode.Edit && isLongPressing.current && longPressStartPos.current && apertureClipboard) {
      const dx = screenX - longPressStartPos.current.x;
      const dy = screenY - longPressStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only trigger paste if movement was below threshold (user held still)
      if (distance <= LONG_PRESS_MOVE_THRESHOLD) {
        console.log('⏱️ Long press released - checking for wall paste');

        // Find closest wall across ALL rooms
        let targetRoomId: string | null = null;
        let targetWallIndex: number | null = null;
        let minDistance = Infinity;
        let targetDistance = 0;
        let targetAnchor: 'start' | 'end' = 'start';

        for (const room of rooms) {
          const vertexArray = room.vertices;
          const n = vertexArray.length;

          for (let i = 0; i < room.walls.length; i++) {
            const wall = room.walls[i];
            if (wall.vertexIndex >= n) continue;

            const v1Local = vertexArray[wall.vertexIndex];
            const v2Local = vertexArray[(wall.vertexIndex + 1) % n];
            const v1World = localToWorld(v1Local, room.position, room.rotation, room.scale);
            const v2World = localToWorld(v2Local, room.position, room.rotation, room.scale);

            const dx = v2World.x - v1World.x;
            const dy = v2World.y - v1World.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) continue;

            const t = Math.max(0, Math.min(1, ((worldPoint.x - v1World.x) * dx + (worldPoint.y - v1World.y) * dy) / (len * len)));
            const projX = v1World.x + t * dx;
            const projY = v1World.y + t * dy;
            const dist = Math.sqrt((worldPoint.x - projX) ** 2 + (worldPoint.y - projY) ** 2);

            if (dist < minDistance && dist < 30) {
              minDistance = dist;
              targetRoomId = room.id;
              targetWallIndex = i;

              // Calculate position on wall
              const positionPx = t * len;
              const distanceFromStartPx = positionPx;
              const distanceFromEndPx = len - positionPx;

              if (distanceFromStartPx < distanceFromEndPx) {
                targetAnchor = 'start';
                targetDistance = distanceFromStartPx / 100;
              } else {
                targetAnchor = 'end';
                targetDistance = distanceFromEndPx / 100;
              }
            }
          }
        }

        if (targetRoomId && targetWallIndex !== null) {
          console.log(`📌 Pasting aperture to room ${targetRoomId} wall ${targetWallIndex}`);
          pasteAperture(targetRoomId, targetWallIndex, targetDistance, targetAnchor);

          // Show visual feedback
          showVisualFeedback('Aperture Pasted', screenX, screenY);
        }
      }

      // Clear long press state
      clearLongPressTimer();
      return;
    }

    // Clear long press timer if still active (user released without completing long press)
    if (isLongPressing.current) {
      clearLongPressTimer();
    }

    // Complete rectangle selection
    if (selectionRectangle.isSelecting && selectionRectangle.startPoint && selectionRectangle.currentPoint) {
      const start = selectionRectangle.startPoint;
      const end = selectionRectangle.currentPoint;

      // Calculate rectangle bounds
      const rectMin = {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y)
      };
      const rectMax = {
        x: Math.max(start.x, end.x),
        y: Math.max(start.y, end.y)
      };

      // Find all rooms that intersect with the rectangle
      const selectedRoomIds: string[] = [];
      for (const room of rooms) {
        // Transform room vertices to world coordinates
        const worldVertices = room.vertices.map(v =>
          localToWorld(v, room.position, room.rotation, room.scale)
        );

        if (polygonIntersectsRectangle(worldVertices, rectMin, rectMax)) {
          selectedRoomIds.push(room.id);
        }
      }

      // Update selection
      if (selectedRoomIds.length > 0) {
        selectRooms(selectedRoomIds);
      } else if (!e.shiftKey) {
        clearAllSelection();
      }

      // Clear rectangle selection state
      setSelectionRectangle({
        isSelecting: false,
        startPoint: null,
        currentPoint: null
      });

      return;
    }

    // Stop panning
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      stopPanning();
      setPanStartPoint(null);
    }

    // End edit mode dragging
    if (editorMode === EditorMode.Edit && editDragState.current.dragType !== null) {
      const selectedRoom = getSelectedRoom();

      if (editDragState.current.dragType === 'vertex') {
        // Update originalVertices after manual drag completes
        if (selectedRoom && editDragState.current.isDragging) {
          updateRoom(selectedRoom.id, {
            originalVertices: selectedRoom.vertices.map(v => ({ ...v }))
          });
        }
        // Only clear vertex selection if we actually dragged
        // If just clicked (not dragged), keep vertex selected so user can delete it
        if (editDragState.current.isDragging) {
          clearVertexSelection();
        }
      } else if (editDragState.current.dragType === 'edge' || editDragState.current.dragType === 'wall') {
        // Update originalVertices after manual drag completes
        if (selectedRoom) {
          updateRoom(selectedRoom.id, {
            originalVertices: selectedRoom.vertices.map(v => ({ ...v }))
          });
        }

        // Clear selection based on drag type
        if (editDragState.current.wallIndex !== undefined) {
          if (editDragState.current.isDragging) {
            clearWallSelection();
          }
          // If just clicked (not dragged), keep wall selected
        } else if (editDragState.current.edgeIndex !== undefined) {
          clearEdgeSelection();
        }
      } else if (editDragState.current.dragType === 'aperture' && editDragState.current.isDragging) {
        // Handle aperture drop (supports cross-room moves)
        const apertureId = editDragState.current.apertureId;
        const sourceWallIndex = editDragState.current.sourceWallIndex;
        const sourceRoomId = editDragState.current.sourceRoomId;
        const targetWallIndex = editDragState.current.targetWallIndex;
        const targetRoomId = editDragState.current.targetRoomId;

        if (apertureId !== undefined && sourceWallIndex !== undefined &&
            sourceRoomId && targetRoomId && targetWallIndex !== null && targetWallIndex !== undefined) {

          // Get source and target rooms
          const sourceRoom = rooms.find(r => r.id === sourceRoomId);
          const targetRoom = rooms.find(r => r.id === targetRoomId);

          if (!sourceRoom || !targetRoom) {
            console.warn('Source or target room not found');
            return;
          }

          // Get source wall and aperture info
          const sourceWall = sourceRoom.walls[sourceWallIndex];
          const aperture = sourceWall?.apertures?.find(a => a.id === apertureId);

          if (sourceWall && aperture) {
            // Calculate target position using target room
            const result = calculateApertureDrag({
              worldPoint,
              dragState: editDragState.current,
              targetRoom, // Use target room (can be different from source)
              targetWallIndex
            });

            if (result) {
              // Get target wall vertices to calculate wall length
              const targetWall = targetRoom.walls[result.targetWallIndex];
              const vertexArray = targetRoom.vertices;
              const n = vertexArray.length;

              if (targetWall && targetWall.vertexIndex < n) {
                const v1Local = vertexArray[targetWall.vertexIndex];
                const v2Local = vertexArray[(targetWall.vertexIndex + 1) % n];
                const v1World = localToWorld(v1Local, targetRoom.position, targetRoom.rotation, targetRoom.scale);
                const v2World = localToWorld(v2Local, targetRoom.position, targetRoom.rotation, targetRoom.scale);
                const wallLengthPx = calculateWallLength(v1World, v2World);

                // Validate aperture position
                // For cross-room moves, don't exclude the aperture ID
                const validation = validateAperturePosition({
                  aperture,
                  targetWall,
                  targetDistance: result.newDistance,
                  targetAnchor: result.newAnchor,
                  wallLengthPx,
                  excludeApertureId: (sourceRoomId === targetRoomId && sourceWallIndex === result.targetWallIndex) ? apertureId : undefined
                });

                // Determine which store action to use
                const isSameRoom = sourceRoomId === targetRoomId;

                if (validation.isValid) {
                  // Move aperture to new position
                  if (isSameRoom) {
                    console.log(`✅ Moving aperture ${apertureId} within room ${sourceRoomId} from wall ${sourceWallIndex} to wall ${result.targetWallIndex}`);
                    moveAperture(
                      sourceRoomId,
                      sourceWallIndex,
                      result.targetWallIndex,
                      apertureId,
                      result.newDistance,
                      result.newAnchor
                    );
                  } else {
                    console.log(`✅ Moving aperture ${apertureId} from room ${sourceRoomId} wall ${sourceWallIndex} to room ${targetRoomId} wall ${result.targetWallIndex}`);
                    moveApertureCrossRoom(
                      sourceRoomId,
                      sourceWallIndex,
                      targetRoomId,
                      result.targetWallIndex,
                      apertureId,
                      result.newDistance,
                      result.newAnchor
                    );
                  }
                } else if (validation.reason === 'collision' && validation.suggestedPosition) {
                  // Use suggested position
                  console.log(`⚠️ Collision detected, using suggested position`);
                  if (isSameRoom) {
                    moveAperture(
                      sourceRoomId,
                      sourceWallIndex,
                      result.targetWallIndex,
                      apertureId,
                      validation.suggestedPosition.distance,
                      validation.suggestedPosition.anchor
                    );
                  } else {
                    moveApertureCrossRoom(
                      sourceRoomId,
                      sourceWallIndex,
                      targetRoomId,
                      result.targetWallIndex,
                      apertureId,
                      validation.suggestedPosition.distance,
                      validation.suggestedPosition.anchor
                    );
                  }
                } else {
                  // Invalid position - revert (do nothing, aperture stays in place)
                  console.warn(`❌ Cannot place aperture: ${validation.reason}`);
                  // TODO: Show modal for width adjustment or restore to original position
                }
              }
            }
          }
        }
      }

      // Recalculate envelopes after drag completes (only if we actually dragged)
      if (editDragState.current.isDragging && recalculateAllEnvelopes) {
        recalculateAllEnvelopes();
      }

      // Clear edit drag state
      editDragState.current = {
        isDragging: false,
        dragType: null,
        startPoint: null
      };
      editDragScreenStart.current = null;
      editDragCurrentWorldPoint.current = null;
    }

    // End assembly mode dragging or rotation
    if (editorMode === EditorMode.Assembly && assemblyDragState.current.dragType !== null) {
      if (assemblyDragState.current.dragType === 'rotation') {
        // No need to regenerate walls - rotation doesn't change vertex IDs or local coordinates
        const selectedRoomId = getFirstSelectedRoomId();

        if (selectedRoomId) {
          console.log('✅ Rotation complete - walls preserved (vertex IDs stable)');

          // Recalculate envelopes
          if (recalculateAllEnvelopes) {
            setTimeout(async () => await recalculateAllEnvelopes(), 0);
          }
        }

        // Clear the drag state for rotation
        assemblyDragState.current = {
          isDragging: false,
          dragType: null,
          startPoint: null
        };
        assemblyDragScreenStart.current = null;
      } else if (assemblyDragState.current.dragType === 'room') {
        const selectedRoomId = getFirstSelectedRoomId();
        const selectedRoom = getSelectedRoom();

        // Apply final snap transformation if room joining is enabled
        if (lastSnapResult.current && lastSnapResult.current.snapped && selectedRoomId && selectedRoom &&
            assemblyDragState.current.startPoint && assemblyDragState.current.originalPosition &&
            assemblyDragState.current.originalRotation !== undefined) {
          const finalSnap = calculateFinalRoomSnap({
            draggedRoom: selectedRoom,
            originalPosition: assemblyDragState.current.originalPosition,
            originalRotation: assemblyDragState.current.originalRotation,
            startPoint: assemblyDragState.current.startPoint,
            endPoint: worldPoint,
            allRooms: rooms
          });

          if (finalSnap && finalSnap.snapped) {
            const updates: Partial<Room> = { position: finalSnap.position };

            // If rotation changed, just update rotation - walls stay valid (vertex IDs stable)
            if (finalSnap.rotation !== undefined) {
              updates.rotation = finalSnap.rotation;
              console.log('✅ Room snap with rotation - walls preserved (vertex IDs stable)');
            }

            updateRoom(selectedRoomId, updates);
          }
        }

        // Clear assembly state
        assemblyDragState.current = {
          isDragging: false,
          dragType: null,
          startPoint: null
        };
        assemblyDragScreenStart.current = null;
        assemblyGuideLines.current = [];
        lastSnapResult.current = null;

        // Recalculate envelopes after drag
        if (recalculateAllEnvelopes) {
          setTimeout(async () => await recalculateAllEnvelopes(), 0);
        }
      }
    }
  }, [spacePressed, viewport, editorMode, selectionRectangle, rooms, selection, getSelectedRoom, getFirstSelectedRoomId, updateRoom, clearVertexSelection, clearEdgeSelection, clearWallSelection, selectRooms, clearAllSelection, stopPanning, recalculateAllEnvelopes, apertureClipboard, pasteAperture, showVisualFeedback, clearLongPressTimer]);

  /**
   * Setup wheel zoom with passive: false
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      zoomViewport(e.deltaY, { x: mouseX, y: mouseY });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [viewport]);

  /**
   * Get cursor style
   */
  const getCursor = (): string => {
    if (isPanning || spacePressed) return 'grabbing';
    if (editorMode === EditorMode.Draw) return 'crosshair';
    if (editorMode === EditorMode.Edit) return 'pointer';
    if (editorMode === EditorMode.Assembly) return 'move';
    return 'default';
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: getCursor(),
          touchAction: 'none',
          backgroundColor: '#313435'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Dimension input overlay */}
      {editableDimensions.editingDimension && (
        <>
          {console.log('Rendering DimensionInput with:', editableDimensions.editingDimension)}
          <DimensionInput
            position={editableDimensions.editingDimension.position}
            currentValue={editableDimensions.editingDimension.currentValue}
            onSubmit={handleDimensionSubmit}
            onCancel={handleDimensionCancel}
          />
        </>
      )}

      {/* Visual feedback overlay for copy/paste operations */}
      {visualFeedback && visualFeedback.show && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: visualFeedback.position.x,
            top: visualFeedback.position.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}
        >
          <div
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce"
            style={{
              animation: 'fadeInOut 1.5s ease-in-out'
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="font-medium">{visualFeedback.message}</span>
          </div>
        </div>
      )}
    </>
  );
};
