/**
 * Constraint solver utilities
 * Pure functions for converting between Room format and solver primitives
 * NO MODIFICATIONS TO CORE - This is an additive layer only
 */

import {
  GradientDescentSolver,
  PointPrimitive,
  LinePrimitive,
  ConstraintPrimitive,
  Primitive
} from '../../../lib/geometry/GradientDescentSolver';
import { Room, Vertex, Constraint, ConstraintType } from '../types';
import { generateWalls } from './walls';

/**
 * Convert Room to solver primitives (points, lines, constraints)
 * This is a pure function - does not modify the room
 *
 * @param room - Room to convert
 * @param fixedVertexIndex - Optional vertex index to fix during solving (defaults to 0)
 */
export function roomToPrimitives(room: Room, fixedVertexIndex: number = 0): Primitive[] {
  const primitives: Primitive[] = [];

  // Convert vertices to PointPrimitives
  // Fix the specified vertex (or first vertex by default) to prevent drift
  room.vertices.forEach((vertex, index) => {
    const pointPrimitive: PointPrimitive = {
      id: `p${index}`,
      type: 'point',
      x: vertex.x,
      y: vertex.y,
      fixed: index === fixedVertexIndex  // Fix the specified vertex
    };
    primitives.push(pointPrimitive);
  });

  // Convert edges to LinePrimitives
  room.vertices.forEach((_, index) => {
    const nextIndex = (index + 1) % room.vertices.length;
    const linePrimitive: LinePrimitive = {
      id: `line${index}`,
      type: 'line',
      p1_id: `p${index}`,
      p2_id: `p${nextIndex}`
    };
    primitives.push(linePrimitive);
  });

  // Convert constraints to ConstraintPrimitives
  room.constraints.forEach((constraint) => {
    if (!constraint.enabled) return;

    const constraintPrimitive = constraintToSolverPrimitive(constraint);
    if (constraintPrimitive) {
      primitives.push(constraintPrimitive);
    }
  });

  return primitives;
}

/**
 * Convert a single Constraint to solver ConstraintPrimitive
 */
function constraintToSolverPrimitive(constraint: Constraint): ConstraintPrimitive | null {
  const { id, type, indices, value } = constraint;

  switch (type) {
    case ConstraintType.Distance:
      // Distance between two vertices
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'distance',
        p1_id: `p${indices[0]}`,
        p2_id: `p${indices[1]}`,
        distance: value ?? 100  // Default 100cm if no value
      };

    case ConstraintType.Horizontal:
      // Line between two vertices should be horizontal
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'horizontal',
        p1_id: `p${indices[0]}`,
        p2_id: `p${indices[1]}`
      };

    case ConstraintType.Vertical:
      // Line between two vertices should be vertical
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'vertical',
        p1_id: `p${indices[0]}`,
        p2_id: `p${indices[1]}`
      };

    case ConstraintType.Parallel:
      // Two lines should be parallel (4 vertices)
      if (indices.length !== 4) return null;
      return {
        id,
        type: 'parallel',
        line1_id: `line${indices[0]}`,  // First edge index
        line2_id: `line${indices[1]}`   // Second edge index
      };

    case ConstraintType.Perpendicular:
      // Two lines should be perpendicular (4 vertices)
      if (indices.length !== 4) return null;
      return {
        id,
        type: 'perpendicular',
        line1_id: `line${indices[0]}`,  // First edge index
        line2_id: `line${indices[1]}`   // Second edge index
      };

    case ConstraintType.Angle:
      // Angle between two lines (4 vertices)
      if (indices.length !== 4) return null;
      return {
        id,
        type: 'angle',
        line1_id: `line${indices[0]}`,
        line2_id: `line${indices[1]}`,
        angle: value ?? Math.PI / 2  // Default 90 degrees
      };

    case ConstraintType.Equal:
      // Equal length between two edges
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'equal_length',
        line1_id: `line${indices[0]}`,
        line2_id: `line${indices[1]}`
      };

    default:
      return null;
  }
}

/**
 * Update Room vertices from solved primitives
 * Returns a new Room with updated vertices (pure function)
 */
export function primitivesToRoom(primitives: Primitive[], room: Room): Room {
  // Extract point primitives and sort by id
  const pointPrimitives = primitives.filter(p => p.type === 'point') as PointPrimitive[];
  pointPrimitives.sort((a, b) => {
    const aIndex = parseInt(a.id.substring(1));
    const bIndex = parseInt(b.id.substring(1));
    return aIndex - bIndex;
  });

  // Create new vertices array from solved points
  const newVertices: Vertex[] = pointPrimitives.map(p => ({
    x: p.x,
    y: p.y
  }));

  // Regenerate walls with new vertices (preserve wall properties)
  const newWalls = generateWalls(
    newVertices,
    room.wallThickness,
    room.walls,
    room.vertices
  );

  // Return new room with updated geometry
  return {
    ...room,
    vertices: newVertices,
    walls: newWalls,
    primitives  // Store primitives for next solve
  };
}

/**
 * Solve constraints for a room
 * Returns a new Room with solved geometry (pure function)
 *
 * @param room - Room to solve
 * @param fixedVertexIndex - Optional vertex index to keep fixed during solving (defaults to 0)
 * @param maxIterations - Maximum solver iterations (default 1000)
 * @param tolerance - Convergence tolerance (default 0.1)
 * @returns Promise resolving to new Room with solved geometry
 */
export async function solveRoom(
  room: Room,
  fixedVertexIndex: number = 0,
  maxIterations: number = 1000,
  tolerance: number = 0.1
): Promise<Room> {
  // If no constraints, return room as-is
  if (room.constraints.length === 0) {
    return room;
  }

  // Check if there are any enabled constraints
  const hasEnabledConstraints = room.constraints.some(c => c.enabled);
  if (!hasEnabledConstraints) {
    return room;
  }

  // Convert room to primitives (fix the specified vertex)
  const primitives = roomToPrimitives(room, fixedVertexIndex);

  // Create solver and load primitives
  const solver = new GradientDescentSolver();
  solver.push_primitives_and_params(primitives);

  // Run solver
  await solver.solve();

  // Get solved primitives
  const solvedPrimitives = solver.get_primitives();

  // Convert back to room
  return primitivesToRoom(solvedPrimitives, room);
}

/**
 * Calculate degrees of freedom for a room
 * DOF = (number of free points * 2) - (number of constraints)
 * Negative DOF means over-constrained (might not solve)
 *
 * @param room - Room to check
 * @returns Degrees of freedom
 */
export function calculateDOF(room: Room): number {
  const numPoints = room.vertices.length;
  const freePoints = numPoints - 1;  // First point is fixed
  const pointDOF = freePoints * 2;   // Each point has x,y
  const numConstraints = room.constraints.filter(c => c.enabled).length;

  return pointDOF - numConstraints;
}

/**
 * Check if room is over-constrained
 */
export function isOverConstrained(room: Room): boolean {
  return calculateDOF(room) < 0;
}

/**
 * Check if room is under-constrained
 */
export function isUnderConstrained(room: Room): boolean {
  return calculateDOF(room) > 0;
}

/**
 * Check if room is fully constrained
 */
export function isFullyConstrained(room: Room): boolean {
  return calculateDOF(room) === 0;
}
