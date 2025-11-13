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
import { findVertexIndexById, vertexIdsToIndices } from './vertexUtils';

/**
 * Convert Room to solver primitives (points, lines, constraints)
 * This is a pure function - does not modify the room
 *
 * @param room - Room to convert
 * @param fixedVertexIndex - Optional vertex index to fix during solving (defaults to 0)
 */
export function roomToPrimitives(room: Room, fixedVertexIndex: number = 0): Primitive[] {
  const primitives: Primitive[] = [];

  // Convert vertices to PointPrimitives using vertex IDs
  // Fix the specified vertex (or first vertex by default) to prevent drift
  room.vertices.forEach((vertex, index) => {
    const pointPrimitive: PointPrimitive = {
      id: vertex.id,  // NEW: Use vertex ID instead of index
      type: 'point',
      x: vertex.x,
      y: vertex.y,
      fixed: index === fixedVertexIndex  // Fix the specified vertex
    };
    primitives.push(pointPrimitive);
  });

  // Convert edges to LinePrimitives using vertex IDs
  room.vertices.forEach((vertex, index) => {
    const nextIndex = (index + 1) % room.vertices.length;
    const nextVertex = room.vertices[nextIndex];
    const linePrimitive: LinePrimitive = {
      id: `line${index}`,  // Keep line ID as index-based for now
      type: 'line',
      p1_id: vertex.id,      // NEW: Use vertex ID
      p2_id: nextVertex.id   // NEW: Use vertex ID
    };
    primitives.push(linePrimitive);
  });

  // Convert constraints to ConstraintPrimitives
  room.constraints.forEach((constraint) => {
    if (!constraint.enabled) return;

    const constraintPrimitive = constraintToSolverPrimitive(constraint, room.vertices);
    if (constraintPrimitive) {
      primitives.push(constraintPrimitive);
    }
  });

  return primitives;
}

/**
 * Convert a single Constraint to solver ConstraintPrimitive
 * Uses vertex IDs for stable references across vertex add/delete operations
 */
function constraintToSolverPrimitive(constraint: Constraint, vertices: Vertex[]): ConstraintPrimitive | null {
  const { id, type, indices, vertexIds, value } = constraint;

  switch (type) {
    case ConstraintType.Distance:
      // Distance between two vertices
      // Prefer vertexIds if available, fall back to indices
      let v1Id: string, v2Id: string;

      if (vertexIds && vertexIds.length === 2) {
        // Use vertex IDs directly
        v1Id = vertexIds[0];
        v2Id = vertexIds[1];
      } else if (indices.length === 2) {
        // Fall back to indices (backwards compatibility)
        v1Id = vertices[indices[0]]?.id;
        v2Id = vertices[indices[1]]?.id;
        if (!v1Id || !v2Id) return null;
      } else {
        return null;
      }

      return {
        id,
        type: 'distance',
        p1_id: v1Id,
        p2_id: v2Id,
        distance: value ?? 100  // Default 100cm if no value
      };

    case ConstraintType.Horizontal:
      // Line between two vertices should be horizontal
      let h1Id: string, h2Id: string;

      if (vertexIds && vertexIds.length === 2) {
        h1Id = vertexIds[0];
        h2Id = vertexIds[1];
      } else if (indices.length === 2) {
        h1Id = vertices[indices[0]]?.id;
        h2Id = vertices[indices[1]]?.id;
        if (!h1Id || !h2Id) return null;
      } else {
        return null;
      }

      return {
        id,
        type: 'horizontal',
        p1_id: h1Id,
        p2_id: h2Id
      };

    case ConstraintType.Vertical:
      // Line between two vertices should be vertical
      let vert1Id: string, vert2Id: string;

      if (vertexIds && vertexIds.length === 2) {
        vert1Id = vertexIds[0];
        vert2Id = vertexIds[1];
      } else if (indices.length === 2) {
        vert1Id = vertices[indices[0]]?.id;
        vert2Id = vertices[indices[1]]?.id;
        if (!vert1Id || !vert2Id) return null;
      } else {
        return null;
      }

      return {
        id,
        type: 'vertical',
        p1_id: vert1Id,
        p2_id: vert2Id
      };

    case ConstraintType.Parallel:
      // Two lines should be parallel (uses edge indices)
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'parallel',
        line1_id: `line${indices[0]}`,  // First edge index
        line2_id: `line${indices[1]}`   // Second edge index
      };

    case ConstraintType.Perpendicular:
      // Two lines should be perpendicular (uses edge indices)
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'perpendicular',
        line1_id: `line${indices[0]}`,  // First edge index
        line2_id: `line${indices[1]}`   // Second edge index
      };

    case ConstraintType.Angle:
      // Angle between two lines (uses edge indices)
      if (indices.length !== 2) return null;
      return {
        id,
        type: 'angle',
        line1_id: `line${indices[0]}`,
        line2_id: `line${indices[1]}`,
        angle: value ?? Math.PI / 2  // Default 90 degrees
      };

    case ConstraintType.Equal:
      // Equal length between two edges (uses edge indices)
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
 * IMPORTANT: Preserves vertex IDs and order
 */
export function primitivesToRoom(primitives: Primitive[], room: Room): Room {
  // Extract point primitives
  const pointPrimitives = primitives.filter(p => p.type === 'point') as PointPrimitive[];

  // Sort by original vertex order (match IDs with original room.vertices)
  // This preserves the vertex order and ensures indices remain stable
  const sortedPoints = room.vertices.map(originalVertex => {
    const solvedPoint = pointPrimitives.find(p => p.id === originalVertex.id);
    if (!solvedPoint) {
      // Fallback: vertex not found in solved primitives, keep original
      return originalVertex;
    }
    return {
      id: originalVertex.id,  // Preserve vertex ID
      x: solvedPoint.x,
      y: solvedPoint.y
    };
  });

  // With ID-based walls, no need to regenerate!
  // Vertices moved but IDs stayed the same, so walls are still valid

  // Return new room with updated geometry
  return {
    ...room,
    vertices: sortedPoints,
    // walls stay unchanged - vertex IDs are stable!
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
