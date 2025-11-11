/**
 * Constraint management hook
 * Standalone hook for adding/removing/solving constraints
 * NO MODIFICATIONS TO CORE - This is an additive layer only
 */

import { useState, useCallback } from 'react';
import { Room, Constraint, ConstraintType } from '../types';
import { solveRoom, calculateDOF, isOverConstrained } from '../utils/constraintSolver';

export interface UseConstraintsResult {
  // Add constraint
  addDistanceConstraint: (roomId: string, vertexIndex1: number, vertexIndex2: number, distance?: number) => void;
  addHorizontalConstraint: (roomId: string, vertexIndex1: number, vertexIndex2: number) => void;
  addVerticalConstraint: (roomId: string, vertexIndex1: number, vertexIndex2: number) => void;
  addParallelConstraint: (roomId: string, edgeIndex1: number, edgeIndex2: number) => void;
  addPerpendicularConstraint: (roomId: string, edgeIndex1: number, edgeIndex2: number) => void;
  addAngleConstraint: (roomId: string, edgeIndex1: number, edgeIndex2: number, angle?: number) => void;
  addEqualLengthConstraint: (roomId: string, edgeIndex1: number, edgeIndex2: number) => void;

  // Remove constraint
  removeConstraint: (roomId: string, constraintId: string) => void;

  // Toggle constraint
  toggleConstraint: (roomId: string, constraintId: string) => void;

  // Solve constraints
  solveConstraints: (roomId: string) => Promise<void>;

  // State
  isSolving: boolean;
  dof: number | null;  // Degrees of freedom for selected room
  overConstrained: boolean;
}

export interface UseConstraintsProps {
  rooms: Room[];
  selectedRoomId: string | null;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  recalculateEnvelopes?: () => Promise<void>;
}

/**
 * Hook for managing constraints on rooms
 */
