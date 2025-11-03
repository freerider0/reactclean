/**
 * FloorplanPage - main page component for the floorplan editor
 * Clean React-first architecture with hooks
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFloorplan } from './hooks/useFloorplan';
import { useConstraints } from './hooks/useConstraints';
import { Canvas } from './components/Canvas';
import { ModeSelectorBar } from './components/ui/ModeSelectorBar';
import {
  RoomInfoDisplay,
  ViewControlButtons,
  BottomControlBar,
  ZoomPercentage,
  ExportImportButtons
} from './components/ui/SimpleComponents';
import { WallPropertiesPanel } from './components/ui/WallPropertiesPanel';
import { ConstraintToolbar } from './components/ui/ConstraintToolbar';
import { EditorMode } from './types';
import { generateWalls } from './utils/walls';

interface LocationState {
  propertyId?: string;
  propertyData?: {
    direccion?: string;
    numero?: string;
    piso?: string;
    ciudad?: string;
    referenciaCatastral?: string;
  };
  returnTo?: string;
}

export const FloorplanPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState;

  // Get property data from navigation state
  const propertyId = locationState?.propertyId;
  const propertyData = locationState?.propertyData;
  const returnTo = locationState?.returnTo;

  const floorplan = useFloorplan(propertyId); // Pass propertyId to hook
  const [showDimensions, setShowDimensions] = useState(true); // Show dimensions by default

  // Log property context
  useEffect(() => {
    if (propertyId) {
      console.log('🏗️ FloorplanPage loaded with property context:');
      console.log('  Property ID:', propertyId);
      console.log('  Property Data:', propertyData);
      console.log('  Return To:', returnTo);
    } else {
      console.log('🏗️ FloorplanPage loaded without property context (standalone mode)');
    }
  }, [propertyId, propertyData, returnTo]);

  // Constraint management hook - NEW: Additive constraint functionality
  const constraints = useConstraints({
    rooms: floorplan.rooms,
    selectedRoomId: floorplan.selection.selection.selectedRoomIds[0] || null,
    updateRoom: floorplan.updateRoom
  });

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
            // Preserve existing wall properties when regenerating (pass old vertices for matching)
            const newWalls = generateWalls(newVertices, selectedRoom.wallThickness, selectedRoom.walls, selectedRoom.vertices);
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

  // Wall properties panel handlers
  const handleUpdateWallThickness = (wallIndex: number, thickness: number) => {
    const selectedRoom = floorplan.getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      thickness
    };

    floorplan.updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleUpdateWallType = (wallIndex: number, wallType: string) => {
    const selectedRoom = floorplan.getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      wallType: wallType as any
    };

    floorplan.updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleUpdateWallHeight = (wallIndex: number, height: number) => {
    const selectedRoom = floorplan.getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      height
    };

    floorplan.updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleUpdateWallApertures = (wallIndex: number, apertures: any[]) => {
    const selectedRoom = floorplan.getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      apertures
    };

    floorplan.updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleCloseWallPanel = () => {
    floorplan.selection.clearWallSelection();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50">
      {/* Canvas */}
      <Canvas floorplan={floorplan} showDimensions={showDimensions} constraints={constraints} />

      {/* Back Button (Top Left) */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        title="Back to Home"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </Link>

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

      {/* Export/Import Buttons (Top Left, below back button) */}
      <div className="absolute top-16 left-4">
        <ExportImportButtons
          onExport={floorplan.exportFloorplan}
          onImport={floorplan.importFloorplan}
          onSave={floorplan.saveFloorplan}
          canSave={!!propertyId}
        />
      </div>

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

      {/* Wall Properties Panel (Right Side) - Show when wall is selected in Edit mode */}
      {floorplan.editorMode === EditorMode.Edit &&
       floorplan.selection.selection.selectedWallIndex !== null &&
       floorplan.getSelectedRoom() && (
        <WallPropertiesPanel
          room={floorplan.getSelectedRoom()!}
          wallIndex={floorplan.selection.selection.selectedWallIndex}
          onUpdateWallThickness={handleUpdateWallThickness}
          onUpdateWallType={handleUpdateWallType}
          onUpdateWallHeight={handleUpdateWallHeight}
          onUpdateWallApertures={handleUpdateWallApertures}
          onClose={handleCloseWallPanel}
        />
      )}

      {/* Constraint Toolbar (Right Side) - NEW: Show in Edit mode when a room is selected */}
      {floorplan.editorMode === EditorMode.Edit &&
       floorplan.getSelectedRoom() && (
        <ConstraintToolbar
          room={floorplan.getSelectedRoom()!}
          constraints={constraints}
          selectedWalls={
            floorplan.selection.selection.selectedWallIndex !== null
              ? [floorplan.selection.selection.selectedWallIndex]
              : []
          }
          wallPropertiesPanelOpen={floorplan.selection.selection.selectedWallIndex !== null}
        />
      )}
    </div>
  );
};
