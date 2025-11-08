import { Shadow, ShadowPoint } from '@/types/shadow';

/**
 * Checks if shadow A is contained within shadow B, with a small buffer for border cases
 */
function isShadowContained(shadowA: Shadow, shadowB: Shadow): boolean {
  // Small buffer to handle border cases
  const buffer = 0.0001;

  const azimutsA = [
    shadowA.points.downLeft.azimut,
    shadowA.points.upLeft.azimut,
    shadowA.points.upRight.azimut,
    shadowA.points.downRight.azimut,
  ];

  const elevationsA = [
    shadowA.points.downLeft.elevation,
    shadowA.points.upLeft.elevation,
    shadowA.points.upRight.elevation,
    shadowA.points.downRight.elevation,
  ];

  const azimutsB = [
    shadowB.points.downLeft.azimut,
    shadowB.points.upLeft.azimut,
    shadowB.points.upRight.azimut,
    shadowB.points.downRight.azimut,
  ];

  const elevationsB = [
    shadowB.points.downLeft.elevation,
    shadowB.points.upLeft.elevation,
    shadowB.points.upRight.elevation,
    shadowB.points.downRight.elevation,
  ];

  const minAzimutA = Math.min(...azimutsA);
  const maxAzimutA = Math.max(...azimutsA);
  const minElevationA = Math.min(...elevationsA);
  const maxElevationA = Math.max(...elevationsA);

  const minAzimutB = Math.min(...azimutsB);
  const maxAzimutB = Math.max(...azimutsB);
  const minElevationB = Math.min(...elevationsB);
  const maxElevationB = Math.max(...elevationsB);

  // Shadow A is contained in Shadow B if the range of A plus buffer is within the range of B
  return (
    minAzimutA >= minAzimutB + buffer &&
    maxAzimutA <= maxAzimutB - buffer &&
    minElevationA >= minElevationB + buffer &&
    maxElevationA <= maxElevationB - buffer
  );
}

/**
 * Gets the bounds of a shadow
 */
function getShadowBounds(shadow: Shadow): {
  minAzimut: number;
  maxAzimut: number;
  minElevation: number;
  maxElevation: number;
} {
  const azimuths = [
    shadow.points.downLeft.azimut,
    shadow.points.upLeft.azimut,
    shadow.points.upRight.azimut,
    shadow.points.downRight.azimut,
  ];

  const elevations = [
    shadow.points.downLeft.elevation,
    shadow.points.upLeft.elevation,
    shadow.points.upRight.elevation,
    shadow.points.downRight.elevation,
  ];

  return {
    minAzimut: Math.min(...azimuths),
    maxAzimut: Math.max(...azimuths),
    minElevation: Math.min(...elevations),
    maxElevation: Math.max(...elevations),
  };
}

/**
 * Removes shadows fully contained within the specified edge azimuth ranges
 * (-180° to -123° and 123° to 180°)
 */
function removeEdgeShadows(shadows: Shadow[]): Shadow[] {
  return shadows.filter((shadow) => {
    // Get the bounds of the shadow
    const bounds = getShadowBounds(shadow);

    // Check if shadow is fully contained in left edge (-180° to -123°)
    const isInLeftEdge = bounds.minAzimut >= -180 && bounds.maxAzimut <= -123;

    // Check if shadow is fully contained in right edge (123° to 180°)
    const isInRightEdge = bounds.minAzimut >= 123 && bounds.maxAzimut <= 180;

    // Keep the shadow only if it's NOT fully contained in either edge
    return !(isInLeftEdge || isInRightEdge);
  });
}

/**
 * Checks if a point is inside a shadow
 */
function isPointInShadow(point: { azimut: number; elevation: number }, shadow: Shadow): boolean {
  const bounds = getShadowBounds(shadow);

  return (
    point.azimut >= bounds.minAzimut &&
    point.azimut <= bounds.maxAzimut &&
    point.elevation >= bounds.minElevation &&
    point.elevation <= bounds.maxElevation
  );
}

/**
 * Checks if shadow A is fully contained within shadow B
 */
function isFullyContained(shadowA: Shadow, shadowB: Shadow): boolean {
  // Check if all four corners of shadow A are inside shadow B
  const cornersA = [
    shadowA.points.downLeft,
    shadowA.points.upLeft,
    shadowA.points.upRight,
    shadowA.points.downRight,
  ];

  const boundsB = getShadowBounds(shadowB);

  // Check if all corners of A are inside B
  for (const corner of cornersA) {
    if (
      corner.azimut < boundsB.minAzimut ||
      corner.azimut > boundsB.maxAzimut ||
      corner.elevation < boundsB.minElevation ||
      corner.elevation > boundsB.maxElevation
    ) {
      // Found a corner of A that's outside B
      return false;
    }
  }

  // All corners of A are inside B
  return true;
}

/**
 * Removes shadows that are fully contained within a single other shadow
 */
