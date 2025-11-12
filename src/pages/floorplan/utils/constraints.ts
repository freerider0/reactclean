/**
 * Constraint utility functions
 * Helper functions for creating constraint objects
 */

import { Constraint, ConstraintType, Room } from '../types';

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

  return {
    id: generateConstraintId(),
    type: ConstraintType.Distance,
    indices: [vertexIndex1, vertexIndex2],
    value: targetDistance,
    enabled: true
  };
}

/**
 * Create a horizontal constraint (line should be horizontal)
 */
export function createHorizontalConstraint(
  vertexIndex1: number,
  vertexIndex2: number
): Constraint {
  return {
    id: generateConstraintId(),
    type: ConstraintType.Horizontal,
    indices: [vertexIndex1, vertexIndex2],
    enabled: true
  };
}

/**
 * Create a vertical constraint (line should be vertical)
 */
export function createVerticalConstraint(
  vertexIndex1: number,
  vertexIndex2: number
): Constraint {
  return {
    id: generateConstraintId(),
    type: ConstraintType.Vertical,
    indices: [vertexIndex1, vertexIndex2],
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
