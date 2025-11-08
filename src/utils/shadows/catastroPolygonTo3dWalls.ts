import { getHeightOfConstruction } from './getHeightOfConstruction';
import { WallExternalBuilding, CatastroBuilding } from '@/types/shadow';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extracts the first polygon from the coordinates field of a MultiPolygon geometry
 * and converts it to an array of 3D walls (quadrilaterals)
 * @param buildings - Array of building objects with MultiPolygon geometry
 * @returns Array of 3D wall objects
 */
export function catastroBuildingPolygonsTo3dWalls(
  buildings: CatastroBuilding[]
): WallExternalBuilding[] {
  const defaultCatastalHeight = 3; // meters per floor
  const result: WallExternalBuilding[] = [];

  for (const building of buildings) {
    // Extract coordinates from the geometry
    const coordinates = building.data.geom.coordinates;
    const numberOfLevels = getHeightOfConstruction(building.data.constru);
    const height = numberOfLevels * defaultCatastalHeight;

    if (height > 0) {
      if (coordinates && coordinates.length > 0 && coordinates[0].length > 0) {
        const firstPolygon = coordinates[0][0];

        // Convert polygon points to pairs of lines (walls)
        for (let i = 0; i < firstPolygon.length - 1; i++) {
          const currentPoint = firstPolygon[i];
          const nextPoint = firstPolygon[i + 1];

          // Create a line segment object with height {x1, y1, height1, x2, y2, height2}
          const wallExternalBuilding: WallExternalBuilding = {
            id: uuidv4(),
            gid: String(building.data.gid),
            cadastralNumber: building.data.refcat,
            points: {
              downLeft: { x: currentPoint[0], y: currentPoint[1], z: 0 },
              upLeft: { x: currentPoint[0], y: currentPoint[1], z: height },
              upRight: { x: nextPoint[0], y: nextPoint[1], z: height },
              downRight: { x: nextPoint[0], y: nextPoint[1], z: 0 },
            },
          };

          result.push(wallExternalBuilding);
        }

        // Add the closing wall that connects the last point back to the first point
        if (firstPolygon.length > 2) {
          const lastPoint = firstPolygon[firstPolygon.length - 1];
          const firstPoint = firstPolygon[0];

          const closingWall: WallExternalBuilding = {
            id: uuidv4(),
            gid: String(building.data.gid),
            cadastralNumber: building.data.refcat,
            points: {
              downLeft: { x: lastPoint[0], y: lastPoint[1], z: 0 },
              upLeft: { x: lastPoint[0], y: lastPoint[1], z: height },
              upRight: { x: firstPoint[0], y: firstPoint[1], z: height },
              downRight: { x: firstPoint[0], y: firstPoint[1], z: 0 },
            },
          };
          result.push(closingWall);
        }
      }
    }
  }

  return result;
}

/**
 * Converts overhang polygons to 3D walls with infinite height
 * Overhangs are obstacles that block sunlight completely
 * @param overhangs - Array of overhang objects with polygon geometry
 * @returns Array of 3D wall objects representing overhangs
 */
export function overhangPolygonsTo3dWalls(overhangs: any[]): WallExternalBuilding[] {
  const result: WallExternalBuilding[] = [];

  for (const overhang of overhangs) {
    // Extract coordinates from the geometry
    const coordinates = overhang.data.geom.coordinates;

    if (coordinates && coordinates.length > 0 && coordinates[0].length > 0) {
      const firstPolygon = coordinates[0][0];

      // Convert polygon points to pairs of lines
      for (let i = 0; i < firstPolygon.length - 1; i++) {
        const currentPoint = firstPolygon[i];
        const nextPoint = firstPolygon[i + 1];

        // Create a line segment object with infinite height
        const wallExternalBuilding: WallExternalBuilding = {
          id: uuidv4(),
          gid: 'overhang',
          cadastralNumber: 'overhang',
          points: {
            downLeft: {
              x: currentPoint[0],
              y: currentPoint[1],
              z: currentPoint[2] || 0,
            },
            upLeft: {
              x: currentPoint[0],
              y: currentPoint[1],
              z: 9999999999,
            },
            upRight: { x: nextPoint[0], y: nextPoint[1], z: 9999999999 },
            downRight: { x: nextPoint[0], y: nextPoint[1], z: currentPoint[2] || 0 },
          },
        };

        result.push(wallExternalBuilding);
      }

      // Add the final wall that connects the last point back to the first point
      if (firstPolygon.length > 2) {
        const lastPoint = firstPolygon[firstPolygon.length - 1];
        const firstPoint = firstPolygon[0];

        const closingWall: WallExternalBuilding = {
          id: uuidv4(),
          gid: 'overhang',
          cadastralNumber: 'overhang',
          points: {
            downLeft: { x: lastPoint[0], y: lastPoint[1], z: lastPoint[2] || 0 },
            upLeft: { x: lastPoint[0], y: lastPoint[1], z: 9999999999 },
            upRight: { x: firstPoint[0], y: firstPoint[1], z: 9999999999 },
            downRight: { x: firstPoint[0], y: firstPoint[1], z: lastPoint[2] || 0 },
          },
        };
        result.push(closingWall);
      }
    }
  }

  return result;
}
