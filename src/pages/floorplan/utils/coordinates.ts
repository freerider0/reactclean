/**
 * Coordinate transformation utilities
 * Screen <-> World coordinate conversions
 */

import { Vertex, Viewport } from '../types';

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenPoint: Vertex,
  viewport: Viewport
): Vertex {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldPoint: Vertex,
  viewport: Viewport
): Vertex {
  return {
    x: worldPoint.x * viewport.zoom + viewport.x,
    y: worldPoint.y * viewport.zoom + viewport.y
  };
}

/**
 * Transform a point from local room coordinates to world coordinates
 */
export function localToWorld(
  localPoint: Vertex,
  position: Vertex,
  rotation: number,
  scale: number = 1
): Vertex {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Apply scale
  const scaledX = localPoint.x * scale;
  const scaledY = localPoint.y * scale;

  // Apply rotation
  const rotatedX = scaledX * cos - scaledY * sin;
  const rotatedY = scaledX * sin + scaledY * cos;

  // Apply translation
  return {
    x: rotatedX + position.x,
    y: rotatedY + position.y
  };
}

/**
 * Transform a point from world coordinates to local room coordinates
 */
export function worldToLocal(
  worldPoint: Vertex,
  position: Vertex,
  rotation: number,
  scale: number = 1
): Vertex {
  // Remove translation
  const translatedX = worldPoint.x - position.x;
  const translatedY = worldPoint.y - position.y;

  // Remove rotation (inverse rotation)
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;

  // Remove scale
  return {
    x: rotatedX / scale,
    y: rotatedY / scale
  };
}
