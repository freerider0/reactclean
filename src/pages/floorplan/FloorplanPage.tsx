/**
 * FloorplanPage - main page component for the floorplan editor
 * Clean React-first architecture with Zustand store
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFloorplanStore } from './store/floorplanStore';
import { useGeoRefMode } from './hooks/useGeoRefMode';
import { Canvas } from './components/Canvas';
import { GeoRefCanvas } from './components/GeoRefCanvas';
import { ModeSelectorBar } from './components/ui/ModeSelectorBar';
import {
  ViewControlButtons,
  ZoomPercentage
} from './components/ui/SimpleComponents';
import { WallPropertiesPanel } from './components/ui/WallPropertiesPanel';
import { WallsListPanel } from './components/ui/WallsListPanel';
import { ConstraintToolbar } from './components/ui/ConstraintToolbar';
import { SettingsModal } from './components/ui/SettingsModal';
import { ApertureEditModal } from './components/ui/ApertureEditModal';
import { DrilldownMenu, MenuItem } from './components/ui/DrilldownMenu';
import { LevelSelector } from './components/ui/LevelSelector';
import { LevelManagementModal } from './components/ui/LevelManagementModal';
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

  // Get state and actions from store
  const roomsMap = useFloorplanStore(state => state.rooms);
  const rooms = useMemo(() => Array.from(roomsMap.values()), [roomsMap]);
  const getSelectedRoom = useFloorplanStore(state => state.getSelectedRoom);
  const getFirstSelectedRoomId = useFloorplanStore(state => state.getFirstSelectedRoomId);
  const editorMode = useFloorplanStore(state => state.editorMode);
  const setEditorMode = useFloorplanStore(state => state.setEditorMode);
  const selection = useFloorplanStore(state => state.selection);
  const config = useFloorplanStore(state => state.config);
  const updateConfig = useFloorplanStore(state => state.updateConfig);
  const viewport = useFloorplanStore(state => state.viewport);
  const setZoom = useFloorplanStore(state => state.setZoom);
  const resetViewport = useFloorplanStore(state => state.resetViewport);
  const drawing = useFloorplanStore(state => state.drawing);
  const cancelDrawing = useFloorplanStore(state => state.cancelDrawing);
  const undoLastVertex = useFloorplanStore(state => state.undoLastVertex);
  const spacePressed = useFloorplanStore(state => state.spacePressed);
  const setSpacePressed = useFloorplanStore(state => state.setSpacePressed);
  const updateRoom = useFloorplanStore(state => state.updateRoom);
  const deleteSelectedRooms = useFloorplanStore(state => state.deleteSelectedRooms);
  const copySelectedRooms = useFloorplanStore(state => state.copySelectedRooms);
  const pasteRooms = useFloorplanStore(state => state.pasteRooms);
  const undo = useFloorplanStore(state => state.undo);
  const redo = useFloorplanStore(state => state.redo);
  const clearAllSelection = useFloorplanStore(state => state.clearAllSelection);
  const selectVertex = useFloorplanStore(state => state.selectVertex);
  const clearWallSelection = useFloorplanStore(state => state.clearWallSelection);
  const clearVertexSelection = useFloorplanStore(state => state.clearVertexSelection);
  const exportFloorplan = useFloorplanStore(state => state.exportFloorplan);
  const importFloorplan = useFloorplanStore(state => state.importFloorplan);
  const saveFloorplan = useFloorplanStore(state => state.saveFloorplan);
  const recalculateAllEnvelopes = useFloorplanStore(state => state.recalculateAllEnvelopes);
  const geoReference = useFloorplanStore(state => state.geoReference);
  const setGeoReference = useFloorplanStore(state => state.setGeoReference);
  const updateAperture = useFloorplanStore(state => state.updateAperture);
  const deleteAperture = useFloorplanStore(state => state.deleteAperture);
  const clearApertureSelection = useFloorplanStore(state => state.clearApertureSelection);

  // Level state and actions
  const levelsMap = useFloorplanStore(state => state.levels);
  const levels = useMemo(() => Array.from(levelsMap.values()), [levelsMap]);
  const activeLevel = useFloorplanStore(state => state.activeLevel);
  const setActiveLevel = useFloorplanStore(state => state.setActiveLevel);
  const getUnderlevelRooms = useFloorplanStore(state => state.getUnderlevelRooms);
  const createLevel = useFloorplanStore(state => state.createLevel);
  const updateLevel = useFloorplanStore(state => state.updateLevel);
  const deleteLevel = useFloorplanStore(state => state.deleteLevel);

  // Check if there's a level below the active level
  const hasUnderlevel = useMemo(() => {
    if (!activeLevel) return false;
    const currentLevel = levelsMap.get(activeLevel);
    if (!currentLevel) return false;
    // Check if there's a level with order = currentLevel.order - 1
    return levels.some(level => level.order === currentLevel.order - 1);
  }, [activeLevel, levelsMap, levels]);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLevelManagerOpen, setIsLevelManagerOpen] = useState(false);
  const [isConfigSubMenuOpen, setIsConfigSubMenuOpen] = useState(config.menuOpenByDefault ?? true);
  const [selectedConfigCategory, setSelectedConfigCategory] = useState<'visibility' | 'snapping' | 'grid' | 'walls' | 'apertures' | 'debug' | null>(null);
  const [showWallsList, setShowWallsList] = useState(false);

  // Blur focused element when config submenu closes
  useEffect(() => {
    if (!isConfigSubMenuOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isConfigSubMenuOpen]);

  // Cadastral data state
  const [parcelWKT, setParcelWKT] = useState<string | undefined>(undefined);
  const [parcelSRID, setParcelSRID] = useState<number | undefined>(undefined);
  const [isLoadingCadastral, setIsLoadingCadastral] = useState(false);

  // Load cadastral data if available
  useEffect(() => {
    if (propertyId) {
      // // console.log('🏗️ FloorplanPage loaded with property context:');
      // // console.log('  Property ID:', propertyId);
      // // console.log('  Property Data:', propertyData);
      // // console.log('  Return To:', returnTo);

      // If we have a cadastral reference, load parcel data
      if (propertyData?.referenciaCatastral) {
        const refcat = propertyData.referenciaCatastral;

        // Extract parcel reference (first 14 characters if it's a 20-char reference)
        const parcelRef = CatastroApiService.extractParcelRefcat(refcat);

        if (parcelRef.length === 14) {
          // // console.log('📍 Loading cadastral data for:', parcelRef);
          setIsLoadingCadastral(true);

          catastroApi.getParcela(parcelRef)
            .then(parcelaData => {
              // // console.log('✅ Cadastral data loaded (RAW):', JSON.stringify(parcelaData, null, 2));
              // // console.log('📊 Parcela data structure:', parcelaData);
              // // console.log('🗺️ Geometria:', parcelaData?.parcela?.geometria);
              // // console.log('📍 Coordenadas:', parcelaData?.parcela?.geometria?.coordenadas);

              // Store parcel geometry for GeoRefCanvas
              if (parcelaData?.parcela?.geometria?.wkt) {
                setParcelWKT(parcelaData.parcela.geometria.wkt);
                // // console.log('✅ Parcel WKT set:', parcelaData.parcela.geometria.wkt.substring(0, 100) + '...');
              } else {
                console.warn('⚠️  No WKT found in response');
              }

              if (parcelaData?.parcela?.geometria?.srid) {
                setParcelSRID(parcelaData.parcela.geometria.srid);
                // // console.log('✅ Parcel SRID set:', parcelaData.parcela.geometria.srid);
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

                // // console.log('📍 Initializing geo-reference with parcel centroid:', newGeoRef);
                // // console.log('   X:', centroid.x);
                // // console.log('   Y:', centroid.y);
                // // console.log('   SRID:', parcelaData.parcela.geometria.srid);

                setGeoReference(newGeoRef);
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
      // // console.log('🏗️ FloorplanPage loaded without property context (standalone mode)');
    }
  }, [propertyId, propertyData, returnTo]);

  // Memoize edge mapping for constraints
  // Selected edge index maps directly to room vertices
  const selectedEdgeForConstraints = useMemo(() => {
    const selectedRoom = getSelectedRoom();
    const selectedEdgeIndex = selection.selectedEdgeIndex;

    if (!selectedRoom || selectedEdgeIndex === null) {
      return [];
    }

    // // console.log(`🎯 Edge ${selectedEdgeIndex} selected for constraints`);
    // // console.log(`  → room.vertices: ${selectedRoom.vertices.length}`);

    // Edge index directly corresponds to the edge starting at vertex[index] and ending at vertex[index+1]
    return [selectedEdgeIndex];
  }, [
    selection.selectedRoomIds,
    selection.selectedEdgeIndex,
    rooms
  ]);

  // GeoRef mode state
  const [geoRefInteractionMode, setGeoRefInteractionMode] = useState<'translate' | 'rotate' | 'none'>('none');
  const [geoRefSnapEnabled, setGeoRefSnapEnabled] = useState(false);

  // Initialize geoReference in store if not set (run once on mount)
  useEffect(() => {
    if (!geoReference) {
      // // console.log('🔧 Initializing geoReference in store with:', initialGeoRef);
      setGeoReference(initialGeoRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // GeoRef hook - use ONLY store state
  const geoRefMode = useGeoRefMode({
    initialGeoRef: geoReference || initialGeoRef,
    onGeoRefChange: setGeoReference,
    rooms: rooms,
    snapEnabled: geoRefSnapEnabled,
  });

  /**
   * Keyboard event handlers
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space key for panning
      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault();
      }

      // Escape to cancel drawing and exit to assembly mode
      if (e.code === 'Escape') {
        if (drawing.isDrawing) {
          // Cancel drawing and exit to assembly mode
          cancelDrawing();
          clearAllSelection();
          setEditorMode(EditorMode.Assembly);
        } else if (editorMode === EditorMode.Draw || editorMode === EditorMode.Edit) {
          // Exit draw/edit mode (including add mode) and go to assembly mode
          clearAllSelection();
          setEditorMode(EditorMode.Assembly);
        } else {
          // Clear selections in other modes
          clearAllSelection();
        }
      }

      // Delete key
      if (e.code === 'Delete' || e.code === 'Backspace') {
        // In edit mode - delete selected vertex
        if (editorMode === EditorMode.Edit && selection.selectedVertexIndex !== null) {
          const selectedRoom = getSelectedRoom();
          if (selectedRoom && selectedRoom.vertices.length > 3) {
            const newVertices = selectedRoom.vertices.filter((_, i) => i !== selection.selectedVertexIndex);
            // Preserve existing wall properties when regenerating (pass old vertices for matching)
            const newWalls = generateWalls(newVertices, selectedRoom.wallThickness, selectedRoom.walls, selectedRoom.vertices);
            updateRoom(selectedRoom.id, { vertices: newVertices, walls: newWalls });
            selectVertex(null as any); // Clear selection
          }
          e.preventDefault();
          return;
        }

        // In assembly mode - delete selected rooms
        if (selection.selectedRoomIds.length > 0) {
          deleteSelectedRooms();
          e.preventDefault();
        }
      }

      // Mode switching (only letter keys, not numbers)
      if (e.code === 'KeyD') {
        setEditorMode(EditorMode.Draw);
      }
      if (e.code === 'KeyE') {
        setEditorMode(EditorMode.Edit);
      }
      if (e.code === 'KeyA') {
        setEditorMode(EditorMode.Assembly);
      }
      if (e.code === 'KeyR') {
        setEditorMode(EditorMode.GeoRef);
      }

      // Grid toggle / GeoRef mode
      if (e.code === 'KeyG') {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+G = GeoRef mode
          setEditorMode(EditorMode.GeoRef);
          e.preventDefault();
        } else {
          // G = Grid toggle
          updateConfig({ enabled: !config.enabled });
        }
      }

      // Snap toggle
      if (e.code === 'KeyS') {
        updateConfig({ snapEnabled: !config.snapEnabled });
      }

      // Undo/Redo
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          // Ctrl+Shift+Z = Redo
          redo();
        } else {
          // Ctrl+Z = Undo
          undo();
        }
        e.preventDefault();
      }

      // Copy/Paste
      if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        copySelectedRooms();
        e.preventDefault();
      }

      if (e.code === 'KeyV' && (e.ctrlKey || e.metaKey)) {
        pasteRooms();
        e.preventDefault();
      }

      // Undo last vertex (while drawing)
      if (e.code === 'Backspace' && drawing.isDrawing) {
        undoLastVertex();
        e.preventDefault();
      }

      // Level switching shortcuts
      // PageUp = Go to level above (higher order)
      if (e.code === 'PageUp') {
        if (activeLevel) {
          const currentLevel = levelsMap.get(activeLevel);
          if (currentLevel) {
            // Find level with order = currentLevel.order + 1
            const nextLevel = levels.find(level => level.order === currentLevel.order + 1);
            if (nextLevel) {
              setActiveLevel(nextLevel.id);
            }
          }
        }
        e.preventDefault();
      }

      // PageDown = Go to level below (lower order)
      if (e.code === 'PageDown') {
        if (activeLevel) {
          const currentLevel = levelsMap.get(activeLevel);
          if (currentLevel) {
            // Find level with order = currentLevel.order - 1
            const prevLevel = levels.find(level => level.order === currentLevel.order - 1);
            if (prevLevel) {
              setActiveLevel(prevLevel.id);
            }
          }
        }
        e.preventDefault();
      }

      // Toggle underlevel visibility (Ctrl+U)
      if (e.code === 'KeyU' && (e.ctrlKey || e.metaKey)) {
        updateConfig({ showUnderlevel: !config.showUnderlevel });
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space key release
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed, setSpacePressed, drawing, cancelDrawing, clearAllSelection, clearWallSelection, clearVertexSelection, editorMode, selection, getSelectedRoom, updateRoom, deleteSelectedRooms, setEditorMode, updateConfig, config, undo, redo, copySelectedRooms, pasteRooms, undoLastVertex, selectVertex, activeLevel, levelsMap, levels, setActiveLevel]);

  // Zoom controls
  const handleZoomIn = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    setZoom(viewport.zoom * 1.2, { x: centerX, y: centerY });
  };

  const handleZoomOut = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    setZoom(viewport.zoom * 0.8, { x: centerX, y: centerY });
  };

  const handleResetView = () => {
    resetViewport();
  };

  // Wall properties panel handlers
  const handleUpdateWallThickness = (wallIndex: number, thickness: number) => {
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      thickness
    };

    updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleUpdateWallType = (wallIndex: number, wallType: string) => {
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      wallType: wallType as any
    };

    updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleUpdateWallHeight = (wallIndex: number, height: number) => {
    const selectedRoom = getSelectedRoom();
    if (!selectedRoom) return;

    const updatedWalls = [...selectedRoom.walls];
    updatedWalls[wallIndex] = {
      ...updatedWalls[wallIndex],
      height
    };

    updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleUpdateWallApertures = (wallIndex: number, apertures: any[]) => {
    const selectedRoom = getSelectedRoom();
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

    updateRoom(selectedRoom.id, { walls: updatedWalls });
  };

  const handleCloseWallPanel = () => {
    clearWallSelection();
  };

  const handleWallClick = (roomId: string, wallIndex: number) => {
    // Close the walls list panel
    setShowWallsList(false);

    // Select the room and wall (for highlighting)
    const state = useFloorplanStore.getState();
    state.selectRoom(roomId, false); // Select the room
    state.selectEdge(wallIndex); // Select the wall/edge
  };

  // Main menu structure - starts directly at tools level
  const mainMenuItems: MenuItem[] = useMemo(() => [
    {
      id: 'all-walls',
      label: 'All Walls',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      onSelect: () => setShowWallsList(true)
    },
    {
      id: 'export',
      label: 'Export',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onSelect: exportFloorplan
    },
    {
      id: 'import',
      label: 'Import',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      onSelect: importFloorplan
    },
    ...(propertyId ? [{
      id: 'save',
      label: 'Save',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      ),
      onSelect: saveFloorplan
    }] : []),
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      submenu: [
        {
          id: 'visibility',
          label: 'Visibility',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
          onSelect: () => {
            setSelectedConfigCategory('visibility');
            setIsSettingsModalOpen(true);
          }
        },
        {
          id: 'snapping',
          label: 'Snapping',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          ),
          onSelect: () => {
            setSelectedConfigCategory('snapping');
            setIsSettingsModalOpen(true);
          }
        },
        {
          id: 'grid',
          label: 'Grid Settings',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ),
          onSelect: () => {
            setSelectedConfigCategory('grid');
            setIsSettingsModalOpen(true);
          }
        },
        {
          id: 'walls',
          label: 'Wall Defaults',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          onSelect: () => {
            setSelectedConfigCategory('walls');
            setIsSettingsModalOpen(true);
          }
        },
        {
          id: 'apertures',
          label: 'Apertures',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          ),
          onSelect: () => {
            setSelectedConfigCategory('apertures');
            setIsSettingsModalOpen(true);
          }
        },
        {
          id: 'debug',
          label: 'Debug',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          onSelect: () => {
            setSelectedConfigCategory('debug');
            setIsSettingsModalOpen(true);
          }
        }
      ]
    }
  ], [propertyId, exportFloorplan, importFloorplan, saveFloorplan]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50">
      {/* Canvas - Conditional rendering based on editor mode */}
      {editorMode === EditorMode.GeoRef ? (
        <GeoRefCanvas
          rooms={rooms}
          geoRef={geoReference || initialGeoRef}
          parcelWKT={parcelWKT}
          parcelSRID={parcelSRID || (geoReference || initialGeoRef).srid}
          interactionMode={geoRefInteractionMode}
          onDragStart={geoRefMode.startDrag}
          onDragMove={geoRefMode.updateDrag}
          onDragEnd={geoRefMode.endDrag}
          onRotateStart={geoRefMode.startRotate}
          onRotateMove={geoRefMode.updateRotate}
          onRotateEnd={geoRefMode.endRotate}
        />
      ) : (
        <Canvas showDimensions={config.showDimensions ?? false} />
      )}

      {/* Back Button (Top Left) */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Back to Home"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-gray-700 dark:text-gray-300"
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
        mode={editorMode}
        setMode={(mode) => {
          if (mode === EditorMode.Draw) setEditorMode(EditorMode.Draw);
          else if (mode === EditorMode.Edit) setEditorMode(EditorMode.Edit);
          else if (mode === EditorMode.Assembly) setEditorMode(EditorMode.Assembly);
          else if (mode === EditorMode.GeoRef) setEditorMode(EditorMode.GeoRef);
        }}
        canEdit={selection.selectedRoomIds.length > 0}
        onCalculateWalls={recalculateAllEnvelopes}
      />

      {/* Tools Menu (Top Left, below back button) */}
      <div className="absolute top-16 left-4">
        <div className="relative">
          {!isConfigSubMenuOpen && (
            <button
              onClick={() => setIsConfigSubMenuOpen(true)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2 focus:outline-none select-none text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Tools"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              Tools
            </button>
          )}

          <DrilldownMenu
            isOpen={isConfigSubMenuOpen}
            onClose={() => setIsConfigSubMenuOpen(false)}
            items={mainMenuItems}
            title="Tools"
          />
        </div>
      </div>

      {/* View Controls (Top Right) */}
      <ViewControlButtons
        viewport={viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
      />

      {/* Zoom Percentage (Bottom Right) */}
      <ZoomPercentage zoom={viewport.zoom} />

      {/* Wall Properties Panel (Right Side) - Show when edge is selected in Edit mode */}
      {editorMode === EditorMode.Edit &&
       selection.selectedEdgeIndex !== null &&
       getSelectedRoom() && (
        <WallPropertiesPanel
          room={getSelectedRoom()!}
          wallIndex={selection.selectedEdgeIndex}
          config={config}
          onUpdateWallThickness={handleUpdateWallThickness}
          onUpdateWallType={handleUpdateWallType}
          onUpdateWallHeight={handleUpdateWallHeight}
          onUpdateWallApertures={handleUpdateWallApertures}
          onClose={handleCloseWallPanel}
        />
      )}

      {/* Walls List Panel - Show all walls across all rooms */}
      {showWallsList && (
        <WallsListPanel
          rooms={rooms}
          levels={levelsMap}
          onClose={() => setShowWallsList(false)}
          onWallClick={handleWallClick}
        />
      )}

      {/* Constraint Toolbar (Right Side) - Show in Edit mode when a room is selected */}
      {editorMode === EditorMode.Edit && getSelectedRoom() && (
        <ConstraintToolbar
          room={getSelectedRoom()!}
          selectedWalls={selectedEdgeForConstraints}
          wallPropertiesPanelOpen={false}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setSelectedConfigCategory(null);
        }}
        config={config}
        onUpdateConfig={updateConfig}
        onRecalculateWalls={recalculateAllEnvelopes}
        category={selectedConfigCategory}
      />

      {/* Aperture Edit Modal */}
      {selection.selectedApertureId && selection.selectedApertureWallIndex !== null && (() => {
        const selectedRoom = getSelectedRoom();
        if (!selectedRoom) return null;

        const wall = selectedRoom.walls[selection.selectedApertureWallIndex];
        if (!wall || !wall.apertures) return null;

        const aperture = wall.apertures.find(a => a.id === selection.selectedApertureId);
        if (!aperture) return null;

        return (
          <ApertureEditModal
            aperture={aperture}
            config={config}
            onSave={(updates) => {
              updateAperture(
                selectedRoom.id,
                selection.selectedApertureWallIndex!,
                selection.selectedApertureId!,
                updates
              );
            }}
            onDelete={() => {
              deleteAperture(
                selectedRoom.id,
                selection.selectedApertureWallIndex!,
                selection.selectedApertureId!
              );
            }}
            onClose={clearApertureSelection}
          />
        );
      })()}

      {/* Level Selector (Bottom Center) - Hide in GeoRef mode */}
      {editorMode !== EditorMode.GeoRef && (
        <LevelSelector
          levels={levels}
          activeLevel={activeLevel}
          onSelectLevel={setActiveLevel}
          showUnderlevel={config.showUnderlevel ?? false}
          onToggleUnderlevel={(show) => updateConfig({ showUnderlevel: show })}
          underlevelOpacity={config.underlevelOpacity ?? 0.3}
          onChangeOpacity={(opacity) => updateConfig({ underlevelOpacity: opacity })}
          onOpenLevelManager={() => setIsLevelManagerOpen(true)}
          hasUnderlevel={hasUnderlevel}
        />
      )}

      {/* Level Management Modal */}
      <LevelManagementModal
        isOpen={isLevelManagerOpen}
        onClose={() => setIsLevelManagerOpen(false)}
        levels={levels}
        activeLevel={activeLevel}
        onCreateLevel={createLevel}
        onUpdateLevel={updateLevel}
        onDeleteLevel={deleteLevel}
        onSetActiveLevel={setActiveLevel}
      />
    </div>
  );
};
