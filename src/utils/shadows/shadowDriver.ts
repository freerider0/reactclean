import { Shadow, CatastroBuilding, Point3D } from '@/types/shadow';
import {
  catastroBuildingPolygonsTo3dWalls,
  overhangPolygonsTo3dWalls,
} from './catastroPolygonTo3dWalls';
import { getProjectingShadow } from './getAzimutAndElevation';
import { cleanShadows } from './cleanShadows';

/**
 * Calculates shadows projected by buildings and overhangs onto a reference point
 * This is the main driver function for shadow calculation
 *
 * @param buildings - Array of buildings from cadastre with geometry data
 * @param overhangs - Array of overhang objects (optional obstacles)
 * @param referencePoint - Reference point where shadows are calculated (observer location)
 * @returns Array of cleaned shadows
 */
export function getShadowsForAPoint(
  buildings: CatastroBuilding[],
  overhangs: any[],
  referencePoint: Point3D
): Shadow[] {
  // Convert the buildings to 3D walls
  let shadows: Shadow[] = [];

  // Convert building polygons to 3D walls (quadrilaterals)
  const buildingsWalls3d = catastroBuildingPolygonsTo3dWalls(buildings);

  // Calculate shadows for each wall
  for (const wall of buildingsWalls3d) {
    // Skip walls from the same building as the reference point
    if (wall.cadastralNumber === (referencePoint as any).refcat) {
      continue;
    }

    const shadow = getProjectingShadow(referencePoint, wall);
    // Concatenate the shadows
    shadows = shadows.concat(shadow);
  }

  // Convert overhangs to 3D walls with infinite height
  const overhangAs3dWalls = overhangPolygonsTo3dWalls(overhangs);

  // An overhang is a quadrilateral we converted to a 3d wall with infinite height
  // Calculate overhangs shadows
  for (const overhang of overhangAs3dWalls) {
    // Convert the overhang to a shadow
    const overhangShadow = getProjectingShadow(referencePoint, overhang);

    // Concatenate the overhang shadows
    shadows = shadows.concat(overhangShadow);
  }

  // Clean redundant shadows
  const cleanedShadows = cleanShadows(shadows);
  return cleanedShadows;
}
