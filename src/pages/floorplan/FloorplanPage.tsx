/**
 * FloorplanPage - main page component for the floorplan editor
 * Clean React-first architecture with hooks
 */

import React, { useEffect, useState } from 'react';
import { useFloorplan } from './hooks/useFloorplan';
import { Canvas } from './components/Canvas';
import { ModeSelectorBar } from './components/ui/ModeSelectorBar';
import {
  RoomInfoDisplay,
  ViewControlButtons,
  BottomControlBar,
  ZoomPercentage,
  ExportImportButtons
} from './components/ui/SimpleComponents';
import { EditorMode } from './types';
import { generateWalls } from './utils/walls';

export const FloorplanPage: React.FC = () => {
  const floorplan = useFloorplan();
  const [showDimensions, setShowDimensions] = useState(false);

  /**
   * Keyboard event handlers
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space key for panning
      if (e.code === 'Space' && !floorplan.spacePressed) {
        floorplan.setSpacePressed(true);
        e.preventDefault();
      }

      // Escape to cancel drawing or clear selection
      if (e.code === 'Escape') {
        if (floorplan.drawing.drawingState.isDrawing) {
          floorplan.drawing.cancelDrawing();
        } else {
          floorplan.selection.clearSelection();
        }
      }

      // Delete key
      if (e.code === 'Delete' || e.code === 'Backspace') {
        // In edit mode - delete selected vertex
        if (floorplan.editorMode === EditorMode.Edit && floorplan.selection.selection.selectedVertexIndex !== null) {
          const selectedRoom = floorplan.getSelectedRoom();
          if (selectedRoom && selectedRoom.vertices.length > 3) {
            const newVertices = selectedRoom.vertices.filter((_, i) => i !== floorplan.selection.selection.selectedVertexIndex);
            const newWalls = generateWalls(newVertices, selectedRoom.wallThickness);
            floorplan.updateRoom(selectedRoom.id, { vertices: newVertices, walls: newWalls });
            floorplan.selection.selectVertex(null as any); // Clear selection
          }
          e.preventDefault();
          return;
        }

        // In assembly mode - delete selected rooms
        if (floorplan.selection.selection.selectedRoomIds.length > 0) {
          floorplan.deleteSelectedRooms();
          e.preventDefault();
        }
      }

      // Mode switching
      if (e.code === 'Digit1' || e.code === 'KeyD') {
        floorplan.enterDrawMode();
      }
      if (e.code === 'Digit2' || e.code === 'KeyE') {
        floorplan.enterEditMode();
      }
      if (e.code === 'Digit3' || e.code === 'KeyA') {
        floorplan.enterAssemblyMode();
      }

      // Grid toggle
      if (e.code === 'KeyG') {
        floorplan.toggleGrid();
      }

      // Snap toggle
      if (e.code === 'KeyS') {
        floorplan.toggleGridSnap();
      }

      // Undo/Redo
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          // Ctrl+Shift+Z = Redo
          floorplan.redo();
        } else {
          // Ctrl+Z = Undo
          floorplan.undo();
        }
        e.preventDefault();
      }

      // Copy/Paste
      if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        floorplan.copySelectedRooms();
        e.preventDefault();
      }

      if (e.code === 'KeyV' && (e.ctrlKey || e.metaKey)) {
        floorplan.pasteRooms();
        e.preventDefault();
      }

      // Undo last vertex (while drawing)
      if (e.code === 'Backspace' && floorplan.drawing.drawingState.isDrawing) {
        floorplan.drawing.undoLastVertex();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space key release
      if (e.code === 'Space') {
        floorplan.setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [floorplan]);

  // Zoom controls
  const handleZoomIn = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    floorplan.viewport.setZoom(floorplan.viewport.viewport.zoom * 1.2, { x: centerX, y: centerY });
  };

  const handleZoomOut = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    floorplan.viewport.setZoom(floorplan.viewport.viewport.zoom * 0.8, { x: centerX, y: centerY });
  };

  const handleResetView = () => {
    floorplan.viewport.resetViewport();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50">
      {/* Canvas */}
      <Canvas floorplan={floorplan} showDimensions={showDimensions} />

      {/* Mode Selector Bar (Top Center) */}
      <ModeSelectorBar
        mode={floorplan.editorMode}
        setMode={(mode) => {
          if (mode === EditorMode.Draw) floorplan.enterDrawMode();
          else if (mode === EditorMode.Edit) floorplan.enterEditMode();
          else if (mode === EditorMode.Assembly) floorplan.enterAssemblyMode();
        }}
        canEdit={floorplan.selection.selection.selectedRoomIds.length > 0}
      />

      {/* Export/Import Buttons (Top Left) */}
      <ExportImportButtons
        onExport={floorplan.exportFloorplan}
        onImport={floorplan.importFloorplan}
      />

      {/* Room Info (Top Left, below export/import) */}
      <div className="absolute top-28 left-4">
        <RoomInfoDisplay roomCount={floorplan.rooms.length} />
      </div>

      {/* View Controls (Top Right) */}
      <ViewControlButtons
        viewport={floorplan.viewport.viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
      />

      {/* Bottom Control Bar */}
      <BottomControlBar
        gridEnabled={floorplan.gridConfig.enabled}
        onToggleGrid={floorplan.toggleGrid}
        snapEnabled={floorplan.gridConfig.snapEnabled}
        onToggleSnap={floorplan.toggleGridSnap}
        showDimensions={showDimensions}
        onToggleDimensions={() => setShowDimensions(!showDimensions)}
      />

      {/* Zoom Percentage (Bottom Right) */}
      <ZoomPercentage zoom={floorplan.viewport.viewport.zoom} />
    </div>
  );
};
