import { WallExternalBuilding, Point3D } from '@/types/shadow';

/**
 * Checks if a line segment crosses the north meridian
 * @param referencePoint - Reference 3D point {x, y, z}
 * @param point1 - First point of the line {x, y, z}
 * @param point2 - Second point of the line {x, y, z}
 * @returns True if the line crosses the north meridian, false otherwise
 */
export function lineSegmentCrossesNorthMeridian(
  referencePoint: Point3D,
  point1: Point3D,
  point2: Point3D
): boolean {
  // First check if the line crosses the meridian (x=0 line relative to reference point)
  const dx1 = point1.x - referencePoint.x;
  const dx2 = point2.x - referencePoint.x;

  // If the points are on the same side of the meridian, it doesn't cross
  if ((dx1 >= 0 && dx2 >= 0) || (dx1 <= 0 && dx2 <= 0)) {
    return false;
  }

  // At this point, we know the line crosses the meridian (x=0 line)
  // Now we need to determine if it crosses the north part (y>0 from reference point)

  // Calculate where the line intersects the meridian (x=0 line) by linear interpolation
  const dy1 = point1.y - referencePoint.y;
  const dy2 = point2.y - referencePoint.y;

  // Compute the y-coordinate at the intersection with x=0
  // Using parametric equation of the line: t = -dx1 / (dx2 - dx1)
  // Then y at intersection = y1 + t * (y2 - y1)
  const t = -dx1 / (dx2 - dx1);
  const yIntersection = dy1 + t * (dy2 - dy1);

  // If y-intersection > 0, the line crosses the north meridian
  return yIntersection > 0;
}

/**
 * Checks if a quadrilateral crosses the north meridian
 * @param referencePoint - Reference 3D point {x, y, z}
 * @param quadrilateral - Object with four corners {downLeft, upLeft, upRight, downRight}
 * @returns True if any edge of the quadrilateral crosses the north meridian
 */
export function quadCrossesNorthMeridian(
  referencePoint: Point3D,
  quadrilateral: WallExternalBuilding
): boolean {
  const points = [
    quadrilateral.points.downLeft,
    quadrilateral.points.upLeft,
    quadrilateral.points.upRight,
    quadrilateral.points.downRight,
  ];

  // Check each edge of the quadrilateral
  for (let i = 0; i < points.length; i++) {
    const nextIndex = (i + 1) % points.length; // Wrap around to the first point
    if (lineSegmentCrossesNorthMeridian(referencePoint, points[i], points[nextIndex])) {
      return true;
    }
  }

  return false;
}

/**
 * Splits a quadrilateral that crosses the north meridian into two parts
 * @param referencePoint - Reference 3D point {x, y, z}
 * @param quadrilateral - Object with four corners {downLeft, upLeft, upRight, downRight}
 * @returns Two quadrilaterals, one for each side of the north meridian
 */