export function useConstraints({
  rooms,
  selectedRoomId,
  updateRoom,
  recalculateEnvelopes
}: UseConstraintsProps): UseConstraintsResult {
  const [isSolving, setIsSolving] = useState(false);

  // Get selected room
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Calculate DOF for selected room
  const dof = selectedRoom ? calculateDOF(selectedRoom) : null;
  const overConstrained = selectedRoom ? isOverConstrained(selectedRoom) : false;

  /**
   * Generate unique constraint ID
   */
  const generateConstraintId = useCallback(() => {
    return `constraint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Add a constraint to a room (and auto-solve)
   */
  const addConstraint = useCallback(async (
    roomId: string,
    type: ConstraintType,
    indices: number[],
    value?: number
  ) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const newConstraint: Constraint = {
      id: generateConstraintId(),
      type,
      indices,
      value,
      enabled: true
    };

    // Update room with new constraint
    const updatedRoom = {
      ...room,
      constraints: [...room.constraints, newConstraint]
    };

    // Auto-solve immediately after adding constraint
    setIsSolving(true);
    try {
      const solvedRoom = await solveRoom(updatedRoom);

      console.log('✅ Constraint solved, updating room vertices...');
      console.log('  Old vertices:', room.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', '));
      console.log('  New vertices:', solvedRoom.vertices.map(v => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`).join(', '));

      updateRoom(roomId, {
        vertices: solvedRoom.vertices,
        walls: solvedRoom.walls,
        constraints: solvedRoom.constraints,
        primitives: solvedRoom.primitives
      });

      // Small delay to ensure state updates are flushed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Recalculate envelope after constraint solving
      if (recalculateEnvelopes) {
        console.log('🔄 Recalculating envelopes after constraint solving...');
        await recalculateEnvelopes();
        console.log('✨ Envelope recalculation complete');
      }
    } catch (error) {
      console.error('Error auto-solving after adding constraint:', error);
      // Fallback: just add the constraint without solving
      updateRoom(roomId, {
        constraints: updatedRoom.constraints
      });
    } finally {
      setIsSolving(false);
    }
  }, [rooms, updateRoom, generateConstraintId, recalculateEnvelopes]);

  /**
   * Add distance constraint between two vertices
   */
  const addDistanceConstraint = useCallback((
    roomId: string,
    vertexIndex1: number,
    vertexIndex2: number,
    distance?: number
  ) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Calculate current distance if not provided
    let targetDistance = distance;
    if (targetDistance === undefined) {
      const v1 = room.vertices[vertexIndex1];
      const v2 = room.vertices[vertexIndex2];
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      targetDistance = Math.sqrt(dx * dx + dy * dy);
    }

    addConstraint(roomId, ConstraintType.Distance, [vertexIndex1, vertexIndex2], targetDistance);
  }, [rooms, addConstraint]);

  /**
   * Add horizontal constraint (line should be horizontal)
   */
  const addHorizontalConstraint = useCallback((
    roomId: string,
    vertexIndex1: number,
    vertexIndex2: number
  ) => {
    addConstraint(roomId, ConstraintType.Horizontal, [vertexIndex1, vertexIndex2]);
  }, [addConstraint]);

  /**
   * Add vertical constraint (line should be vertical)
   */
  const addVerticalConstraint = useCallback((
    roomId: string,
    vertexIndex1: number,
    vertexIndex2: number
  ) => {
    addConstraint(roomId, ConstraintType.Vertical, [vertexIndex1, vertexIndex2]);
  }, [addConstraint]);

  /**
   * Add parallel constraint between two edges
   */
  const addParallelConstraint = useCallback((
    roomId: string,
    edgeIndex1: number,
    edgeIndex2: number
  ) => {
    // Store edge indices (we'll convert to line IDs in solver)
    addConstraint(roomId, ConstraintType.Parallel, [edgeIndex1, edgeIndex2]);
  }, [addConstraint]);

  /**
   * Add perpendicular constraint between two edges
   */
  const addPerpendicularConstraint = useCallback((
    roomId: string,
    edgeIndex1: number,
    edgeIndex2: number
  ) => {
    addConstraint(roomId, ConstraintType.Perpendicular, [edgeIndex1, edgeIndex2]);
  }, [addConstraint]);

  /**
   * Add angle constraint between two edges
   */
  const addAngleConstraint = useCallback((
    roomId: string,
    edgeIndex1: number,
    edgeIndex2: number,
    angle?: number
  ) => {
    addConstraint(roomId, ConstraintType.Angle, [edgeIndex1, edgeIndex2], angle ?? Math.PI / 2);
  }, [addConstraint]);

  /**
   * Add equal length constraint between two edges
   */
  const addEqualLengthConstraint = useCallback((
    roomId: string,
    edgeIndex1: number,
    edgeIndex2: number
  ) => {
    addConstraint(roomId, ConstraintType.Equal, [edgeIndex1, edgeIndex2]);
  }, [addConstraint]);

  /**
   * Remove a constraint from a room
   */
  const removeConstraint = useCallback((roomId: string, constraintId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    updateRoom(roomId, {
      constraints: room.constraints.filter(c => c.id !== constraintId)
    });
  }, [rooms, updateRoom]);

  /**
   * Toggle constraint enabled state (and auto-solve)
   */
  const toggleConstraint = useCallback(async (roomId: string, constraintId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const updatedRoom = {
      ...room,
      constraints: room.constraints.map(c =>
        c.id === constraintId ? { ...c, enabled: !c.enabled } : c
      )
    };

    // Auto-solve after toggling constraint
    setIsSolving(true);
    try {
      const solvedRoom = await solveRoom(updatedRoom);
      updateRoom(roomId, {
        vertices: solvedRoom.vertices,
        walls: solvedRoom.walls,
        constraints: solvedRoom.constraints,
        primitives: solvedRoom.primitives
      });

      // Recalculate envelope after constraint solving
      if (recalculateEnvelopes) {
        console.log('🔄 Recalculating envelopes after toggling constraint...');
        await recalculateEnvelopes();
      }
    } catch (error) {
      console.error('Error auto-solving after toggling constraint:', error);
      // Fallback: just toggle without solving
      updateRoom(roomId, {
        constraints: updatedRoom.constraints
      });
    } finally {
      setIsSolving(false);
    }
  }, [rooms, updateRoom, recalculateEnvelopes]);

  /**
   * Solve constraints for a room
   */
  const solveConstraints = useCallback(async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    setIsSolving(true);

    try {
      // Solve using the constraint solver utility
      const solvedRoom = await solveRoom(room);

      // Update the room with solved geometry
      updateRoom(roomId, {
        vertices: solvedRoom.vertices,
        walls: solvedRoom.walls,
        primitives: solvedRoom.primitives
      });

      // Recalculate envelope after constraint solving
      if (recalculateEnvelopes) {
        console.log('🔄 Recalculating envelopes after manual constraint solving...');
        await recalculateEnvelopes();
      }
    } catch (error) {
      console.error('Error solving constraints:', error);
    } finally {
      setIsSolving(false);
    }
  }, [rooms, updateRoom, recalculateEnvelopes]);

  return {
    addDistanceConstraint,
    addHorizontalConstraint,
    addVerticalConstraint,
    addParallelConstraint,
    addPerpendicularConstraint,
    addAngleConstraint,
    addEqualLengthConstraint,
    removeConstraint,
    toggleConstraint,
    solveConstraints,
    isSolving,
    dof,
    overConstrained
  };
}
