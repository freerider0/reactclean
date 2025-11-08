import { Shadow, WallExternalBuilding, Point3D } from '@/types/shadow';
import {
  isQuadrilateralLeftOrRight,
  quadCrossesNorthMeridian,
  splitQuadAtNorthMeridian,
  isVertexOnNorthMeridian,
} from './quadrilaterals/helpers';

/**
 * Calculates azimuth and elevation angles from a reference point to each corner of a quadrilateral in 3D space
 * @param referencePoint - Reference 3D point {x, y, z}
 * @param quadrilateral - Object with four 3D coordinates
 * @returns Object containing azimuth and elevation angles for each point of the quadrilateral
 */
function getAzimuthAndElevation({
  referencePoint,
  quadrilateral,
}: {
  referencePoint: Point3D;
  quadrilateral: WallExternalBuilding;
}): Shadow {
  // Result object to store angles for each point
  const shadow: Shadow = {
    id: quadrilateral?.id || '',
    gid: quadrilateral?.gid || '',
    cadastralNumber: quadrilateral?.cadastralNumber || '',
    points: {
      downLeft: { azimut: 0, elevation: 0 },
      upLeft: { azimut: 0, elevation: 0 },
      upRight: { azimut: 0, elevation: 0 },
      downRight: { azimut: 0, elevation: 0 },
    },
  };

  // Check if quadrilateral or points is null/undefined
  if (!quadrilateral || !quadrilateral.points) {
    console.warn('Invalid quadrilateral or points data');
    return shadow;
  }

  // Process each point of the quadrilateral
  for (const pointKey in quadrilateral.points) {
    if (quadrilateral.points.hasOwnProperty(pointKey)) {
      const point = quadrilateral.points[pointKey as keyof typeof quadrilateral.points];

      // Calculate differences in coordinates
      const dx = point.x - referencePoint.x;
      const dy = point.y - referencePoint.y;
      const dz = point.z - referencePoint.z;

      // Calculate horizontal distance
      const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

      // Calculate azimuth angle using the convention:
      // 0° at south, ±180° at north, positive for west, negative for east
      // First get the angle from north (clockwise)

      // Calculate azimuth angle (0° at south, -180°/180° at north)
      let azimuth = Math.atan2(dx, dy) * (180 / Math.PI);

      // Rotate 180 degrees (south becomes 0°)
      azimuth = (azimuth + 180) % 360;

      // Convert to [-180, 180] range
      if (azimuth >= 180) {
        azimuth -= 360;
      }

      // Calculate elevation angle (angle from horizontal plane), restricted to 0 to 90
      let elevation = Math.atan2(dz, horizontalDistance) * (180 / Math.PI);
      if (elevation > 90) {
        elevation = 90;
      } else if (elevation < 0) {
        elevation = 0;
      }

      // Add results to the output object
      if (
        pointKey === 'downLeft' ||
        pointKey === 'upLeft' ||
        pointKey === 'upRight' ||
        pointKey === 'downRight'
      ) {
        shadow.points[pointKey] = {
          azimut: azimuth,
          elevation: elevation,
        };
      }
    }
  }

  return shadow;
}

/**
 * Corrects shadow azimuth based on whether the building is on the left or right side
 * @param shadow - Shadow object to correct
 * @param isLeftOrRight - Whether the building is on the left or right
 * @returns Corrected shadow object
 */
function correctShadowAzimut(
  shadow: Shadow,
  isLeftOrRight: 'left' | 'right' | 'unknown'
): Shadow {
  // Check every point of the shadow
  // Left side projects shadow to the west (positive azimut)
  // Right side projects shadow to the east (negative azimut)
  for (const pointKey in shadow.points) {
    if (isLeftOrRight === 'left' && shadow.points.hasOwnProperty(pointKey)) {
      const point = shadow.points[pointKey as keyof typeof shadow.points];
      if (point.azimut === -180) {
        point.azimut = 180;
      }
    }
    if (isLeftOrRight === 'right' && shadow.points.hasOwnProperty(pointKey)) {
      const point = shadow.points[pointKey as keyof typeof shadow.points];
      if (point.azimut === 180) {
        point.azimut = -180;
      }
    }
  }
  return shadow;
}

/**
 * Gets the projecting shadow from a quadrilateral (wall) relative to a reference point
 * Handles quadrilaterals that cross the north meridian by splitting them
 * @param referencePoint - Reference point (observer location)
 * @param quadrilateral - Building wall as a 3D quadrilateral
 * @returns Array of shadow objects (may contain 1 or 2 shadows if split)
 */
export function getProjectingShadow(
  referencePoint: Point3D,
  quadrilateral: WallExternalBuilding
): Shadow[] {
  const shadow: Shadow[] = [];

  // Check if one its vertex is exactly on the north meridian
  const haveVertexOnNorthMeridian = isVertexOnNorthMeridian(referencePoint, quadrilateral);

  // If have vertex on the north meridian no need to split
  if (haveVertexOnNorthMeridian) {
    // Get if it is at the left or right of the reference point
    const isLeftOrRight = isQuadrilateralLeftOrRight(referencePoint, quadrilateral);
    const angles = getAzimuthAndElevation({ referencePoint, quadrilateral });
    const correctedShadow = correctShadowAzimut(angles, isLeftOrRight);
    shadow.push(correctedShadow);
  }

  // Check if the quadrilateral crosses the north meridian
  const crossesNorth = quadCrossesNorthMeridian(referencePoint, quadrilateral);

  // If the quadrilateral crosses the north meridian split the quadrilateral at the north meridian
  if (crossesNorth) {
    // Split the quadrilateral at the north meridian
    const result = splitQuadAtNorthMeridian(referencePoint, quadrilateral);

    if (result) {
      const { leftQuad, rightQuad } = result;

      // Calculate shadows for each part
      const leftBuildingPartShadow = getAzimuthAndElevation({
        referencePoint,
        quadrilateral: leftQuad,
      });
      const rightBuildingPartShadow = getAzimuthAndElevation({
        referencePoint,
        quadrilateral: rightQuad,
      });

      // Left shadow must finish at -180 degrees
      // If left shadow have some azimut equal to 180 convert to -180
      const correctedLeftShadow = correctShadowAzimut(leftBuildingPartShadow, 'left');
      const correctedRightShadow = correctShadowAzimut(rightBuildingPartShadow, 'right');

      // Add both shadows to the result
      shadow.push(correctedLeftShadow, correctedRightShadow);
    } else {
      // Fallback if splitting failed
      shadow.push(getAzimuthAndElevation({ referencePoint, quadrilateral }));
    }
  }

  // The quadrilateral does not have a vertex on the north meridian and does not cross the north meridian
  if (!haveVertexOnNorthMeridian && !crossesNorth) {
    shadow.push(getAzimuthAndElevation({ referencePoint, quadrilateral }));
  }

  return shadow;
}
