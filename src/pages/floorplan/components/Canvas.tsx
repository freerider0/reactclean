/**
 * Canvas component - main canvas for floorplan editor
 * Handles rendering and user interactions
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { EditorMode, ToolMode, Vertex, SelectionRectangleState, Room } from '../types';
import { screenToWorld, worldToScreen, localToWorld, worldToLocal } from '../utils/coordinates';
import {
  clearCanvas,
  drawGrid,
  drawRoom,
  drawWalls,
  drawEnvelope,
  drawExternalWalls,
  drawApertures,
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
import { generateWalls } from '../utils/walls';
import { useFloorplanStore, selectAllRooms } from '../store/floorplanStore';
import { useEditableDimensions } from '../hooks/useEditableDimensions';
import { UseConstraintsResult } from '../hooks/useConstraints';
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
  isDragThresholdExceeded as isEditDragThresholdExceeded,
  DRAG_THRESHOLD as EDIT_DRAG_THRESHOLD
} from '../utils/editing';
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
  constraints?: UseConstraintsResult;
}

export const Canvas: React.FC<CanvasProps> = ({ showDimensions = false, constraints }) => {
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
  const getSelectedRoom = useFloorplanStore(state => state.getSelectedRoom);
  const setEditorMode = useFloorplanStore(state => state.setEditorMode);
  const recalculateAllEnvelopes = useFloorplanStore(state => state.recalculateAllEnvelopes);
  const selectRoom = useFloorplanStore(state => state.selectRoom);
  const selectVertex = useFloorplanStore(state => state.selectVertex);
  const selectEdge = useFloorplanStore(state => state.selectEdge);
  const selectAperture = useFloorplanStore(state => state.selectAperture);
  const clearAllSelection = useFloorplanStore(state => state.clearAllSelection);
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

  // Edit mode drag state (use refs for animation loop access)
  const editDragState = useRef<EditDragState>({
    isDragging: false,
    dragType: null,
    startPoint: null
  });
  const editDragScreenStart = useRef<{ x: number; y: number } | null>(null);

  // Assembly mode drag state (use refs for animation loop access)
  const assemblyDragState = useRef<AssemblyDragState>({
    isDragging: false,
    dragType: null,
    startPoint: null
  });
  const assemblyDragScreenStart = useRef<{ x: number; y: number } | null>(null);
  const assemblyGuideLines = useRef<GuideLine[]>([]);
  const lastSnapResult = useRef<RoomSnapResult | null>(null);

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
      if (showDimensions) {
        drawDimensionLabels(ctx, room, viewport, {
          selected: isSelected,
          onRegisterLabel: editableDimensions.registerDimensionLabel
        });
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
    if (!editableDimensions.editingDimension || !constraints) {
      editableDimensions.cancelEditingDimension();
      return;
    }

    const { roomId, edgeIndex } = editableDimensions.editingDimension;

    // Get wall vertices
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      editableDimensions.cancelEditingDimension();
      return;
    }

    const v1Index = edgeIndex;
    const v2Index = (edgeIndex + 1) % room.vertices.length;

    // Add distance constraint
    constraints.addDistanceConstraint(roomId, v1Index, v2Index, newValueCm);

    // Clear editing state
    editableDimensions.cancelEditingDimension();
  }, [editableDimensions, constraints, rooms]);

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
      if (showDimensions) {
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
          addDrawingVertex(firstVertex);
          setSnapPosition(firstVertex);
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

          // Add the snapped vertex
          console.log('➕ Adding vertex at:', snapPos);
          addDrawingVertex(snapPos);
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
            selectVertex(vertexIndex);
            editDragState.current = createVertexDragState(selectedRoom, vertexIndex, worldPoint);
            editDragScreenStart.current = { x: screenX, y: screenY };
            return;
          }
        }

        // Second priority: Check ALL room envelopes to see if click is in any envelope area
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
  }, [editorMode, toolMode, spacePressed, viewport, drawing, selection, rooms, getSelectedRoom, selectRoom, selectVertex, selectEdge, setEditorMode, clearAllSelection, startDrawing, addDrawingVertex, startPanning, updateRoom, recalculateAllEnvelopes]);

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
  }, [editorMode, viewport, drawing, selection, rooms, getSelectedRoom, getFirstSelectedRoomId, config, selectionRectangle, updateRoom, setHoverRoom, setHoverVertex, setHoverEdge, setHoverWall, panViewport, isPanning, panStartPoint, setCurrentMouseWorld]);

  /**
   * Mouse up handler
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const screenX = rect ? e.clientX - rect.left : 0;
    const screenY = rect ? e.clientY - rect.top : 0;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport);

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
    }

    // End assembly mode dragging or rotation
    if (editorMode === EditorMode.Assembly && assemblyDragState.current.dragType !== null) {
      if (assemblyDragState.current.dragType === 'rotation') {
        // Regenerate walls after rotation
        const selectedRoomId = getFirstSelectedRoomId();
        const selectedRoom = getSelectedRoom();

        if (selectedRoomId && selectedRoom) {
          console.log('🔄 Regenerating walls after rotation...');

          // Regenerate walls with current rotation-affected geometry
          const newWalls = generateWalls(
            selectedRoom.vertices,
            selectedRoom.wallThickness,
            selectedRoom.walls  // Pass existing walls to preserve properties
          );

          // Update room with regenerated walls
          updateRoom(selectedRoomId, { walls: newWalls });

          // Recalculate envelopes
          if (recalculateAllEnvelopes) {
            setTimeout(async () => await recalculateAllEnvelopes(), 0);
          }

          console.log('✅ Walls regenerated after rotation');
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

            // If rotation changed, regenerate walls
            if (finalSnap.rotation !== undefined) {
              updates.rotation = finalSnap.rotation;

              console.log('🔄 Regenerating walls after room snap with rotation...');
              const newWalls = generateWalls(
                selectedRoom.vertices,
                selectedRoom.wallThickness,
                selectedRoom.walls
              );
              updates.walls = newWalls;
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
  }, [spacePressed, viewport, editorMode, selectionRectangle, rooms, selection, getSelectedRoom, getFirstSelectedRoomId, updateRoom, clearVertexSelection, clearEdgeSelection, clearWallSelection, selectRooms, clearAllSelection, stopPanning, recalculateAllEnvelopes]);

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
    </>
  );
};
