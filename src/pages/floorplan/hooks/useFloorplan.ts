/**
 * useFloorplan hook - main hook that orchestrates all floorplan functionality
 * Replaces the ECS World and manages all state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, EditorMode, ToolMode, FloorplanConfig } from '../types';
import type { GeoReference } from '../types/geo';
import { useViewport } from './useViewport';
import { useDrawing } from './useDrawing';
import { useSelection } from './useSelection';
import { useHistory } from './useHistory';
import { supabase } from '@/lib/supabase';
import { calculateFloorplanEnvelopes } from '../utils/geometry';
import { calculateCenterline } from '../utils/roomJoining';
import { generateWalls } from '../utils/walls';

const DEFAULT_FLOORPLAN_CONFIG: FloorplanConfig = {
  // Grid settings
  enabled: true,
  size: 50, // 50cm grid
  majorLines: 5, // Major line every 250cm (2.5m)
  snapEnabled: false,
  orthogonalSnapEnabled: false,

  // Visibility settings
  showGuideLines: false,
  showEnvelopeVertices: true,
  showDebugLines: false, // Hide debug lines (pink, yellow, green) by default
  showDimensions: false, // Hide dimensions by default

  // Wall thickness settings
  defaultInteriorWallThickness: 15, // 15cm
  defaultExteriorWallThickness: 30, // 30cm

  // Rendering settings
  miterLimit: 2.0 // Default miter limit
};

interface UseFloorplanOptions {
  propertyId?: string;
  geoReference?: GeoReference;
  onGeoReferenceChange?: (geoRef: GeoReference) => void;
}

export function useFloorplan(
  propertyIdOrOptions?: string | UseFloorplanOptions
) {
  // Handle both old signature (string) and new signature (options)
  const options = typeof propertyIdOrOptions === 'string'
    ? { propertyId: propertyIdOrOptions }
    : propertyIdOrOptions || {};

  const { propertyId, geoReference: initialGeoRef, onGeoReferenceChange } = options;

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);
  const roomsRef = useRef<Room[]>([]);
  const previousRoomCountRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // History for undo/redo
  const history = useHistory<Room[]>([], 50);

  // Editor state
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Draw);
  const [toolMode, setToolMode] = useState<ToolMode>(ToolMode.DrawRoom);
  const [config, setConfig] = useState<FloorplanConfig>(DEFAULT_FLOORPLAN_CONFIG);
  const configRef = useRef<FloorplanConfig>(DEFAULT_FLOORPLAN_CONFIG);

  // Keep config ref in sync with state
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // GeoReference state
  const [geoReference, setGeoReference] = useState<GeoReference | undefined>(initialGeoRef);

  // Keyboard state
  const [spacePressed, setSpacePressed] = useState(false);

  // Clipboard state
  const [clipboard, setClipboard] = useState<Room[]>([]);
  const [pasteOffset, setPasteOffset] = useState(0); // For multiple paste operations

  // Log property context when hook is initialized
  useEffect(() => {
    if (propertyId) {
      console.log('📐 useFloorplan initialized with property ID:', propertyId);
    }
  }, [propertyId]);

  // Hooks
  const viewport = useViewport();
  const selection = useSelection();

  // Push to history whenever rooms change
  useEffect(() => {
    history.pushState(rooms, 'Room update');
  }, [rooms]);

  // Notify parent when geo reference changes
  useEffect(() => {
    if (geoReference && onGeoReferenceChange) {
      onGeoReferenceChange(geoReference);
    }
  }, [geoReference, onGeoReferenceChange]);

  /**
   * Create a new room
   */
  const createRoom = useCallback((roomData: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...roomData,
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setRooms(prev => [...prev, newRoom]);
    return newRoom;
  }, []);

  // Drawing hook with room creation callback
  const drawing = useDrawing(
    config,
    viewport.viewport.zoom,
    createRoom,
    rooms
  );

  /**
   * Update a room
   */
  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    setRooms(prev => {
      const updated = prev.map(room => {
        if (room.id !== roomId) return room;

        const updatedRoom = { ...room, ...updates };

        // Recalculate centerlineVertices if vertices or wallThickness changed
        if (updates.vertices || updates.wallThickness || updates.walls) {
          const oldCenterline = updatedRoom.centerlineVertices;
          updatedRoom.centerlineVertices = calculateCenterline(updatedRoom);
          console.log(`🔧 updateRoom: Recalculated centerline for room ${roomId}`);
          console.log(`  Old centerline: ${oldCenterline.length} vertices`);
          console.log(`  New centerline: ${updatedRoom.centerlineVertices.length} vertices`);
          console.log(`  New vertices: ${updatedRoom.vertices.map(v => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`).slice(0, 3)}`);
        }

        return updatedRoom;
      });

      // Also update ref immediately for synchronous access
      roomsRef.current = updated;
      return updated;
    });
  }, []);

  /**
   * Delete a room
   */
  const deleteRoom = useCallback((roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId));
    selection.deselectRoom(roomId);
  }, [selection]);

  /**
   * Delete selected rooms
   */
  const deleteSelectedRooms = useCallback(() => {
    setRooms(prev => prev.filter(room =>
      !selection.selection.selectedRoomIds.includes(room.id)
    ));
    selection.clearSelection();
  }, [selection]);

  /**
   * Get room by ID
   */
  const getRoomById = useCallback((roomId: string): Room | null => {
    return rooms.find(room => room.id === roomId) || null;
  }, [rooms]);

  /**
   * Get selected room (first if multiple selected)
   */
  const getSelectedRoom = useCallback((): Room | null => {
    const selectedId = selection.getFirstSelectedRoomId();
    if (!selectedId) return null;
    return getRoomById(selectedId);
  }, [selection, getRoomById]);

  /**
   * Clone a room
   */
  const cloneRoom = useCallback((roomId: string) => {
    const room = getRoomById(roomId);
    if (!room) return;

    const clonedRoom: Room = {
      ...room,
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${room.name} (copy)`,
      position: {
        x: room.position.x + 100,
        y: room.position.y + 100
      }
    };

    setRooms(prev => [...prev, clonedRoom]);
    return clonedRoom;
  }, [getRoomById]);

  /**
   * Copy selected rooms to clipboard
   */
  const copySelectedRooms = useCallback(() => {
    const selectedRoomIds = selection.selection.selectedRoomIds;
    if (selectedRoomIds.length === 0) return;

    const selectedRooms = selectedRoomIds
      .map(id => getRoomById(id))
      .filter((room): room is Room => room !== null);

    setClipboard(selectedRooms);
    setPasteOffset(0); // Reset paste offset when copying
  }, [selection, getRoomById]);

  /**
   * Paste rooms from clipboard
   */
  const pasteRooms = useCallback(() => {
    if (clipboard.length === 0) return;

    const newPasteOffset = pasteOffset + 1;
    const offset = 50 + (newPasteOffset * 50); // Increment offset for each paste

    const pastedRoomIds: string[] = [];

    clipboard.forEach(room => {
      const pastedRoom: Room = {
        ...room,
        id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${room.name} (copy ${newPasteOffset})`,
        position: {
          x: room.position.x + offset,
          y: room.position.y + offset
        }
      };

      pastedRoomIds.push(pastedRoom.id);
      setRooms(prev => [...prev, pastedRoom]);
    });

    // Select the pasted rooms
    selection.selectRooms(pastedRoomIds);
    setPasteOffset(newPasteOffset);
  }, [clipboard, pasteOffset, selection]);

  /**
   * Export floorplan to JSON
   */
  const exportFloorplan = useCallback(() => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      propertyId, // Include propertyId in exported data
      rooms,
      config, // All configuration in one object
      geoReference // Include geo reference
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    // Use propertyId in filename if available
    link.download = propertyId
      ? `floorplan-${propertyId}.json`
      : `floorplan-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rooms, config, propertyId, geoReference]);

  /**
   * Save floorplan to Supabase Storage
   */
  const saveFloorplan = useCallback(async () => {
    if (!propertyId) {
      console.error('Cannot save floorplan: propertyId is required');
      return { success: false, error: 'Property ID is required' };
    }

    try {
      // Create the floorplan data
      const data = {
        version: '1.0',
        savedDate: new Date().toISOString(),
        propertyId,
        rooms,
        config, // All configuration in one object
        geoReference // Include geo reference
      };

      // Convert to JSON blob
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });

      // Get tenant ID from current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }

      // Upload to Supabase Storage
      // Path: {tenantId}/properties/{propertyId}/floorplan.json
      const filePath = `${tenantId}/properties/${propertyId}/floorplan.json`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(tenantId)
        .upload(filePath, blob, {
          contentType: 'application/json',
          upsert: true // Overwrite if exists
        });

      if (uploadError) {
        throw uploadError;
      }

      console.log('✅ Floorplan saved successfully:', filePath);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Failed to save floorplan:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [propertyId, rooms, config, geoReference]);

  /**
   * Import floorplan from JSON
   */
  const importFloorplan = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate data structure
        if (!data.rooms || !Array.isArray(data.rooms)) {
          console.error('Invalid floorplan data: missing or invalid rooms array');
          return;
        }

        // Import rooms and ensure centerlineVertices are calculated
        const importedRooms = data.rooms.map((room: Room) => {
          // Calculate centerlineVertices if not present
          if (!room.centerlineVertices) {
            return {
              ...room,
              centerlineVertices: calculateCenterline(room)
            };
          }
          return room;
        });

        setRooms(importedRooms);

        // Import config - support both new and old formats
        if (data.config) {
          // New format: single config object
          setConfig(data.config);
        } else {
          // Old format: separate gridConfig and wall thicknesses
          const importedConfig: FloorplanConfig = {
            ...DEFAULT_FLOORPLAN_CONFIG,
            ...(data.gridConfig || {})
          };

          // Merge old wall thickness properties if present
          if (data.defaultInteriorWallThickness !== undefined) {
            importedConfig.defaultInteriorWallThickness = data.defaultInteriorWallThickness;
          }
          if (data.defaultExteriorWallThickness !== undefined) {
            importedConfig.defaultExteriorWallThickness = data.defaultExteriorWallThickness;
          }

          setConfig(importedConfig);
        }

        // Import geo reference if present
        if (data.geoReference) {
          setGeoReference(data.geoReference);
        }

        // Clear selection and reset view
        selection.clearSelection();
        viewport.resetViewport();
      } catch (error) {
        console.error('Failed to import floorplan:', error);
      }
    };

    reader.readAsText(file);
  }, [selection, viewport]);

  /**
   * Update floorplan configuration
   */
  const updateConfig = useCallback((updates: Partial<FloorplanConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      // Update ref immediately for synchronous access
      configRef.current = newConfig;
      return newConfig;
    });
  }, []);

  /**
   * Switch to draw mode
   */
  const enterDrawMode = useCallback(() => {
    setEditorMode(EditorMode.Draw);
    setToolMode(ToolMode.DrawRoom);
    selection.clearSelection();
    drawing.cancelDrawing();
  }, [selection, drawing]);

  /**
   * Switch to edit mode
   */
  const enterEditMode = useCallback(() => {
    setEditorMode(EditorMode.Edit);
    setToolMode(ToolMode.Select);
    drawing.cancelDrawing();
  }, [drawing]);

  /**
   * Switch to assembly mode
   */
  const enterAssemblyMode = useCallback(() => {
    setEditorMode(EditorMode.Assembly);
    setToolMode(ToolMode.Select);
    drawing.cancelDrawing();
  }, [drawing]);

  /**
   * Switch to geo-reference mode
   */
  const enterGeoRefMode = useCallback(() => {
    setEditorMode(EditorMode.GeoRef);
    setToolMode(ToolMode.Select);
    selection.clearSelection();
    drawing.cancelDrawing();
  }, [selection, drawing]);

  /**
   * Set editor mode directly (for flexibility)
   */
  const setEditorModeDirectly = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
  }, []);

  /**
   * Recalculate envelopes for all rooms
   * Should be called after rooms are joined/positioned in assembly mode
   */
  const recalculateAllEnvelopes = useCallback(async () => {
    // Use ref to get the absolute latest room state (even if setState hasn't flushed)
    const currentRooms = roomsRef.current;
    const currentConfig = configRef.current;
    console.log('🔄 Recalculating envelopes for', currentRooms.length, 'rooms');
    console.log('📊 Room states before envelope calculation:');
    currentRooms.forEach(r => {
      console.log(`  Room ${r.id}:`);
      console.log(`    vertices: ${r.vertices.length}`, r.vertices.map(v => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`).slice(0, 3));
      console.log(`    centerlineVertices: ${r.centerlineVertices.length}`, r.centerlineVertices.map(v => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`).slice(0, 3));
    });
    console.log('🔧 Using wall thicknesses:', {
      interior: currentConfig.defaultInteriorWallThickness,
      exterior: currentConfig.defaultExteriorWallThickness,
      miterLimit: currentConfig.miterLimit ?? 2.0
    });

    // Calculate envelopes using the latest room state (async with Clipper WebAssembly)
    const envelopeMap = await calculateFloorplanEnvelopes(
      currentRooms,
      currentConfig.miterLimit ?? 2.0,
      currentConfig.defaultInteriorWallThickness,
      currentConfig.defaultExteriorWallThickness
    );

    // Update rooms with envelope data AND auto-classified walls
    // IMPORTANT: Use roomsRef.current instead of prev to get the absolute latest state
    // This ensures constraint-solved vertices are preserved when recalculating envelopes
    const updated = roomsRef.current.map(room => {
      const result = envelopeMap.get(room.id);
      if (result) {
        console.log(`✨ Room ${room.id}: envelope updated`);
        console.log(`  → envelopeVertices: ${result.envelope.length}, debugContracted: ${result.debugContracted.length}`);

        // Use walls generated from envelope (already includes wall types and proper edge mapping)
        console.log(`  → room.vertices: ${room.vertices.length}, centerlineVertices: ${room.centerlineVertices?.length || 0}, envelope: ${result.envelope.length}`);
        console.log(`  → Using ${result.walls.length} walls from envelope (already classified)`);

        const walls = result.walls;

        console.log(`  → Wall types:`, walls.map(w => w.wallType).join(', '));

        // Check if vertices were updated by collinear vertex insertion
        let updatedRoom = {
          ...room,
          envelopeVertices: result.envelope,
          innerBoundaryVertices: result.innerBoundary,
          debugMergedCenterline: result.debugCenterline,
          debugContractedEnvelope: result.debugContracted,
          walls
        };

        if (result.updatedVertices) {
          // New vertices were inserted from merge
          console.log(`  ⭐ Vertices updated: ${room.vertices.length} → ${result.updatedVertices.length}`);
          updatedRoom = {
            ...updatedRoom,
            vertices: result.updatedVertices,
            originalVertices: room.originalVertices || [...room.vertices], // Preserve or initialize original vertices
            centerlineVertices: calculateCenterline({ ...updatedRoom, vertices: result.updatedVertices }),
            walls: generateWalls(
              result.updatedVertices,
              room.wallThickness,
              room.walls,
              room.vertices // Pass original vertices for matching
            )
          };
        } else if (room.originalVertices && room.vertices.length > room.originalVertices.length) {
          // No new vertices from merge, but room has auto-inserted vertices that should be removed
          // This happens when rooms separate OR when merge changes but doesn't create new intersections
          console.log(`  🔄 ${room.id}: Resetting to original vertices (${room.vertices.length} → ${room.originalVertices.length})`);
          updatedRoom = {
            ...updatedRoom,
            vertices: [...room.originalVertices],
            centerlineVertices: calculateCenterline({ ...updatedRoom, vertices: room.originalVertices }),
            walls: generateWalls(
              room.originalVertices,
              room.wallThickness,
              room.walls,
              room.vertices // Pass current vertices for matching
            )
          };
        }

        return updatedRoom;
      }
      return room;
    });

    // Update both state and ref
    roomsRef.current = updated;
    setRooms(updated);
  }, []);

  /**
   * Clear all rooms
   */
  const clearAll = useCallback(() => {
    setRooms([]);
    selection.clearSelection();
    drawing.cancelDrawing();
  }, [selection, drawing]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    const previousState = history.undo();
    if (previousState !== null) {
      setRooms(previousState);
      selection.clearSelection();
    }
  }, [history, selection]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    const nextState = history.redo();
    if (nextState !== null) {
      setRooms(nextState);
      selection.clearSelection();
    }
  }, [history, selection]);

  // Auto-select, calculate walls, and enter edit mode when a new room is created in Draw mode
  useEffect(() => {
    const currentRoomCount = rooms.length;
    const previousRoomCount = previousRoomCountRef.current;

    // Check if a new room was added while in Draw mode
    if (editorMode === EditorMode.Draw && currentRoomCount > previousRoomCount) {
      const newRoom = rooms[rooms.length - 1];

      console.log('🆕 New room created, auto-entering edit mode:', newRoom.id);

      // Select the newly created room
      selection.selectRoom(newRoom.id);

      // Calculate walls asynchronously
      recalculateAllEnvelopes().then(() => {
        console.log('✅ Walls calculated, entering edit mode');
        // Enter edit mode after walls are calculated
        setEditorMode(EditorMode.Edit);
        setToolMode(ToolMode.Select);
      });
    }

    // Update previous count
    previousRoomCountRef.current = currentRoomCount;
  }, [rooms.length, editorMode, selection, recalculateAllEnvelopes]);

  return {
    // State
    rooms,
    editorMode,
    toolMode,
    config,
    geoReference,
    spacePressed,

    // Hooks
    viewport,
    drawing,
    selection,

    // Room operations
    createRoom,
    updateRoom,
    deleteRoom,
    deleteSelectedRooms,
    getRoomById,
    getSelectedRoom,
    cloneRoom,
    recalculateAllEnvelopes,

    // Clipboard operations
    copySelectedRooms,
    pasteRooms,

    // Import/Export operations
    exportFloorplan,
    importFloorplan,
    saveFloorplan,

    // Configuration operations
    updateConfig,

    // GeoReference operations
    setGeoReference,

    // Mode switching
    enterDrawMode,
    enterEditMode,
    enterAssemblyMode,
    enterGeoRefMode,
    setEditorMode: setEditorModeDirectly,
    setToolMode,

    // Keyboard state
    setSpacePressed,

    // History operations
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Utilities
    clearAll
  };
}
