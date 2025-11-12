/**
 * Rooms Slice - Manages all room entities and operations
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, RoomsSlice } from '../types/store';
import type { Room, Constraint, ConstraintType } from '../../types';
import { calculateFloorplanEnvelopes } from '../../utils/geometry';
import { calculateCenterline } from '../../utils/roomJoining';
import { generateWalls } from '../../utils/walls';
import { solveRoom, calculateDOF, isOverConstrained } from '../../utils/constraintSolver';

export const createRoomsSlice: StateCreator<
  FloorplanStore,
  [['zustand/immer', never]],
  [],
  RoomsSlice
> = (set, get) => ({
  // ============================================
  // STATE
  // ============================================
  rooms: new Map<string, Room>(),
  isCalculatingEnvelopes: false,

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Create a new room
   */
  createRoom: (roomData) => {
    const id = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const room: Room = { ...roomData, id };

    set((state) => {
      state.rooms.set(id, room);
    });

    // Push to history
    get().pushHistory(`Created room ${room.name}`);

    return id;
  },

  /**
   * Update a room with partial data
   */
  updateRoom: (id, updates) => {
    set((state) => {
      const room = state.rooms.get(id);
      if (!room) return;

      const updatedRoom = { ...room, ...updates };

      // Recalculate centerlineVertices if vertices or wallThickness changed
      if (updates.vertices || updates.wallThickness || updates.walls) {
        const oldCenterline = updatedRoom.centerlineVertices;
        updatedRoom.centerlineVertices = calculateCenterline(updatedRoom);

        console.log(`🔧 updateRoom: Recalculated centerline for room ${id}`);
        console.log(`  Old centerline: ${oldCenterline.length} vertices`);
        console.log(`  New centerline: ${updatedRoom.centerlineVertices.length} vertices`);
        console.log(`  New vertices: ${updatedRoom.vertices.map(v => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`).slice(0, 3)}`);
      }

      state.rooms.set(id, updatedRoom);
    });

    // Push to history
    get().pushHistory(`Updated room`);
  },

  /**
   * Delete a room by ID
   */
  deleteRoom: (id) => {
    set((state) => {
      state.rooms.delete(id);
      // Remove from selection if selected
      const selectedIds = Array.from(state.selection.selectedRoomIds);
      if (selectedIds.includes(id)) {
        get().deselectRoom(id);
      }
    });

    // Push to history
    get().pushHistory(`Deleted room`);
  },

  /**
   * Delete multiple rooms
   */
  deleteRooms: (ids) => {
    set((state) => {
      ids.forEach(id => {
        state.rooms.delete(id);
        // Remove from selection
        const selectedIds = Array.from(state.selection.selectedRoomIds);
        if (selectedIds.includes(id)) {
          get().deselectRoom(id);
        }
      });
    });

    // Push to history
    get().pushHistory(`Deleted ${ids.length} rooms`);
  },

  /**
   * Duplicate a room
   */
  duplicateRoom: (id) => {
    const room = get().rooms.get(id);
    if (!room) return '';

    const newId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const clonedRoom: Room = {
      ...room,
      id: newId,
      name: `${room.name} (copy)`,
      position: {
        x: room.position.x + 100,
        y: room.position.y + 100
      }
    };

    set((state) => {
      state.rooms.set(newId, clonedRoom);
    });

    // Push to history
    get().pushHistory(`Duplicated room`);

    return newId;
  },

  /**
   * Merge multiple rooms
   * TODO: Implement room merging logic
   */
  mergeRooms: async (roomIds) => {
    console.log('🔀 Merging rooms:', roomIds);

    // Get rooms to merge
    const roomsToMerge = roomIds
      .map(id => get().rooms.get(id))
      .filter(r => r !== undefined) as Room[];

    if (roomsToMerge.length < 2) {
      console.warn('Need at least 2 rooms to merge');
      return;
    }

    // TODO: Implement actual merge logic
    // For now, just trigger envelope recalculation
    await get().recalculateAllEnvelopes();

    // Push to history
    get().pushHistory(`Merged ${roomIds.length} rooms`);
  },

  /**
   * Get room by ID
   */
  getRoomById: (id) => {
    return get().rooms.get(id);
  },

  /**
   * Get all rooms as array
   */
  getAllRooms: () => {
    return Array.from(get().rooms.values());
  },

  /**
   * Update an aperture (door or window) on a wall
   */
  updateAperture: (roomId, wallIndex, apertureId, updates) => {
    set((state) => {
      const room = state.rooms.get(roomId);
      if (!room) {
        console.warn(`Room ${roomId} not found`);
        return;
      }

      const wall = room.walls[wallIndex];
      if (!wall) {
        console.warn(`Wall ${wallIndex} not found in room ${roomId}`);
        return;
      }

      if (!wall.apertures) {
        console.warn(`Wall ${wallIndex} has no apertures`);
        return;
      }

      const apertureIndex = wall.apertures.findIndex(a => a.id === apertureId);
      if (apertureIndex === -1) {
        console.warn(`Aperture ${apertureId} not found on wall ${wallIndex}`);
        return;
      }

      // Update the aperture
      wall.apertures[apertureIndex] = {
        ...wall.apertures[apertureIndex],
        ...updates
      };

      console.log(`✅ Updated aperture ${apertureId} on wall ${wallIndex} of room ${roomId}`);
    });

    // Push to history
    get().pushHistory(`Updated aperture`);
  },

  /**
   * Move an aperture from one wall to another (within the same room)
   * Can also update its position (distance/anchor) in the process
   */
  moveAperture: (roomId, sourceWallIndex, targetWallIndex, apertureId, newDistance, newAnchor) => {
    set((state) => {
      const room = state.rooms.get(roomId);
      if (!room) {
        console.warn(`Room ${roomId} not found`);
        return;
      }

      const sourceWall = room.walls[sourceWallIndex];
      if (!sourceWall || !sourceWall.apertures) {
        console.warn(`Source wall ${sourceWallIndex} not found or has no apertures`);
        return;
      }

      const apertureIndex = sourceWall.apertures.findIndex(a => a.id === apertureId);
      if (apertureIndex === -1) {
        console.warn(`Aperture ${apertureId} not found on source wall ${sourceWallIndex}`);
        return;
      }

      // Get the aperture to move
      const aperture = { ...sourceWall.apertures[apertureIndex] };

      // Remove from source wall
      sourceWall.apertures = sourceWall.apertures.filter(a => a.id !== apertureId);

      // Update position
      aperture.distance = newDistance;
      aperture.anchorVertex = newAnchor;

      // Add to target wall
      const targetWall = room.walls[targetWallIndex];
      if (!targetWall) {
        console.warn(`Target wall ${targetWallIndex} not found`);
        // Restore aperture to source wall
        sourceWall.apertures.push(aperture);
        return;
      }

      if (!targetWall.apertures) {
        targetWall.apertures = [];
      }

      targetWall.apertures.push(aperture);

      console.log(`✅ Moved aperture ${apertureId} from wall ${sourceWallIndex} to wall ${targetWallIndex} at distance ${newDistance}m (anchor: ${newAnchor})`);
    });

    // Push to history
    get().pushHistory(`Moved aperture`);
  },

  /**
   * Move an aperture from one room's wall to another room's wall (cross-room)
   */
  moveApertureCrossRoom: (sourceRoomId, sourceWallIndex, targetRoomId, targetWallIndex, apertureId, newDistance, newAnchor) => {
    set((state) => {
      const sourceRoom = state.rooms.get(sourceRoomId);
      const targetRoom = state.rooms.get(targetRoomId);

      if (!sourceRoom || !targetRoom) {
        console.warn(`Source room ${sourceRoomId} or target room ${targetRoomId} not found`);
        return;
      }

      const sourceWall = sourceRoom.walls[sourceWallIndex];
      if (!sourceWall || !sourceWall.apertures) {
        console.warn(`Source wall ${sourceWallIndex} not found or has no apertures`);
        return;
      }

      const apertureIndex = sourceWall.apertures.findIndex(a => a.id === apertureId);
      if (apertureIndex === -1) {
        console.warn(`Aperture ${apertureId} not found on source wall ${sourceWallIndex}`);
        return;
      }

      // Get the aperture to move
      const aperture = { ...sourceWall.apertures[apertureIndex] };

      // Remove from source wall
      sourceWall.apertures = sourceWall.apertures.filter(a => a.id !== apertureId);

      // Update position
      aperture.distance = newDistance;
      aperture.anchorVertex = newAnchor;

      // Add to target wall in target room
      const targetWall = targetRoom.walls[targetWallIndex];
      if (!targetWall) {
        console.warn(`Target wall ${targetWallIndex} not found`);
        // Restore aperture to source wall
        sourceWall.apertures.push(aperture);
        return;
      }

      if (!targetWall.apertures) {
        targetWall.apertures = [];
      }

      targetWall.apertures.push(aperture);

      console.log(`✅ Moved aperture ${apertureId} from room ${sourceRoomId} wall ${sourceWallIndex} to room ${targetRoomId} wall ${targetWallIndex}`);
    });

    // Push to history
    get().pushHistory(`Moved aperture between rooms`);
  },

  /**
   * Delete an aperture (door or window) from a wall
   */
  deleteAperture: (roomId, wallIndex, apertureId) => {
    set((state) => {
      const room = state.rooms.get(roomId);
      if (!room) {
        console.warn(`Room ${roomId} not found`);
        return;
      }

      const wall = room.walls[wallIndex];
      if (!wall) {
        console.warn(`Wall ${wallIndex} not found in room ${roomId}`);
        return;
      }

      if (!wall.apertures) {
        console.warn(`Wall ${wallIndex} has no apertures`);
        return;
      }

      // Remove the aperture
      wall.apertures = wall.apertures.filter(a => a.id !== apertureId);

      console.log(`🗑️ Deleted aperture ${apertureId} from wall ${wallIndex} of room ${roomId}`);
    });

    // Clear aperture selection if this aperture was selected
    const selection = get().selection;
    if (selection.selectedApertureId === apertureId) {
      get().clearApertureSelection();
    }

    // Push to history
    get().pushHistory(`Deleted aperture`);
  },

  // ============================================
  // CONSTRAINT ACTIONS
  // ============================================

  /**
   * Add a constraint to a room and auto-solve
   */
  addConstraint: async (roomId, constraint, autoSolve = true) => {
    const room = get().rooms.get(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found`);
      return;
    }

    // Add constraint to room
    const updatedRoom = {
      ...room,
      constraints: [...room.constraints, constraint]
    };

    // Auto-solve if requested
    if (autoSolve) {
      try {
        console.log('🔧 Auto-solving constraints after adding...');
        const solvedRoom = await solveRoom(updatedRoom);

        console.log('✅ Constraint solved, updating room vertices...');
        console.log('  Old vertices:', room.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', '));
        console.log('  New vertices:', solvedRoom.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', '));

        // Update room with solved geometry
        set((state) => {
          const currentRoom = state.rooms.get(roomId);
          if (!currentRoom) return;

          const finalRoom = {
            ...currentRoom,
            vertices: solvedRoom.vertices,
            originalVertices: solvedRoom.vertices.map(v => ({ ...v })), // Update original vertices after solve
            walls: solvedRoom.walls,
            constraints: solvedRoom.constraints,
            primitives: solvedRoom.primitives,
            centerlineVertices: calculateCenterline(solvedRoom)
          };

          state.rooms.set(roomId, finalRoom);
        });

        // Recalculate envelopes after constraint solving
        console.log('🔄 Recalculating envelopes after constraint solving...');
        await get().recalculateAllEnvelopes();
        console.log('✨ Envelope recalculation complete');
      } catch (error) {
        console.error('Error auto-solving after adding constraint:', error);
        // Fallback: just add the constraint without solving
        set((state) => {
          state.rooms.set(roomId, updatedRoom);
        });
      }
    } else {
      // Just add the constraint without solving
      set((state) => {
        state.rooms.set(roomId, updatedRoom);
      });
    }

    // Push to history
    get().pushHistory(`Added constraint`);
  },

  /**
   * Remove a constraint from a room
   */
  removeConstraint: (roomId, constraintId) => {
    set((state) => {
      const room = state.rooms.get(roomId);
      if (!room) {
        console.warn(`Room ${roomId} not found`);
        return;
      }

      const updatedRoom = {
        ...room,
        constraints: room.constraints.filter(c => c.id !== constraintId)
      };

      state.rooms.set(roomId, updatedRoom);
    });

    // Push to history
    get().pushHistory(`Removed constraint`);
  },

  /**
   * Toggle constraint enabled state and auto-solve
   */
  toggleConstraint: async (roomId, constraintId) => {
    const room = get().rooms.get(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found`);
      return;
    }

    const updatedRoom = {
      ...room,
      constraints: room.constraints.map(c =>
        c.id === constraintId ? { ...c, enabled: !c.enabled } : c
      )
    };

    try {
      console.log('🔧 Auto-solving constraints after toggling...');
      const solvedRoom = await solveRoom(updatedRoom);

      // Update room with solved geometry
      set((state) => {
        const currentRoom = state.rooms.get(roomId);
        if (!currentRoom) return;

        const finalRoom = {
          ...currentRoom,
          vertices: solvedRoom.vertices,
          walls: solvedRoom.walls,
          constraints: solvedRoom.constraints,
          primitives: solvedRoom.primitives,
          centerlineVertices: calculateCenterline(solvedRoom)
        };

        state.rooms.set(roomId, finalRoom);
      });

      // Recalculate envelopes after constraint solving
      console.log('🔄 Recalculating envelopes after toggling constraint...');
      await get().recalculateAllEnvelopes();
    } catch (error) {
      console.error('Error auto-solving after toggling constraint:', error);
      // Fallback: just toggle without solving
      set((state) => {
        state.rooms.set(roomId, updatedRoom);
      });
    }

    // Push to history
    get().pushHistory(`Toggled constraint`);
  },

  /**
   * Solve constraints for a room
   */
  solveRoomConstraints: async (roomId) => {
    const room = get().rooms.get(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found`);
      return;
    }

    try {
      console.log('🔧 Solving constraints manually...');
      const solvedRoom = await solveRoom(room);

      // Update room with solved geometry
      set((state) => {
        const currentRoom = state.rooms.get(roomId);
        if (!currentRoom) return;

        const finalRoom = {
          ...currentRoom,
          vertices: solvedRoom.vertices,
          originalVertices: solvedRoom.vertices.map(v => ({ ...v })), // Update original vertices after solve
          walls: solvedRoom.walls,
          constraints: solvedRoom.constraints,
          primitives: solvedRoom.primitives,
          centerlineVertices: calculateCenterline(solvedRoom)
        };

        state.rooms.set(roomId, finalRoom);
      });

      // Recalculate envelopes after constraint solving
      console.log('🔄 Recalculating envelopes after manual constraint solving...');
      await get().recalculateAllEnvelopes();
    } catch (error) {
      console.error('Error solving constraints:', error);
    }

    // Push to history
    get().pushHistory(`Solved constraints`);
  },

  /**
   * Clear all constraints from a room
   */
  clearAllConstraints: (roomId) => {
    set((state) => {
      const room = state.rooms.get(roomId);
      if (!room) {
        console.warn(`Room ${roomId} not found`);
        return;
      }

      const updatedRoom = {
        ...room,
        constraints: [],
        primitives: undefined
      };

      state.rooms.set(roomId, updatedRoom);
    });

    // Push to history
    get().pushHistory(`Cleared all constraints`);
  },

  /**
   * Calculate degrees of freedom for a room
   */
  getRoomDOF: (roomId) => {
    const room = get().rooms.get(roomId);
    if (!room) return null;
    return calculateDOF(room);
  },

  /**
   * Check if a room is over-constrained
   */
  isRoomOverConstrained: (roomId) => {
    const room = get().rooms.get(roomId);
    if (!room) return false;
    return isOverConstrained(room);
  },

  /**
   * Recalculate envelopes for all rooms
   * Should be called after rooms are joined/positioned in assembly mode
   */
  recalculateAllEnvelopes: async () => {
    const currentRooms = get().getAllRooms();
    const currentConfig = get().config;

    set((state) => {
      state.isCalculatingEnvelopes = true;
    });

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
    set((state) => {
      currentRooms.forEach(room => {
        const result = envelopeMap.get(room.id);
        if (!result) return;

        // Get FRESH room data from store (not the captured old data)
        const freshRoom = state.rooms.get(room.id);
        if (!freshRoom) return;

        console.log(`✨ Room ${room.id}: envelope updated`);
        console.log(`  → envelopeVertices: ${result.envelope.length}, debugContracted: ${result.debugContracted.length}`);
        console.log(`  → room.vertices: ${freshRoom.vertices.length}, centerlineVertices: ${freshRoom.centerlineVertices?.length || 0}, envelope: ${result.envelope.length}`);
        console.log(`  → Using ${result.walls.length} walls from envelope (already classified)`);
        console.log(`  → Wall types:`, result.walls.map(w => w.wallType).join(', '));

        // Start with envelope data - use FRESH room data
        let updatedRoom: Room = {
          ...freshRoom,
          envelopeVertices: result.envelope,
          innerBoundaryVertices: result.innerBoundary,
          debugMergedCenterline: result.debugCenterline,
          debugContractedEnvelope: result.debugContracted,
          walls: result.walls
        };

        // Check if vertices were updated by collinear vertex insertion
        if (result.updatedVertices) {
          // New vertices were inserted from merge
          console.log(`  ⭐ Vertices updated: ${freshRoom.vertices.length} → ${result.updatedVertices.length}`);
          updatedRoom = {
            ...updatedRoom,
            vertices: result.updatedVertices,
            originalVertices: freshRoom.originalVertices || [...freshRoom.vertices], // Preserve or initialize original vertices
            centerlineVertices: calculateCenterline({ ...updatedRoom, vertices: result.updatedVertices }),
            walls: generateWalls(
              result.updatedVertices,
              freshRoom.wallThickness,
              freshRoom.walls,
              freshRoom.vertices // Pass original vertices for matching
            ),
            constraints: freshRoom.constraints, // Preserve constraints
            primitives: freshRoom.primitives     // Preserve primitives
          };
        } else if (freshRoom.originalVertices && freshRoom.vertices.length > freshRoom.originalVertices.length) {
          // No new vertices from merge, but room has auto-inserted vertices that should be removed
          console.log(`  🔄 ${freshRoom.id}: Resetting to original vertices (${freshRoom.vertices.length} → ${freshRoom.originalVertices.length})`);
          updatedRoom = {
            ...updatedRoom,
            vertices: [...freshRoom.originalVertices],
            centerlineVertices: calculateCenterline({ ...updatedRoom, vertices: freshRoom.originalVertices }),
            walls: generateWalls(
              freshRoom.originalVertices,
              freshRoom.wallThickness,
              freshRoom.walls,
              freshRoom.vertices // Pass current vertices for matching
            ),
            constraints: freshRoom.constraints, // Preserve constraints
            primitives: freshRoom.primitives     // Preserve primitives
          };
        }

        state.rooms.set(room.id, updatedRoom);
      });

      state.isCalculatingEnvelopes = false;
    });

    console.log('✅ Envelope calculation complete');
  }
});
