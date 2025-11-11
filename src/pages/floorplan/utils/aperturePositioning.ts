/**
 * Smart positioning algorithm for aperture drag & drop
 * Handles collision detection and finds optimal placement positions
 */

import { Aperture, Room, Vertex, Wall } from '../types';

/**
 * Check if two apertures overlap on the same wall
 */
export function aperturesOverlap(
  aperture1: { distance: number; width: number; anchorVertex: 'start' | 'end' },
  aperture2: { distance: number; width: number; anchorVertex: 'start' | 'end' },
  wallLength: number
): boolean {
  // Convert both apertures to absolute positions from wall start
  const a1Start = aperture1.anchorVertex === 'start'
    ? aperture1.distance * 100
    : wallLength - aperture1.distance * 100 - aperture1.width * 100;
  const a1End = a1Start + aperture1.width * 100;

  const a2Start = aperture2.anchorVertex === 'start'
    ? aperture2.distance * 100
    : wallLength - aperture2.distance * 100 - aperture2.width * 100;
  const a2End = a2Start + aperture2.width * 100;

  // Check overlap with small tolerance (1cm)
  const tolerance = 1;
  return !(a1End + tolerance < a2Start || a2End + tolerance < a1Start);
}

/**
 * Check if an aperture fits on a wall at a specific position
 */
export function apertureFitsOnWall(
  aperture: { distance: number; width: number; anchorVertex: 'start' | 'end' },
  wallLength: number
): boolean {
  const apertureWidthPx = aperture.width * 100;
  const distancePx = aperture.distance * 100;

  if (aperture.anchorVertex === 'start') {
    return distancePx >= 0 && (distancePx + apertureWidthPx) <= wallLength;
  } else {
    return distancePx >= 0 && (distancePx + apertureWidthPx) <= wallLength;
  }
}

/**
 * Get all existing apertures on a wall (excluding the one being moved)
 */
export function getExistingApertures(
  wall: Wall,
  excludeApertureId?: string
): Aperture[] {
  if (!wall.apertures) return [];

  if (excludeApertureId) {
    return wall.apertures.filter(a => a.id !== excludeApertureId);
  }

  return wall.apertures;
}

/**
 * Find the nearest valid position for an aperture on a wall
 * Returns null if no valid position found
 */
export function findNearestValidPosition(
  wall: Wall,
  aperture: { id: string; width: number; height: number },
  dropDistancePx: number, // Distance from start of wall in pixels
  wallLengthPx: number,
  excludeApertureId?: string
): { distance: number; anchor: 'start' | 'end' } | null {
  const apertureWidthPx = aperture.width * 100;
  const existingApertures = getExistingApertures(wall, excludeApertureId);

  // Convert dropDistancePx to center position
  const centerDropPx = dropDistancePx;

  // Generate candidate positions
  // Start with positions near the drop point and expand outward
  const candidatePositions: Array<{ distance: number; anchor: 'start' | 'end'; centerDistPx: number }> = [];

  // Try positions from drop point, moving both left and right
  const step = 5; // 5cm steps
  const maxSearch = wallLengthPx;

  for (let offset = 0; offset < maxSearch; offset += step) {
    // Try both sides of drop point
    for (const side of [-1, 1]) {
      const testCenterPx = centerDropPx + (offset * side);

      if (testCenterPx < 0 || testCenterPx > wallLengthPx) continue;

      // Try both anchors
      for (const anchor of ['start', 'end'] as const) {
        let distance: number;

        if (anchor === 'start') {
          // Position aperture so its center is at testCenterPx
          distance = (testCenterPx - apertureWidthPx / 2) / 100; // Convert to meters
        } else {
          // Position from end
          distance = ((wallLengthPx - testCenterPx) - apertureWidthPx / 2) / 100; // Convert to meters
        }

        // Skip invalid positions
        if (distance < 0) continue;

        candidatePositions.push({
          distance,
          anchor,
          centerDistPx: Math.abs(testCenterPx - centerDropPx)
        });
      }
    }
  }

  // Sort by distance from drop point
  candidatePositions.sort((a, b) => a.centerDistPx - b.centerDistPx);

  // Find first valid position (no collisions)
  for (const candidate of candidatePositions) {
    const testAperture = {
      distance: candidate.distance,
      width: aperture.width,
      anchorVertex: candidate.anchor
    };

    // Check if it fits on wall
    if (!apertureFitsOnWall(testAperture, wallLengthPx)) {
      continue;
    }

    // Check for collisions with existing apertures
    let hasCollision = false;
    for (const existing of existingApertures) {
      if (aperturesOverlap(testAperture, existing, wallLengthPx)) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      return {
        distance: candidate.distance,
        anchor: candidate.anchor
      };
    }
  }

  return null;
}

/**
 * Validate if aperture can be placed at target position
 * Returns validation result with details
 */
export function validateAperturePosition(params: {
  aperture: Aperture;
  targetWall: Wall;
  targetDistance: number;
  targetAnchor: 'start' | 'end';
  wallLengthPx: number;
  excludeApertureId?: string;
}): {
  isValid: boolean;
  reason?: 'too_wide' | 'collision' | 'out_of_bounds';
  suggestedPosition?: { distance: number; anchor: 'start' | 'end' };
} {
  const { aperture, targetWall, targetDistance, targetAnchor, wallLengthPx, excludeApertureId } = params;

  const testAperture = {
    distance: targetDistance,
    width: aperture.width,
    anchorVertex: targetAnchor
  };

  // Check if aperture fits on wall
  if (!apertureFitsOnWall(testAperture, wallLengthPx)) {
    // Check if it's because aperture is too wide
    if (aperture.width * 100 > wallLengthPx) {
      return {
        isValid: false,
        reason: 'too_wide'
      };
    }

    return {
      isValid: false,
      reason: 'out_of_bounds'
    };
  }

  // Check for collisions
  const existingApertures = getExistingApertures(targetWall, excludeApertureId);
  for (const existing of existingApertures) {
    if (aperturesOverlap(testAperture, existing, wallLengthPx)) {
      // Find nearest valid position
      const dropDistancePx = targetAnchor === 'start'
        ? targetDistance * 100 + (aperture.width * 100) / 2
        : wallLengthPx - targetDistance * 100 - (aperture.width * 100) / 2;

      const suggestedPosition = findNearestValidPosition(
        targetWall,
        aperture,
        dropDistancePx,
        wallLengthPx,
        excludeApertureId
      );

      return {
        isValid: false,
        reason: 'collision',
        suggestedPosition: suggestedPosition || undefined
      };
    }
  }

  return {
    isValid: true
  };
}

/**
 * Calculate wall length in pixels (world space)
 */
export function calculateWallLength(
  v1: Vertex,
  v2: Vertex
): number {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
