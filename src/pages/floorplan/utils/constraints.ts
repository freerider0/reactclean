/**
 * Constraint utility functions
 * Helper functions for creating constraint objects
 */

import { Constraint, ConstraintType, Room } from '../types';
import { vertexIndicesToIds } from './vertexUtils';

/**
 * Generate unique constraint ID
 */
export function generateConstraintId(): string {
  return `constraint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a distance constraint between two vertices
 */
export function createDistanceConstraint(
  room: Room,
  vertexIndex1: number,
  vertexIndex2: number,
  distance?: number
): Constraint {
  // Calculate current distance if not provided
  let targetDistance = distance;
  if (targetDistance === undefined) {
    const v1 = room.vertices[vertexIndex1];
    const v2 = room.vertices[vertexIndex2];
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    targetDistance = Math.sqrt(dx * dx + dy * dy);
  }

  // Convert indices to vertex IDs
  const vertexIds = vertexIndicesToIds(room.vertices, [vertexIndex1, vertexIndex2]);

  return {
    id: generateConstraintId(),
    type: ConstraintType.Distance,
    indices: [vertexIndex1, vertexIndex2],
    vertexIds,  // NEW: Store vertex IDs for stable references
    value: targetDistance,
    enabled: true
  };
}

/**
 * Create a horizontal constraint (line should be horizontal)
 */
export function createHorizontalConstraint(
  room: Room,
  vertexIndex1: number,
  vertexIndex2: number
): Constraint {
  // Convert indices to vertex IDs
  const vertexIds = vertexIndicesToIds(room.vertices, [vertexIndex1, vertexIndex2]);

  return {
    id: generateConstraintId(),
    type: ConstraintType.Horizontal,
    indices: [vertexIndex1, vertexIndex2],
    vertexIds,  // NEW: Store vertex IDs for stable references
    enabled: true
  };
}

/**
 * Create a vertical constraint (line should be vertical)
 */
export function createVerticalConstraint(
  room: Room,
  vertexIndex1: number,
  vertexIndex2: number
): Constraint {
  // Convert indices to vertex IDs
  const vertexIds = vertexIndicesToIds(room.vertices, [vertexIndex1, vertexIndex2]);

  return {
    id: generateConstraintId(),
    type: ConstraintType.Vertical,
    indices: [vertexIndex1, vertexIndex2],
    vertexIds,  // NEW: Store vertex IDs for stable references
    enabled: true
  };
}

/**
 * Create a parallel constraint between two edges
 */
export function createParallelConstraint(
  edgeIndex1: number,
  edgeIndex2: number
): Constraint {
  return {
    id: generateConstraintId(),
    type: ConstraintType.Parallel,
    indices: [edgeIndex1, edgeIndex2],
    enabled: true
  };
}

/**
 * Create a perpendicular constraint between two edges
 */
export function createPerpendicularConstraint(
  edgeIndex1: number,
  edgeIndex2: number
): Constraint {
  return {
    id: generateConstraintId(),
    type: ConstraintType.Perpendicular,
    indices: [edgeIndex1, edgeIndex2],
    enabled: true
  };
}

/**
 * Create an angle constraint between two edges
 */
export function createAngleConstraint(
  edgeIndex1: number,
  edgeIndex2: number,
  angle: number = Math.PI / 2
): Constraint {
  return {
    id: generateConstraintId(),
    type: ConstraintType.Angle,
    indices: [edgeIndex1, edgeIndex2],
    value: angle,
    enabled: true
  };
}

/**
 * Create an equal length constraint between two edges
 */
export function createEqualLengthConstraint(
  edgeIndex1: number,
  edgeIndex2: number
): Constraint {
  return {
    id: generateConstraintId(),
    type: ConstraintType.Equal,
    indices: [edgeIndex1, edgeIndex2],
    enabled: true
  };
}

/**
 * Check if two vertex indices form an edge (are consecutive)
 *
 * @param v1Index - First vertex index
 * @param v2Index - Second vertex index
 * @param vertexCount - Total number of vertices
 * @returns True if vertices are adjacent (form an edge)
 */
function areVerticesAdjacent(
  v1Index: number,
  v2Index: number,
  vertexCount: number
): boolean {
  // Check if v2 is the next vertex after v1 (wrapping around)
  if ((v1Index + 1) % vertexCount === v2Index) {
    return true;
  }
  // Check if v1 is the next vertex after v2 (wrapping around)
  if ((v2Index + 1) % vertexCount === v1Index) {
    return true;
  }
  return false;
}

/**
 * Filter out constraints that reference a specific edge
 * Used when an edge is split by adding a vertex
 *
 * Removes:
 * - Edge relationship constraints (parallel, perpendicular, angle, equal) that reference the edge
 * - Vertex-based constraints (distance, horizontal, vertical) applied to the edge being split
 *
 * Preserves:
 * - Diagonal constraints (distance applied to non-adjacent vertices)
 *
 * @param constraints - Array of constraints
 * @param edgeIndex - Index of the edge being split
 * @param vertices - Array of vertices (needed to check adjacency)
 * @returns Filtered constraints
 */
export function removeConstraintsForEdge(
  constraints: Constraint[],
  edgeIndex: number,
  vertices: Vertex[]
): Constraint[] {
  const vertexCount = vertices.length;

  // Get the vertex IDs for the edge being split
  const edgeV1Index = edgeIndex;
  const edgeV2Index = (edgeIndex + 1) % vertexCount;
  const edgeV1Id = vertices[edgeV1Index]?.id;
  const edgeV2Id = vertices[edgeV2Index]?.id;

  if (!edgeV1Id || !edgeV2Id) {
    // Invalid edge, keep all constraints
    return constraints;
  }

  return constraints.filter(constraint => {
    // Check if constraint has vertexIds
    if (!constraint.vertexIds || constraint.vertexIds.length < 2) {
      console.warn('Constraint missing vertexIds, keeping it:', constraint.id);
      return true;
    }

    const constraintV1Id = constraint.vertexIds[0];
    const constraintV2Id = constraint.vertexIds[1];

    // Check if this constraint references the edge being split
    const matchesEdge =
      (constraintV1Id === edgeV1Id && constraintV2Id === edgeV2Id) ||
      (constraintV1Id === edgeV2Id && constraintV2Id === edgeV1Id);

    // Remove if it matches the edge being split, keep otherwise
    return !matchesEdge;
  });
}
