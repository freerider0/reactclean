/**
 * Dimension calculation utilities
 * Pure functions for measuring distances and formatting
 */

import { Vertex } from '../types';

/**
 * Calculate distance between two points (in cm)
 */
export function calculateEdgeLength(v1: Vertex, v2: Vertex): number {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate midpoint between two vertices
 */
export function calculateMidpoint(v1: Vertex, v2: Vertex): Vertex {
  return {
    x: (v1.x + v2.x) / 2,
    y: (v1.y + v2.y) / 2
  };
}

/**
 * Format distance for display
 * Converts cm to appropriate unit (cm or m)
 */
export function formatDistance(distanceCm: number): string {
  if (distanceCm >= 100) {
    // Display in meters with 2 decimal places
    return `${(distanceCm / 100).toFixed(2)} m`;
  } else {
    // Display in centimeters
    return `${Math.round(distanceCm)} cm`;
  }
}

/**
 * Calculate offset direction for dimension label
 * Returns normalized vector perpendicular to edge (pointing outward)
 */
export function calculateLabelOffset(v1: Vertex, v2: Vertex): Vertex {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return { x: 0, y: -1 };

  // Perpendicular vector (rotated 90° clockwise)
  return {
    x: dy / length,
    y: -dx / length
  };
}