function removeFullyContainedShadows(shadows: Shadow[]): Shadow[] {
  // Create a map to track which shadows should be kept
  const shadowsToKeep = new Array(shadows.length).fill(true);

  // Mark shadows that are fully contained in a single other shadow for removal
  for (let i = 0; i < shadows.length; i++) {
    for (let j = 0; j < shadows.length; j++) {
      if (i === j) continue; // Skip comparing with itself

      // If shadow i is contained in shadow j, mark shadow i for removal
      if (isFullyContained(shadows[i], shadows[j])) {
        shadowsToKeep[i] = false;
        break; // No need to check other shadows
      }
    }
  }

  // Filter the shadows based on the tracking array
  return shadows.filter((shadow, index) => shadowsToKeep[index]);
}

/**
 * Creates a binary matrix representing the coverage of shadows
 * Each cell is true if covered by any shadow, false otherwise
 */
function createBinaryMatrix(
  shadows: Shadow[],
  bounds: {
    minAzimut: number;
    maxAzimut: number;
    minElevation: number;
    maxElevation: number;
  },
  azimutResolution: number,
  elevationResolution: number
): boolean[][] {
  // Initialize matrix with all cells set to false (not covered)
  const matrix: boolean[][] = Array(azimutResolution)
    .fill(null)
    .map(() => Array(elevationResolution).fill(false));

  // For each cell in the matrix
  for (let x = 0; x < azimutResolution; x++) {
    for (let y = 0; y < elevationResolution; y++) {
      // Convert grid coordinates to azimuth-elevation coordinates
      // Each cell represents exactly 1 degree
      const azimut = bounds.minAzimut + x;
      const elevation = bounds.minElevation + y;

      // Check if this point is covered by any shadow
      for (const shadow of shadows) {
        if (isPointInShadow({ azimut, elevation }, shadow)) {
          matrix[x][y] = true;
          break;
        }
      }
    }
  }

  return matrix;
}

/**
 * Compare two binary matrices to see if they represent the same coverage
 */
function areMatricesEqual(matrix1: boolean[][], matrix2: boolean[][]): boolean {
  const width = matrix1.length;
  const height = matrix1[0].length;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (matrix1[x][y] !== matrix2[x][y]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Cleans shadows by identifying and removing redundant ones
 * @param shadows - Array of shadows to clean
 * @returns Cleaned array of shadows
 */
export function cleanShadows(shadows: Shadow[]): Shadow[] {
  if (!shadows || shadows.length === 0) {
    return shadows;
  }

  // If there's only one shadow, return it
  if (shadows.length === 1) {
    return shadows;
  }

  // First pass: remove shadows fully contained in a single other shadow
  let cleanedShadows = removeFullyContainedShadows(shadows);

  // Second pass: remove shadows fully contained within the specified azimuth ranges
  cleanedShadows = removeEdgeShadows(cleanedShadows);

  // If we only have one shadow left, just return it
  if (cleanedShadows.length <= 1) {
    return cleanedShadows;
  }

  // Fixed coordinate system bounds for solar patterns
  const fixedBounds = {
    minAzimut: -180,
    maxAzimut: 180,
    minElevation: 0,
    maxElevation: 90,
  };

  // Exact 360x90 resolution - each cell represents exactly 1 degree
  const azimutResolution = 360; // -180 to 180 = 360 degrees total
  const elevationResolution = 90; // 0 to 90 = 90 degrees total

  // Create a binary matrix representing coverage of all shadows combined
  const fullCoverageMatrix = createBinaryMatrix(
    cleanedShadows,
    fixedBounds,
    azimutResolution,
    elevationResolution
  );

  // Keep track of which shadows to keep
  const shadowsToKeep = new Array(cleanedShadows.length).fill(true);

  // Keep removing shadows until no more can be removed
  let madeChange = true;
  while (madeChange) {
    madeChange = false;

    // Try removing each shadow one by one
    for (let i = 0; i < cleanedShadows.length; i++) {
      // Skip if already marked for removal
      if (!shadowsToKeep[i]) continue;

      // Create a subset of shadows without this one
      const shadowsWithoutCurrent = cleanedShadows.filter(
        (_, idx) => idx !== i && shadowsToKeep[idx]
      );

      // Skip if we'd remove all shadows
      if (shadowsWithoutCurrent.length === 0) continue;

      // Create a binary matrix without this shadow
      const coverageWithoutShadow = createBinaryMatrix(
        shadowsWithoutCurrent,
        fixedBounds,
        azimutResolution,
        elevationResolution
      );

      // Compare the two matrices
      if (areMatricesEqual(fullCoverageMatrix, coverageWithoutShadow)) {
        // This shadow can be removed without changing the coverage
        shadowsToKeep[i] = false;
        madeChange = true;
      }
    }
  }

  // Return only the shadows we need to keep
  return cleanedShadows.filter((_, idx) => shadowsToKeep[idx]);
}
