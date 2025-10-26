/**
 * Rotation utility functions
 * Pure functions for rotation calculations
 */

import { Vertex } from '../types';

/**
 * Calculate angle between two points relative to a center
 */
export function calculateAngle(center: Vertex, point: Vertex): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

/**
 * Calculate rotation handle position (offset from center)
 */
export function getRotationHandlePosition(
  center: Vertex,
  currentRotation: number,
  handleDistance: number = 80
): Vertex {
  return {
    x: center.x + Math.cos(currentRotation) * handleDistance,
    y: center.y + Math.sin(currentRotation) * handleDistance
  };
}

/**
 * Snap angle to nearest 15 degrees if close
 */
export function snapAngleToIncrement(angle: number, increment: number = Math.PI / 12, threshold: number = Math.PI / 36): number {
  const remainder = angle % increment;
  if (Math.abs(remainder) < threshold) {
    return angle - remainder;
  }
  if (Math.abs(remainder - increment) < threshold) {
    return angle + (increment - remainder);
  }
  return angle;
}

/**
 * Normalize angle to [-PI, PI] range
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Calculate room center (centroid of vertices)
 * Since vertices are centered around (0,0) in local space,
 * the centroid in world space is simply the position
 */
export function calculateRoomCenter(vertices: Vertex[], position: Vertex): Vertex {
  // Vertices are centered around (0,0), so centroid = position
  return position;
}
