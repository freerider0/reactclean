/**
 * Canvas component - main canvas for floorplan editor
 * Handles rendering and user interactions
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EditorMode, ToolMode, Vertex, SelectionRectangleState } from '../types';
import { screenToWorld, worldToScreen, localToWorld } from '../utils/coordinates';
import {
  clearCanvas,
  drawGrid,
  drawRoom,
  drawWalls,
  drawDrawingPreview,
  drawGuideLine,
  drawVertexHandles,
  drawEdgeHandles,
  drawRotationHandle,
  drawDimensionLabels,
  drawRoomSnapIndicators,
  drawConstraintIndicators
} from '../utils/rendering';
import {
  hitTestRoomVertices,
  hitTestRoomEdges,
  hitTestRoomWalls,
  hitTestRoom,
  findBestHit,
  hitTestRotationHandle
} from '../utils/hitTesting';
import { polygonIntersectsRectangle } from '../utils/geometry';
import { useFloorplan } from '../hooks/useFloorplan';
import { useEditMode } from '../hooks/useEditMode';
import { useAssemblyMode } from '../hooks/useAssemblyMode';
import { useEditableDimensions } from '../hooks/useEditableDimensions';
import { UseConstraintsResult } from '../hooks/useConstraints';
import { DimensionInput } from './ui/DimensionInput';

interface CanvasProps {
  floorplan: ReturnType<typeof useFloorplan>;
  showDimensions?: boolean;
  constraints?: UseConstraintsResult;
}

export const Canvas: React.FC<CanvasProps> = ({ floorplan, showDimensions = false, constraints }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const {
    rooms,
    editorMode,
    toolMode,
    gridConfig,
    spacePressed,
    viewport,
    drawing,
    selection,
    updateRoom,
    getSelectedRoom,
    enterEditMode,
    enterAssemblyMode
  } = floorplan;

  // Selection rectangle state
  const [selectionRectangle, setSelectionRectangle] = useState<SelectionRectangleState>({
    isSelecting: false,
    startPoint: null,
    currentPoint: null
  });

  // Edit mode hook
  const editMode = useEditMode(
    getSelectedRoom(),
    updateRoom,
    gridConfig.snapEnabled,
    gridConfig.size
  );

  // Assembly mode hook
  const assemblyMode = useAssemblyMode(
    rooms,
    updateRoom,
    gridConfig.snapEnabled,
    gridConfig.size,
    true // roomJoiningEnabled
  );

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
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // Clear canvas
    clearCanvas(ctx, rect.width, rect.height);

    // Clear dimension labels at start of render
    editableDimensions.clearDimensionLabels();

    // Draw grid
    drawGrid(ctx, viewport.viewport, gridConfig, rect.width, rect.height);

    // Draw rooms
    rooms.forEach(room => {
      const isSelected = selection.isRoomSelected(room.id);
      const isHover = selection.selection.hoverRoomId === room.id;

      // Check if this room is involved in snapping (any wall that will snap turns orange)
      let snapSegmentWorld: { p1: Vertex; p2: Vertex } | undefined;
      let snapMode: 'edge-vertex' | 'vertex-only' | 'edge-only' | undefined;

      if (editorMode === EditorMode.Assembly && assemblyMode.lastSnapResult?.snapped) {
        const snapResult = assemblyMode.lastSnapResult;
        // Highlight walls that will snap for both edge-vertex and edge-only modes
        if (snapResult.mode === 'edge-vertex' || snapResult.mode === 'edge-only') {
          if (room.id === snapResult.movingRoomId) {
            snapSegmentWorld = snapResult.movingSegmentWorld;
            snapMode = snapResult.mode;
          } else if (room.id === snapResult.stationaryRoomId) {
            snapSegmentWorld = snapResult.stationarySegmentWorld;
            snapMode = snapResult.mode;
          }
        }
      }

      // Draw room floor
      drawRoom(ctx, room, viewport.viewport, {
        selected: isSelected,
        strokeColor: isSelected ? '#3b82f6' : isHover ? '#60a5fa' : '#64748b'
      });

      // Draw walls
      drawWalls(ctx, room, viewport.viewport, {
        selected: isSelected,
        snapSegmentWorld,
        snapMode,
        selectedWallIndex: editorMode === EditorMode.Edit && isSelected ? selection.selection.selectedWallIndex : undefined,
        hoverWallIndex: editorMode === EditorMode.Edit && isSelected ? selection.selection.hoverWallIndex : undefined
      });

      // Draw dimension labels if enabled
      if (showDimensions) {
        drawDimensionLabels(ctx, room, viewport.viewport, {
          selected: isSelected,
          onRegisterLabel: editableDimensions.registerDimensionLabel
        });
      }

      // Draw constraint indicators (in edit mode) - NEW: Additive constraint visualization
      if (editorMode === EditorMode.Edit && isSelected) {
        drawConstraintIndicators(ctx, room, viewport.viewport);
      }
    });

    // Draw drawing preview (in draw mode)
    if (editorMode === EditorMode.Draw && drawing.drawingState.isDrawing) {
      drawDrawingPreview(
        ctx,
        drawing.drawingState.vertices,
        drawing.drawingState.currentMouseWorld,
        drawing.drawingState.snapPosition,
        viewport.viewport
      );

      // Draw guide line
      if (drawing.drawingState.activeGuideLine) {
        drawGuideLine(ctx, drawing.drawingState.activeGuideLine, viewport.viewport);
      }
    }

    // Draw assembly guide lines (in assembly mode)
    if (editorMode === EditorMode.Assembly && assemblyMode.assemblyGuideLines.length > 0) {
      assemblyMode.assemblyGuideLines.forEach(guideLine => {
        drawGuideLine(ctx, guideLine, viewport.viewport);
      });
    }

    // Draw room joining snap indicators (in assembly mode during drag)
    if (editorMode === EditorMode.Assembly && assemblyMode.lastSnapResult) {
      drawRoomSnapIndicators(ctx, assemblyMode.lastSnapResult, viewport.viewport);
    }

    // Draw selection rectangle (in assembly mode)
    if (editorMode === EditorMode.Assembly && selectionRectangle.isSelecting &&
        selectionRectangle.startPoint && selectionRectangle.currentPoint) {
      const start = worldToScreen(selectionRectangle.startPoint, viewport.viewport);
      const current = worldToScreen(selectionRectangle.currentPoint, viewport.viewport);

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
      const selectedRoom = floorplan.getSelectedRoom();
      if (selectedRoom) {
        // Transform vertices to world coordinates (with full transformation)
        const worldVertices = selectedRoom.vertices.map(v =>
          localToWorld(v, selectedRoom.position, selectedRoom.rotation, selectedRoom.scale)
        );

        drawVertexHandles(ctx, worldVertices, viewport.viewport, {
          selectedIndex: selection.selection.selectedVertexIndex,
          hoverIndex: selection.selection.hoverVertexIndex
        });

        drawEdgeHandles(ctx, worldVertices, viewport.viewport, {
          selectedIndex: selection.selection.selectedEdgeIndex,
          hoverIndex: selection.selection.hoverEdgeIndex
        });
      }
    }

    // Draw rotation handle (in assembly mode)
    if (editorMode === EditorMode.Assembly) {
      const selectedRoom = floorplan.getSelectedRoom();
      if (selectedRoom) {
        drawRotationHandle(ctx, selectedRoom, viewport.viewport, {
          isDragging: assemblyMode.dragState.dragType === 'rotation'
        });
      }
    }
  }, [rooms, editorMode, gridConfig, viewport.viewport.x, viewport.viewport.y, viewport.viewport.zoom, drawing.drawingState, selection, floorplan, assemblyMode.dragState.dragType, assemblyMode.assemblyGuideLines, assemblyMode.lastSnapResult, selectionRectangle, showDimensions, editableDimensions]);

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
  }, [render]);

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport.viewport);

    // Assembly mode - double click on a room to enter edit mode
    if (editorMode === EditorMode.Assembly) {
      // Find which room was clicked
      const hit = findBestHit(worldPoint, rooms);
      if (hit && hit.roomId) {
        // Select the room and enter edit mode
        selection.selectRoom(hit.roomId);
        enterEditMode();
      }
    }

    // Edit mode - add vertex at click position (finds closest edge automatically)
    if (editorMode === EditorMode.Edit) {
      const selectedRoom = getSelectedRoom();
      if (selectedRoom) {
        // Add vertex at click position - addVertexToEdge will find closest edge
        editMode.addVertexToClosestEdge(worldPoint);
      }
    }
  }, [editorMode, viewport, getSelectedRoom, editMode, rooms, selection, enterEditMode]);

  /**
   * Mouse down handler
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport.viewport);

    // Pan with middle mouse or space + click
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      viewport.startPan({ x: screenX, y: screenY });
      e.preventDefault();
      return;
    }

    // Left click
    if (e.button === 0) {
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
        if (!drawing.drawingState.isDrawing) {
          drawing.startDrawing(worldPoint);
        } else {
          drawing.addVertex(worldPoint);
        }
        return;
      }

      // Edit mode - vertex/edge/wall selection and dragging
      if (editorMode === EditorMode.Edit) {
        const selectedRoom = getSelectedRoom();
        if (selectedRoom) {
          // Check vertex hit first (with zoom-aware hit testing)
          const vertexIndex = hitTestRoomVertices(worldPoint, selectedRoom, 20, viewport.viewport.zoom);
          if (vertexIndex !== -1) {
            selection.selectVertex(vertexIndex);
            editMode.startVertexDrag(vertexIndex, worldPoint, { x: screenX, y: screenY });
            return;
          }

          // Check wall hit before edge (so wall inner edge doesn't trigger floor edge selection)
          const wallIndex = hitTestRoomWalls(worldPoint, selectedRoom);
          if (wallIndex !== -1) {
            selection.selectWall(wallIndex);
            editMode.startWallDrag(wallIndex, worldPoint, { x: screenX, y: screenY });
            return;
          }

          // Check edge hit (floor polygon edges)
          const edgeIndex = hitTestRoomEdges(worldPoint, selectedRoom);
          if (edgeIndex !== -1) {
            selection.selectEdge(edgeIndex);
            editMode.startEdgeDrag(edgeIndex, worldPoint, { x: screenX, y: screenY });
            return;
          }
        }

        // No selected room OR clicked outside selected room - try to select a room
        const hit = findBestHit(worldPoint, rooms);
        if (hit && hit.roomId) {
          selection.selectRoom(hit.roomId, e.shiftKey);
          return;
        }

        // Clicked outside any room - exit to Assembly mode
        if (!e.shiftKey) {
          enterAssemblyMode();
        }
        return;
      }

      // Assembly mode - room selection, dragging, and rotation
      if (editorMode === EditorMode.Assembly) {
        const selectedRoom = getSelectedRoom();

        // Check rotation handle first (highest priority)
        if (selectedRoom && hitTestRotationHandle(worldPoint, selectedRoom)) {
          assemblyMode.startRotation(selectedRoom, worldPoint);
          return;
        }

        // Find room at click position
        const hit = findBestHit(worldPoint, rooms);
        if (hit && hit.roomId) {
          const room = rooms.find(r => r.id === hit.roomId);
          if (room) {
            selection.selectRoom(room.id, e.shiftKey);
            assemblyMode.startRoomDrag(room, worldPoint, { x: screenX, y: screenY });
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
          selection.clearSelection();
        }
        return;
      }
    }
  }, [editorMode, toolMode, spacePressed, viewport, drawing, selection, rooms, getSelectedRoom, editMode, assemblyMode, enterAssemblyMode]);

  /**
   * Mouse move handler
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport.viewport);

    // Update panning
    if (viewport.updatePan({ x: screenX, y: screenY })) {
      return;
    }

    // Update drawing preview
    if (editorMode === EditorMode.Draw && drawing.drawingState.isDrawing) {
      drawing.updateMousePosition(worldPoint);
      return;
    }

    // Edit mode - update vertex/edge drag
    if (editorMode === EditorMode.Edit) {
      const selectedRoom = getSelectedRoom();

      // Check if we're dragging (or about to start dragging)
      if (selectedRoom && editMode.dragState.dragType !== null) {
        if (editMode.dragState.dragType === 'vertex' && selection.selection.selectedVertexIndex !== null) {
          editMode.updateVertexDrag(selection.selection.selectedVertexIndex, worldPoint, { x: screenX, y: screenY });
          return;
        } else if (editMode.dragState.dragType === 'edge') {
          // Edge drag can be from either an edge handle or a wall
          if (selection.selection.selectedEdgeIndex !== null) {
            editMode.updateEdgeDrag(selection.selection.selectedEdgeIndex, worldPoint, { x: screenX, y: screenY });
            return;
          } else if (selection.selection.selectedWallIndex !== null) {
            editMode.updateWallDrag(selection.selection.selectedWallIndex, worldPoint, { x: screenX, y: screenY });
            return;
          }
        }
      }

      // Update hover state for vertices/edges/walls
      if (selectedRoom) {
        const vertexIndex = hitTestRoomVertices(worldPoint, selectedRoom, 20, viewport.viewport.zoom);
        if (vertexIndex !== -1) {
          selection.setHoverVertex(vertexIndex);
          return;
        }

        // Check wall hover before edge (same priority as click)
        const wallIndex = hitTestRoomWalls(worldPoint, selectedRoom);
        if (wallIndex !== -1) {
          selection.setHoverWall(wallIndex);
          return;
        }

        const edgeIndex = hitTestRoomEdges(worldPoint, selectedRoom);
        if (edgeIndex !== -1) {
          selection.setHoverEdge(edgeIndex);
          return;
        }

        selection.setHoverVertex(null);
        selection.setHoverEdge(null);
        selection.setHoverWall(null);
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
      const selectedRoomId = selection.getFirstSelectedRoomId();

      if (selectedRoom && selectedRoomId && assemblyMode.dragState.dragType !== null) {
        if (assemblyMode.dragState.dragType === 'rotation') {
          // Update rotation
          assemblyMode.updateRotation(selectedRoomId, selectedRoom, worldPoint, gridConfig.snapEnabled);
          return;
        } else if (assemblyMode.dragState.dragType === 'room') {
          // Update room drag
          assemblyMode.updateRoomDrag(selectedRoomId, worldPoint, { x: screenX, y: screenY });
          return;
        }
      }

      // Update hover state for rooms
      const hit = findBestHit(worldPoint, rooms);
      if (hit && hit.roomId) {
        selection.setHoverRoom(hit.roomId);
      } else {
        selection.setHoverRoom(null);
      }
      return;
    }
  }, [editorMode, viewport, drawing, editMode, assemblyMode, selection, rooms, getSelectedRoom, gridConfig.snapEnabled, selectionRectangle]);

  /**
   * Mouse up handler
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const screenX = rect ? e.clientX - rect.left : 0;
    const screenY = rect ? e.clientY - rect.top : 0;
    const worldPoint = screenToWorld({ x: screenX, y: screenY }, viewport.viewport);

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
        selection.selectRooms(selectedRoomIds);
      } else if (!e.shiftKey) {
        selection.clearSelection();
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
      viewport.endPan();
    }

    // End edit mode dragging
    if (editorMode === EditorMode.Edit && editMode.dragState.dragType !== null) {
      if (editMode.dragState.dragType === 'vertex') {
        editMode.endVertexDrag();
        selection.clearVertexSelection();
      } else if (editMode.dragState.dragType === 'edge') {
        // Check if it was a wall drag or edge drag
        if (selection.selection.selectedWallIndex !== null) {
          // Only clear wall selection if we actually dragged (moved more than threshold)
          if (editMode.dragState.isDragging) {
            editMode.endWallDrag();
            selection.clearWallSelection();
          } else {
            // Just clicked, keep wall selected
            editMode.endWallDrag();
          }
        } else if (selection.selection.selectedEdgeIndex !== null) {
          editMode.endEdgeDrag();
          selection.clearEdgeSelection();
        }
      }
    }

    // End assembly mode dragging or rotation
    if (editorMode === EditorMode.Assembly && assemblyMode.dragState.dragType !== null) {
      if (assemblyMode.dragState.dragType === 'rotation') {
        assemblyMode.endRotation();
      } else if (assemblyMode.dragState.dragType === 'room') {
        const selectedRoomId = selection.getFirstSelectedRoomId();
        assemblyMode.endRoomDrag(selectedRoomId || undefined, worldPoint);
      }
    }
  }, [spacePressed, viewport, editorMode, editMode, assemblyMode, selectionRectangle, rooms, selection]);

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

      viewport.handleWheel(e.deltaY, { x: mouseX, y: mouseY });
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
    if (viewport.isPanning || spacePressed) return 'grabbing';
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