export function splitQuadAtNorthMeridian(
  referencePoint: Point3D,
  quadrilateral: WallExternalBuilding
): { leftQuad: WallExternalBuilding; rightQuad: WallExternalBuilding } | null {
  if (!quadrilateral || !quadrilateral.points) {
    console.warn('Invalid quadrilateral or points data in splitQuadAtNorthMeridian');
    return null;
  }

  // First, identify which edges cross the north meridian
  const points = [
    quadrilateral.points.downLeft,
    quadrilateral.points.upLeft,
    quadrilateral.points.upRight,
    quadrilateral.points.downRight,
  ];

  // Check if we have all needed points
  if (!points[0] || !points[1] || !points[2] || !points[3]) {
    console.warn('Missing points in quadrilateral');
    return null;
  }

  const crossingEdges: Array<{
    index1: number;
    index2: number;
    point1: Point3D;
    point2: Point3D;
  }> = [];

  for (let i = 0; i < points.length; i++) {
    const nextIndex = (i + 1) % points.length;
    if (lineSegmentCrossesNorthMeridian(referencePoint, points[i], points[nextIndex])) {
      crossingEdges.push({
        index1: i,
        index2: nextIndex,
        point1: points[i],
        point2: points[nextIndex],
      });
    }
  }

  // A quadrilateral crossing the north meridian should have exactly 2 crossing edges
  if (crossingEdges.length !== 2) {
    console.warn('Unexpected number of edges crossing north meridian:', crossingEdges.length);
    return null;
  }

  // Calculate the intersection points with the north meridian
  const intersections = crossingEdges.map((edge) => {
    const dx1 = edge.point1.x - referencePoint.x;
    const dx2 = edge.point2.x - referencePoint.x;
    const dy1 = edge.point1.y - referencePoint.y;
    const dy2 = edge.point2.y - referencePoint.y;
    const dz1 = edge.point1.z - referencePoint.z;
    const dz2 = edge.point2.z - referencePoint.z;

    // Calculate parameter t where x = 0
    const t = -dx1 / (dx2 - dx1);

    // Interpolate y and z at intersection
    const y = dy1 + t * (dy2 - dy1) + referencePoint.y;
    const z = dz1 + t * (dz2 - dz1) + referencePoint.z;

    return {
      x: referencePoint.x, // x=0 in the reference frame
      y: y,
      z: z,
      edgeIndex1: edge.index1,
      edgeIndex2: edge.index2,
    };
  });

  // Organize points by which side of the meridian they're on (east or west)
  const eastPoints: Array<{ index: number; point: Point3D }> = [];
  const westPoints: Array<{ index: number; point: Point3D }> = [];

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - referencePoint.x;
    if (dx >= 0) {
      westPoints.push({ index: i, point: points[i] });
    } else {
      eastPoints.push({ index: i, point: points[i] });
    }
  }

  // Create west quadrilateral
  const westQuad: WallExternalBuilding = {
    id: quadrilateral.id,
    gid: quadrilateral.gid,
    cadastralNumber: quadrilateral.cadastralNumber,
    points: {
      downLeft: { x: 0, y: 0, z: 0 },
      upLeft: { x: 0, y: 0, z: 0 },
      upRight: { x: 0, y: 0, z: 0 },
      downRight: { x: 0, y: 0, z: 0 },
    },
  };

  // Create east quadrilateral
  const eastQuad: WallExternalBuilding = {
    id: quadrilateral.id,
    gid: quadrilateral.gid,
    cadastralNumber: quadrilateral.cadastralNumber,
    points: {
      downLeft: { x: 0, y: 0, z: 0 },
      upLeft: { x: 0, y: 0, z: 0 },
      upRight: { x: 0, y: 0, z: 0 },
      downRight: { x: 0, y: 0, z: 0 },
    },
  };

  // Arrange points for west quad - sort points clockwise
  const westPointsSorted = [...westPoints].sort((a, b) => {
    // Sort by y value for simplicity
    return a.point.y - b.point.y;
  });

  // Arrange points for east quad - sort points clockwise
  const eastPointsSorted = [...eastPoints].sort((a, b) => {
    // Sort by y value for simplicity
    return a.point.y - b.point.y;
  });

  // Determine corners for west quadrilateral
  westQuad.points = {
    downLeft: westPointsSorted[0].point,
    upLeft: westPointsSorted[1].point,
    upRight: intersections[1],
    downRight: intersections[0],
  };

  eastQuad.points = {
    downLeft: eastPointsSorted[1].point,
    upLeft: eastPointsSorted[0].point,
    upRight: intersections[1],
    downRight: intersections[0],
  };

  return {
    leftQuad: eastQuad,
    rightQuad: westQuad,
  };
}

/**
 * Determines if a quadrilateral is to the left or right of a reference point
 * @param referencePoint - Reference 3D point {x, y, z}
 * @param quadrilateral - Object with four corners in points property
 * @returns "left" if the quadrilateral is to the left, "right" if to the right
 */
export function isQuadrilateralLeftOrRight(
  referencePoint: Point3D,
  quadrilateral: WallExternalBuilding
): 'left' | 'right' | 'unknown' {
  if (!quadrilateral || !quadrilateral.points) {
    return 'unknown';
  }

  let sumX = 0;
  let pointCount = 0;

  // Calculate the average x-coordinate of all points relative to reference point
  for (const pointKey in quadrilateral.points) {
    if (quadrilateral.points.hasOwnProperty(pointKey)) {
      const point =
        quadrilateral.points[pointKey as keyof typeof quadrilateral.points];
      // Calculate the x-coordinate relative to reference point
      const dx = point.x - referencePoint.x;
      sumX += dx;
      pointCount++;
    }
  }

  // If average is negative, the quadrilateral is mostly to the left
  // If average is positive, the quadrilateral is mostly to the right
  const averageX = sumX / pointCount;

  return averageX < 0 ? 'left' : 'right';
}

/**
 * Check if one its vertex is exactly on the north meridian
 */
export function isVertexOnNorthMeridian(
  referencePoint: Point3D,
  quadrilateral: WallExternalBuilding
): boolean {
  const isTrue =
    quadrilateral.points.downLeft.x === referencePoint.x ||
    quadrilateral.points.upLeft.x === referencePoint.x ||
    quadrilateral.points.upRight.x === referencePoint.x ||
    quadrilateral.points.downRight.x === referencePoint.x;
  return isTrue;
}
