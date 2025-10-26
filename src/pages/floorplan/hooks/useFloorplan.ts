/**
 * useFloorplan hook - main hook that orchestrates all floorplan functionality
 * Replaces the ECS World and manages all state
 */

import { useState, useCallback, useEffect } from 'react';
import { Room, EditorMode, ToolMode, GridConfig } from '../types';
import { useViewport } from './useViewport';
import { useDrawing } from './useDrawing';
import { useSelection } from './useSelection';
import { useHistory } from './useHistory';

const DEFAULT_GRID_CONFIG: GridConfig = {
  enabled: true,
  size: 50, // 50cm grid
  majorLines: 5, // Major line every 250cm (2.5m)
  snapEnabled: true
};

export function useFloorplan() {
  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);

  // History for undo/redo
  const history = useHistory<Room[]>([], 50);

  // Editor state
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Draw);
  const [toolMode, setToolMode] = useState<ToolMode>(ToolMode.DrawRoom);
  const [gridConfig, setGridConfig] = useState<GridConfig>(DEFAULT_GRID_CONFIG);

  // Keyboard state
  const [spacePressed, setSpacePressed] = useState(false);

  // Clipboard state
  const [clipboard, setClipboard] = useState<Room[]>([]);
  const [pasteOffset, setPasteOffset] = useState(0); // For multiple paste operations

  // Hooks
  const viewport = useViewport();
  const selection = useSelection();

  // Push to history whenever rooms change
  useEffect(() => {
    history.pushState(rooms, 'Room update');
  }, [rooms]);

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
    gridConfig,
    viewport.viewport.zoom,
    createRoom
  );

  /**
   * Update a room
   */
  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, ...updates } : room
    ));
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
      rooms,
      gridConfig
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `floorplan-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rooms, gridConfig]);

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

        // Import rooms
        setRooms(data.rooms);

        // Import grid config if present
        if (data.gridConfig) {
          setGridConfig(data.gridConfig);
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
   * Update grid configuration
   */
  const updateGridConfig = useCallback((updates: Partial<GridConfig>) => {
    setGridConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Toggle grid visibility
   */
  const toggleGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  /**
   * Toggle grid snap
   */
  const toggleGridSnap = useCallback(() => {
    setGridConfig(prev => ({ ...prev, snapEnabled: !prev.snapEnabled }));
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

  return {
    // State
    rooms,
    editorMode,
    toolMode,
    gridConfig,
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

    // Clipboard operations
    copySelectedRooms,
    pasteRooms,

    // Import/Export operations
    exportFloorplan,
    importFloorplan,

    // Grid operations
    updateGridConfig,
    toggleGrid,
    toggleGridSnap,

    // Mode switching
    enterDrawMode,
    enterEditMode,
    enterAssemblyMode,
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
