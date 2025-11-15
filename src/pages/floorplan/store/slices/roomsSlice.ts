/**
 * Rooms Slice - Manages all room entities and operations
 */

import type { StateCreator } from 'zustand';
import type { FloorplanStore, RoomsSlice } from '../types/store';
import type { Room, Constraint, ConstraintType } from '../../types';
import { calculateFloorplanEnvelopes } from '../../utils/geometry';
import { calculateCenterline } from '../../utils/roomJoining';
import { solveRoom, calculateDOF, isOverConstrained } from '../../utils/constraintSolver';
import { calculateWallSegmentsForAllRooms } from '../../utils/wallSegments';

/**
 * Helper function to calculate aperture thickness based on wall segments
 * Same logic as getApertureThickness in rendering/apertures.ts
 */
function calculateApertureThickness(
  aperture: any,
  wall: any,
  wallLength: number,
  room: any
): { thickness: number; segmentId: string | undefined } {
  // Calculate aperture center position along wall in cm
  const apertureWidthCm = aperture.width * 100;
  let startDistCm: number;
  if (aperture.anchorVertex === 'end') {
    startDistCm = wallLength - (aperture.distance * 100) - apertureWidthCm;
  } else {
    startDistCm = aperture.distance * 100;
  }
  const apertureCenterDistCm = startDistCm + apertureWidthCm / 2;

  // Default to wall thickness if no segments
  if (!wall.segments || wall.segments.length === 0) {
    return { thickness: wall.thickness || 20, segmentId: undefined };
  }

  // Get segment vertices from room.segmentVertices
  // Calculate actual segment lengths and boundaries
  const wallStartIdx = wall.vertexIndex;
  const wallEndIdx = (wall.vertexIndex + 1) % room.vertices.length;

  // Find segment vertices that belong to this wall
  // We need to calculate the cumulative distance along the wall
  let cumulativeDistance = 0;

  for (let i = 0; i < wall.segments.length; i++) {
    const segment = wall.segments[i];

    // Get segment start and end vertices from room.segmentVertices
    const startVertex = room.segmentVertices?.find((v: any) => v.id === segment.startVertexId);
    const endVertex = room.segmentVertices?.find((v: any) => v.id === segment.endVertexId);

    if (!startVertex || !endVertex) {
      // Fallback: assume equal distribution if vertices not found
      const segmentSize = 1.0 / wall.segments.length;
      const segmentStart = i * segmentSize;
      const segmentEnd = (i + 1) * segmentSize;
      const apertureCenterRatio = apertureCenterDistCm / wallLength;

      if (apertureCenterRatio >= segmentStart && apertureCenterRatio < segmentEnd) {
        const isExterior = segment.wallType === 'exterior';
        return {
          thickness: isExterior ? 30 : 15,
          segmentId: segment.id
        };
      }
      continue;
    }

    // Calculate segment length
    const dx = endVertex.x - startVertex.x;
    const dy = endVertex.y - startVertex.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    const segmentStartDist = cumulativeDistance;
    const segmentEndDist = cumulativeDistance + segmentLength;

    // Check if aperture center falls in this segment
    if (apertureCenterDistCm >= segmentStartDist && apertureCenterDistCm < segmentEndDist) {
      const isExterior = segment.wallType === 'exterior';
      return {
        thickness: isExterior ? 30 : 15,
        segmentId: segment.id
      };
    }

    cumulativeDistance += segmentLength;
  }

  // Fallback to last segment
  const lastSegment = wall.segments[wall.segments.length - 1];
  const isExterior = lastSegment.wallType === 'exterior';
  return {
    thickness: isExterior ? 30 : 15,
    segmentId: lastSegment.id
  };
}

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

    // Assign to active level (or default level if not specified)
    const activeLevel = get().activeLevel;
    const levelId = roomData.levelId || activeLevel || 'default-ground-floor';

    const room: Room = { ...roomData, id, createdAt: Date.now(), levelId };

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
        updatedRoom.centerlineVertices = calculateCenterline(updatedRoom).vertices;

        // console.log(`🔧 updateRoom: Recalculated centerline for room ${id}`);
        // console.log(`  Old centerline: ${oldCenterline.length} vertices`);
        // console.log(`  New centerline: ${updatedRoom.centerlineVertices.length} vertices`);
        // console.log(`  New vertices: ${updatedRoom.vertices.map(v => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`).slice(0, 3)}`);
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
      createdAt: Date.now(),
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
    // console.log('🔀 Merging rooms:', roomIds);

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

      // console.log(`✅ Updated aperture ${apertureId} on wall ${wallIndex} of room ${roomId}`);
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

      // console.log(`✅ Moved aperture ${apertureId} from wall ${sourceWallIndex} to wall ${targetWallIndex} at distance ${newDistance}m (anchor: ${newAnchor})`);
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

      // console.log(`✅ Moved aperture ${apertureId} from room ${sourceRoomId} wall ${sourceWallIndex} to room ${targetRoomId} wall ${targetWallIndex}`);
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

      // console.log(`🗑️ Deleted aperture ${apertureId} from wall ${wallIndex} of room ${roomId}`);
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
        // console.log('🔧 Auto-solving constraints after adding...');
        const solvedRoom = await solveRoom(updatedRoom);

        // console.log('✅ Constraint solved, updating room vertices...');
        // console.log('  Old vertices:', room.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', '));
        // console.log('  New vertices:', solvedRoom.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', '));

        // Update room with solved geometry
        set((state) => {
          const currentRoom = state.rooms.get(roomId);
          if (!currentRoom) return;

          // Use Immer direct mutations - walls stay unchanged since vertex IDs are stable!
          currentRoom.vertices = solvedRoom.vertices;
          currentRoom.originalVertices = solvedRoom.vertices.map(v => ({ ...v })); // Update original vertices after solve
          // walls stay unchanged - vertex IDs remain stable during constraint solving
          currentRoom.constraints = solvedRoom.constraints;
          currentRoom.primitives = solvedRoom.primitives;
          currentRoom.centerlineVertices = calculateCenterline(solvedRoom).vertices;
        });

        // Recalculate envelopes after constraint solving
        // console.log('🔄 Recalculating envelopes after constraint solving...');
        await get().recalculateAllEnvelopes();
        // console.log('✨ Envelope recalculation complete');
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
      // console.log('🔧 Auto-solving constraints after toggling...');
      const solvedRoom = await solveRoom(updatedRoom);

      // Update room with solved geometry
      set((state) => {
        const currentRoom = state.rooms.get(roomId);
        if (!currentRoom) return;

        // Use Immer direct mutations - walls stay unchanged since vertex IDs are stable!
        currentRoom.vertices = solvedRoom.vertices;
        // walls stay unchanged - vertex IDs remain stable during constraint solving
        currentRoom.constraints = solvedRoom.constraints;
        currentRoom.primitives = solvedRoom.primitives;
        currentRoom.centerlineVertices = calculateCenterline(solvedRoom).vertices;
      });

      // Recalculate envelopes after constraint solving
      // console.log('🔄 Recalculating envelopes after toggling constraint...');
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
      // console.log('🔧 Solving constraints manually...');
      const solvedRoom = await solveRoom(room);

      // Update room with solved geometry
      set((state) => {
        const currentRoom = state.rooms.get(roomId);
        if (!currentRoom) return;

        // Use Immer direct mutations - walls stay unchanged since vertex IDs are stable!
        currentRoom.vertices = solvedRoom.vertices;
        currentRoom.originalVertices = solvedRoom.vertices.map(v => ({ ...v })); // Update original vertices after solve
        // walls stay unchanged - vertex IDs remain stable during constraint solving
        currentRoom.constraints = solvedRoom.constraints;
        currentRoom.primitives = solvedRoom.primitives;
        currentRoom.centerlineVertices = calculateCenterline(solvedRoom).vertices;
      });

      // Recalculate envelopes after constraint solving
      // console.log('🔄 Recalculating envelopes after manual constraint solving...');
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
    set((state) => {
      state.isCalculatingEnvelopes = true;
    });

    const currentConfig = get().config;
    const currentRooms = get().getAllRooms(); // Get fresh data right before async call

    // console.log('🔄 Recalculating envelopes for', currentRooms.length, 'rooms');
    // console.log('🔧 Using wall thicknesses:', {
    //   interior: currentConfig.defaultInteriorWallThickness,
    //   exterior: currentConfig.defaultExteriorWallThickness,
    //   miterLimit: currentConfig.miterLimit ?? 2.0
    // });

    // Calculate envelopes per level to avoid merging rooms across different floors
    // Group rooms by level first
    const roomsByLevel = new Map<string, Room[]>();
    currentRooms.forEach(room => {
      if (!roomsByLevel.has(room.levelId)) {
        roomsByLevel.set(room.levelId, []);
      }
      roomsByLevel.get(room.levelId)!.push(room);
    });

    // Calculate envelopes for each level separately
    const envelopeMap = new Map<string, any>();
    const envelopesByLevel = new Map<string, any[]>(); // Track which envelopes belong to which level
    const allContractedEnvelopes: any[] = [];

    for (const [levelId, levelRooms] of roomsByLevel.entries()) {
      console.log(`🏗️ Calculating envelopes for level ${levelId} with ${levelRooms.length} room(s)`);

      const { envelopeMap: levelEnvelopeMap, floorplanContractedEnvelopes: levelContractedEnvelopes } =
        await calculateFloorplanEnvelopes(
          levelRooms,
          currentConfig.miterLimit ?? 2.0,
          currentConfig.defaultInteriorWallThickness,
          currentConfig.defaultExteriorWallThickness
        );

      // Merge envelope maps
      levelEnvelopeMap.forEach((value, key) => {
        envelopeMap.set(key, value);
      });

      // Store envelopes per level
      envelopesByLevel.set(levelId, levelContractedEnvelopes);

      // Collect contracted envelopes for global visualization
      allContractedEnvelopes.push(...levelContractedEnvelopes);
    }

    const floorplanContractedEnvelopes = allContractedEnvelopes;

    // Update rooms with envelope data - work entirely with fresh state data inside transaction
    set((state) => {
      // Don't iterate over stale snapshot - use fresh state
      state.rooms.forEach((freshRoom, roomId) => {
        const result = envelopeMap.get(roomId);
        if (!result) return;

        // console.log(`✨ Room ${roomId}: envelope updated`);
        // console.log(`  → envelopeVertices: ${result.envelope.length}, debugContracted: ${result.debugContracted.length}`);
        // console.log(`  → room.vertices: ${freshRoom.vertices.length}, centerlineVertices: ${freshRoom.centerlineVertices?.length || 0}, envelope: ${result.envelope.length}`);
        // console.log(`  → Keeping existing ${freshRoom.walls.length} walls (tied to room.vertices, not envelope)`);

        // Build updated room object - MUST replace entire object to trigger Zustand reactivity
        const updatedRoom = {
          ...freshRoom,
          envelopeVertices: result.envelope,
          innerBoundaryVertices: result.innerBoundary,
          debugMergedCenterline: result.debugCenterline,
          debugContractedEnvelope: result.debugContracted
        };

        // Store assembly vertices if provided (collinear points for envelope calculation only)
        if (result.updatedVertices) {
          // console.log(`  ⭐ Assembly vertices: ${freshRoom.vertices.length} → ${result.updatedVertices.length} (collinear points inserted for envelope)`);
          updatedRoom.assemblyVertices = result.updatedVertices;

          // Recalculate centerline using the new assembly vertices (with reference points)
          // This ensures the pink centerline and subsequent envelope calculations use the collinear points
          updatedRoom.centerlineVertices = calculateCenterline(updatedRoom).vertices;
          // console.log(`  ↻ Recalculated centerline: ${updatedRoom.centerlineVertices.length} vertices (using assembly vertices with reference points)`);

          // NEVER modify updatedRoom.vertices or updatedRoom.walls during envelope update!
        } else if (freshRoom.assemblyVertices) {
          // Clear assembly vertices if no longer needed
          updatedRoom.assemblyVertices = undefined;

          // Recalculate centerline using geometry vertices only
          updatedRoom.centerlineVertices = calculateCenterline(updatedRoom).vertices;
          // console.log(`  ↻ Recalculated centerline: ${updatedRoom.centerlineVertices.length} vertices (using geometry vertices only)`);
        }

        // Replace entire room object to trigger Map change detection
        state.rooms.set(roomId, updatedRoom);
      });

      // Store floorplan-level contracted envelopes for visualization
      // These are already in world coordinates and merged per building group
      state.contractedEnvelopes = floorplanContractedEnvelopes;
      console.log(`📐 Floorplan has ${floorplanContractedEnvelopes.length} contracted envelope(s) (one per building group)`);

      // Calculate wall segments based on contracted envelope intersections
      // IMPORTANT: Calculate per level to avoid merging rooms across different floors
      if (floorplanContractedEnvelopes.length > 0) {
        console.log('🔷 Calculating wall segments (per level)...');

        // Group rooms by level
        const roomsByLevelForSegments = new Map<string, Room[]>();
        Array.from(state.rooms.values()).forEach(room => {
          if (!roomsByLevelForSegments.has(room.levelId)) {
            roomsByLevelForSegments.set(room.levelId, []);
          }
          roomsByLevelForSegments.get(room.levelId)!.push(room);
        });

        // Calculate segments for each level separately using ONLY that level's envelopes
        const allUpdatedRooms: Room[] = [];
        for (const [levelId, levelRooms] of roomsByLevelForSegments.entries()) {
          console.log(`  🏗️ Processing level ${levelId} with ${levelRooms.length} room(s)`);

          // Get the contracted envelopes for this specific level
          const levelEnvelopes = envelopesByLevel.get(levelId) || [];

          // Calculate segments using only this level's envelopes
          const roomsWithSegments = calculateWallSegmentsForAllRooms(levelRooms, levelEnvelopes);
          allUpdatedRooms.push(...roomsWithSegments);
        }

        // Use the updated rooms
        const roomsWithSegments = allUpdatedRooms;

        // Update rooms with calculated segments
        // IMPORTANT: Replace the entire room object to trigger Zustand reactivity
        roomsWithSegments.forEach(updatedRoom => {
          if (!updatedRoom) return;
          const freshRoom = state.rooms.get(updatedRoom.id);
          if (freshRoom) {
            // Replace entire room object to trigger Map change detection
            state.rooms.set(updatedRoom.id, {
              ...freshRoom,
              walls: updatedRoom.walls,
              segmentVertices: updatedRoom.segmentVertices
            });
            const totalSegments = updatedRoom.walls.reduce((sum, wall) => sum + (wall.segments?.length || 0), 0);
            console.log(`  Room ${updatedRoom.id}: ${totalSegments} segments across ${updatedRoom.walls.length} walls`);
          }
        });
        // console.log('✨ Wall segments calculated');

        // Calculate and store thickness for all doors after segments are updated
        const roomsArrayForThickness = Array.from(state.rooms.values());
        for (const room of roomsArrayForThickness) {
          if (!room.walls) continue;

          let roomThicknessModified = false;
          const updatedWallsWithThickness = room.walls.map(wall => {
            if (!wall.apertures || wall.apertures.length === 0) return wall;

            // Calculate wall length
            const v1Local = room.vertices[wall.vertexIndex];
            const v2Local = room.vertices[(wall.vertexIndex + 1) % room.vertices.length];
            const dx = v2Local.x - v1Local.x;
            const dy = v2Local.y - v1Local.y;
            const wallLength = Math.sqrt(dx * dx + dy * dy);

            let wallModified = false;
            const updatedApertures = wall.apertures.map(aperture => {
              // Calculate thickness and segmentId for this aperture based on wall segments
              const { thickness: calculatedThickness, segmentId: calculatedSegmentId } =
                calculateApertureThickness(aperture, wall, wallLength, room);

              // Only update if thickness or segmentId changed
              if (aperture.thickness !== calculatedThickness || aperture.segmentId !== calculatedSegmentId) {
                wallModified = true;
                roomThicknessModified = true;
                return {
                  ...aperture,
                  thickness: calculatedThickness,
                  segmentId: calculatedSegmentId
                };
              }
              return aperture;
            });

            if (wallModified) {
              return {
                ...wall,
                apertures: updatedApertures
              };
            }
            return wall;
          });

          if (roomThicknessModified) {
            // Update room with new thickness values
            state.rooms.set(room.id, {
              ...room,
              walls: updatedWallsWithThickness
            });
          }
        }

        // Sync paired doors properties after wall segments are calculated
        // Helper: Calculate door center in world coordinates
        const getDoorCenter = (room: Room, wallIndex: number, aperture: any) => {
          const wall = room.walls[wallIndex];
          if (!wall) return null;

          const vertices = room.vertices;
          const v1Local = vertices[wall.vertexIndex];
          const v2Local = vertices[(wall.vertexIndex + 1) % vertices.length];

          // Transform to world
          const localToWorld = (v: any) => ({
            x: (v.x * Math.cos(room.rotation) - v.y * Math.sin(room.rotation)) * room.scale + room.position.x,
            y: (v.x * Math.sin(room.rotation) + v.y * Math.cos(room.rotation)) * room.scale + room.position.y
          });

          const v1 = localToWorld(v1Local);
          const v2 = localToWorld(v2Local);

          const dx = v2.x - v1.x;
          const dy = v2.y - v1.y;
          const wallLength = Math.sqrt(dx * dx + dy * dy);

          const anchorPos = aperture.anchorVertex === 'start' ? v1 : v2;
          const direction = aperture.anchorVertex === 'start' ? 1 : -1;

          return {
            x: anchorPos.x + (dx / wallLength) * aperture.distance * direction,
            y: anchorPos.y + (dy / wallLength) * aperture.distance * direction
          };
        };

        // Process each room to sync paired doors
        const roomsArray = Array.from(state.rooms.values());
        console.log('🔄 Starting door sync for', roomsArray.length, 'rooms');
        for (const currentRoom of roomsArray) {
          if (!currentRoom.walls) continue;

          let roomModified = false;
          const updatedWalls = [...currentRoom.walls];
          const segmentsBeforeSync = currentRoom.walls.reduce((sum, wall) => sum + (wall.segments?.length || 0), 0);
          console.log(`  Room ${currentRoom.id}: ${segmentsBeforeSync} segments BEFORE sync`);

          for (let wallIndex = 0; wallIndex < currentRoom.walls.length; wallIndex++) {
            const wall = currentRoom.walls[wallIndex];
            if (!wall.apertures) continue;

            let wallModified = false;
            const updatedApertures = [...wall.apertures];

            for (let apertureIndex = 0; apertureIndex < wall.apertures.length; apertureIndex++) {
              const aperture = wall.apertures[apertureIndex];
              if (aperture.type !== 'door') continue;

              const currentCenter = getDoorCenter(currentRoom, wallIndex, aperture);
              if (!currentCenter) continue;

              // Check against all other rooms
              for (const otherRoom of roomsArray) {
                if (otherRoom.id === currentRoom.id) continue;
                if (!otherRoom.walls) continue;

                for (let otherWallIndex = 0; otherWallIndex < otherRoom.walls.length; otherWallIndex++) {
                  const otherWall = otherRoom.walls[otherWallIndex];
                  if (!otherWall.apertures) continue;

                  for (const otherAperture of otherWall.apertures) {
                    if (otherAperture.type !== 'door') continue;

                    const otherCenter = getDoorCenter(otherRoom, otherWallIndex, otherAperture);
                    if (!otherCenter) continue;

                    // Check if doors are at same position (within 5px)
                    const dist = Math.sqrt(
                      (currentCenter.x - otherCenter.x) ** 2 + (currentCenter.y - otherCenter.y) ** 2
                    );

                    if (dist < 5) {
                      // Found paired door - determine which room is older
                      const currentIsOlder = (currentRoom.createdAt || 0) < (otherRoom.createdAt || 0);
                      console.log(`    🚪 Found paired door: current=${currentRoom.id}(${currentRoom.createdAt}), other=${otherRoom.id}(${otherRoom.createdAt}), currentIsOlder=${currentIsOlder}`);

                      if (!currentIsOlder) {
                        // Other room is older - copy its properties to current room's door
                        console.log(`      → Copying from ${otherRoom.id} to ${currentRoom.id}`);
                        updatedApertures[apertureIndex] = {
                          ...aperture,
                          width: otherAperture.width,
                          height: otherAperture.height,
                          distance: otherAperture.distance,
                          anchorVertex: otherAperture.anchorVertex,
                          sillHeight: otherAperture.sillHeight,
                          thickness: otherAperture.thickness,
                          segmentId: otherAperture.segmentId,
                          flipHorizontal: otherAperture.flipHorizontal,
                          flipVertical: otherAperture.flipVertical,
                          cristal: otherAperture.cristal,
                          color: otherAperture.color,
                          material: otherAperture.material,
                          persiana: otherAperture.persiana,
                          porcentajeMarco: otherAperture.porcentajeMarco
                        };
                        wallModified = true;
                        roomModified = true;
                      }
                    }
                  }
                }
              }
            }

            if (wallModified) {
              updatedWalls[wallIndex] = {
                ...wall,
                apertures: updatedApertures
              };
            }
          }

          if (roomModified) {
            // Update the room in state with synced door properties
            const segmentsAfterSync = updatedWalls.reduce((sum, wall) => sum + (wall.segments?.length || 0), 0);
            console.log(`  Room ${currentRoom.id}: ${segmentsAfterSync} segments AFTER sync (modified)`);
            state.rooms.set(currentRoom.id, {
              ...currentRoom,
              walls: updatedWalls
            });
          }
        }
        // console.log('✨ Paired doors synced');
      }

      state.isCalculatingEnvelopes = false;
    });

    // console.log('✅ Envelope calculation complete');
  }
});
