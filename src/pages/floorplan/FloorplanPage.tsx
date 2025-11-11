/**
 * FloorplanPage - main page component for the floorplan editor
 * Clean React-first architecture with hooks
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFloorplan } from './hooks/useFloorplan';
import { useConstraints } from './hooks/useConstraints';
import { useGeoRefMode } from './hooks/useGeoRefMode';
import { Canvas } from './components/Canvas';
import { GeoRefCanvas } from './components/GeoRefCanvas';
import { ModeSelectorBar } from './components/ui/ModeSelectorBar';
import {
  ViewControlButtons,
  ZoomPercentage,
  ExportImportButtons
} from './components/ui/SimpleComponents';
import { WallPropertiesPanel } from './components/ui/WallPropertiesPanel';
import { ConstraintToolbar } from './components/ui/ConstraintToolbar';
import { SettingsModal } from './components/ui/SettingsModal';
import { EditorMode } from './types';
import type { GeoReference } from './types/geo';
import { generateWalls } from './utils/walls';
// import { mapEnvelopeWallToRoomEdge } from './utils/geometry';
import { catastroApi, default as CatastroApiService } from '@/services/catastroApiService';

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

  // Initial geo reference (will be loaded from saved data or initialized)
  const [initialGeoRef] = useState<GeoReference>({
    anchor: { x: 0, y: 0 }, // Will be initialized from cadastral data
    rotation: 0,
    srid: 25831, // Default SRID (UTM Zone 31N for Spain)
    scale: 1.0,
  });

  const floorplan = useFloorplan({
    propertyId,
    geoReference: initialGeoRef,
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Cadastral data state
  const [parcelWKT, setParcelWKT] = useState<string | undefined>(undefined);
  const [parcelSRID, setParcelSRID] = useState<number | undefined>(undefined);
  const [isLoadingCadastral, setIsLoadingCadastral] = useState(false);

  // Load cadastral data if available
  useEffect(() => {
    if (propertyId) {
      console.log('🏗️ FloorplanPage loaded with property context:');
      console.log('  Property ID:', propertyId);
      console.log('  Property Data:', propertyData);
      console.log('  Return To:', returnTo);

      // If we have a cadastral reference, load parcel data
      if (propertyData?.referenciaCatastral) {
        const refcat = propertyData.referenciaCatastral;

        // Extract parcel reference (first 14 characters if it's a 20-char reference)
        const parcelRef = CatastroApiService.extractParcelRefcat(refcat);

        if (parcelRef.length === 14) {
          console.log('📍 Loading cadastral data for:', parcelRef);
          setIsLoadingCadastral(true);

          catastroApi.getParcela(parcelRef)
            .then(parcelaData => {
              console.log('✅ Cadastral data loaded (RAW):', JSON.stringify(parcelaData, null, 2));
              console.log('📊 Parcela data structure:', parcelaData);
              console.log('🗺️ Geometria:', parcelaData?.parcela?.geometria);
              console.log('📍 Coordenadas:', parcelaData?.parcela?.geometria?.coordenadas);

              // Store parcel geometry for GeoRefCanvas
              if (parcelaData?.parcela?.geometria?.wkt) {
                setParcelWKT(parcelaData.parcela.geometria.wkt);
                console.log('✅ Parcel WKT set:', parcelaData.parcela.geometria.wkt.substring(0, 100) + '...');
              } else {
                console.warn('⚠️  No WKT found in response');
              }

              if (parcelaData?.parcela?.geometria?.srid) {
                setParcelSRID(parcelaData.parcela.geometria.srid);
                console.log('✅ Parcel SRID set:', parcelaData.parcela.geometria.srid);
              } else {
                console.warn('⚠️  No SRID found in response');
              }

              // Update geo reference with parcel centroid
              const centroid = parcelaData?.parcela?.geometria?.coordenadas;
              if (centroid && centroid.x && centroid.y) {
                const newGeoRef: GeoReference = {
                  anchor: { x: centroid.x, y: centroid.y },
                  rotation: 0,
                  srid: parcelaData.parcela.geometria.srid,
                  scale: 1.0,
                };

                console.log('📍 Initializing geo-reference with parcel centroid:', newGeoRef);
                console.log('   X:', centroid.x);
                console.log('   Y:', centroid.y);
                console.log('   SRID:', parcelaData.parcela.geometria.srid);

                floorplan.setGeoReference(newGeoRef);
              } else {
                console.error('❌ Invalid centroid data:', centroid);
                console.error('   Full response:', parcelaData);
              }
            })
            .catch(error => {
              console.error('❌ Failed to load cadastral data:', error);
            })
            .finally(() => {
              setIsLoadingCadastral(false);
            });
        }
      }
    } else {
      console.log('🏗️ FloorplanPage loaded without property context (standalone mode)');
    }
  }, [propertyId, propertyData, returnTo]);

  // Constraint management hook - NEW: Additive constraint functionality
  const constraints = useConstraints({
    rooms: floorplan.rooms,
    selectedRoomId: floorplan.selection.selection.selectedRoomIds[0] || null,
    updateRoom: floorplan.updateRoom,
    recalculateEnvelopes: floorplan.recalculateAllEnvelopes
  });

  // Memoize edge mapping for constraints
  // Selected edge index maps directly to room vertices
  const selectedEdgeForConstraints = useMemo(() => {
    const selectedRoom = floorplan.getSelectedRoom();
    const selectedEdgeIndex = floorplan.selection.selection.selectedEdgeIndex;

    if (!selectedRoom || selectedEdgeIndex === null) {
      return [];
    }

    console.log(`🎯 Edge ${selectedEdgeIndex} selected for constraints`);
    console.log(`  → room.vertices: ${selectedRoom.vertices.length}`);

    // Edge index directly corresponds to the edge starting at vertex[index] and ending at vertex[index+1]
    return [selectedEdgeIndex];
  }, [
    floorplan.selection.selection.selectedRoomIds,
    floorplan.selection.selection.selectedEdgeIndex,
    floorplan.rooms
  ]);

  // GeoRef mode state
  const [geoRefInteractionMode, setGeoRefInteractionMode] = useState<'translate' | 'rotate' | 'none'>('none');
  const [geoRefSnapEnabled, setGeoRefSnapEnabled] = useState(false);

  // Initialize geoReference in store if not set
  useEffect(() => {
    if (!floorplan.geoReference) {
      console.log('🔧 Initializing geoReference in store with:', initialGeoRef);
      floorplan.setGeoReference(initialGeoRef);
    }
  }, []);

  // GeoRef hook - use ONLY store state
  const geoRefMode = useGeoRefMode({
    initialGeoRef: floorplan.geoReference || initialGeoRef,
    onGeoRefChange: floorplan.setGeoReference,
    rooms: floorplan.rooms,
    snapEnabled: geoRefSnapEnabled,
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
      if (e.code === 'Digit4' || e.code === 'KeyR') {
        floorplan.enterGeoRefMode();
      }

      // Grid toggle
      if (e.code === 'KeyG') {
        floorplan.updateConfig({ enabled: !floorplan.config.enabled });
      }

      // Snap toggle
      if (e.code === 'KeyS') {
        floorplan.updateConfig({ snapEnabled: !floorplan.config.snapEnabled });
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
    const currentWall = updatedWalls[wallIndex];

    // Check if apertures contain windows
    const hasWindows = apertures.some(a => a.type === 'window');

    updatedWalls[wallIndex] = {
      ...currentWall,
      apertures,
      // Auto-assign exterior wall type if windows are present
      wallType: hasWindows ? 'exterior' : currentWall.wallType
    };

    floorplan.updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleCloseWallPanel = () => {
    floorplan.selection.clearWallSelection();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50">
      {/* Canvas - Conditional rendering based on editor mode */}
      {floorplan.editorMode === EditorMode.GeoRef ? (
        <GeoRefCanvas
          rooms={floorplan.rooms}
          geoRef={floorplan.geoReference || initialGeoRef}
          parcelWKT={parcelWKT}
          parcelSRID={parcelSRID || (floorplan.geoReference || initialGeoRef).srid}
          interactionMode={geoRefInteractionMode}
          onDragStart={geoRefMode.startDrag}
          onDragMove={geoRefMode.updateDrag}
          onDragEnd={geoRefMode.endDrag}
          onRotateStart={geoRefMode.startRotate}
          onRotateMove={geoRefMode.updateRotate}
          onRotateEnd={geoRefMode.endRotate}
        />
      ) : (
        <Canvas floorplan={floorplan} showDimensions={floorplan.config.showDimensions ?? false} constraints={constraints} />
      )}

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
          else if (mode === EditorMode.GeoRef) floorplan.enterGeoRefMode();
        }}
        canEdit={floorplan.selection.selection.selectedRoomIds.length > 0}
        onCalculateWalls={floorplan.recalculateAllEnvelopes}
      />

      {/* Export/Import/Settings Buttons (Top Left, below back button) */}
      <div className="absolute top-16 left-4 flex flex-col gap-2">
        <ExportImportButtons
          onExport={floorplan.exportFloorplan}
          onImport={floorplan.importFloorplan}
          onSave={floorplan.saveFloorplan}
          canSave={!!propertyId}
        />

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
      </div>

      {/* View Controls (Top Right) */}
      <ViewControlButtons
        viewport={floorplan.viewport.viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
      />

      {/* Zoom Percentage (Bottom Right) */}
      <ZoomPercentage zoom={floorplan.viewport.viewport.zoom} />

      {/* Wall Properties Panel (Right Side) - Show when edge is selected in Edit mode */}
      {floorplan.editorMode === EditorMode.Edit &&
       floorplan.selection.selection.selectedEdgeIndex !== null &&
       floorplan.getSelectedRoom() && (
        <WallPropertiesPanel
          room={floorplan.getSelectedRoom()!}
          wallIndex={floorplan.selection.selection.selectedEdgeIndex}
          onUpdateWallThickness={handleUpdateWallThickness}
          onUpdateWallType={handleUpdateWallType}
          onUpdateWallHeight={handleUpdateWallHeight}
          onUpdateWallApertures={handleUpdateWallApertures}
          onClose={handleCloseWallPanel}
        />
      )}

      {/* Constraint Toolbar (Right Side) - Show in Edit mode when a room is selected */}
      {floorplan.editorMode === EditorMode.Edit && floorplan.getSelectedRoom() && (
        <ConstraintToolbar
          room={floorplan.getSelectedRoom()!}
          constraints={constraints}
          selectedWalls={selectedEdgeForConstraints}
          wallPropertiesPanelOpen={false}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={floorplan.config}
        onUpdateConfig={floorplan.updateConfig}
        onRecalculateWalls={() => floorplan.recalculateAllEnvelopes()}
      />
    </div>
  );
};
