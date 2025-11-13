/**
 * Room joining/snapping utility
 * Based on wall centerline matching with three snap modes:
 * - edge-vertex: Rotate + translate to align walls and snap vertices
 * - vertex-only: Just translate to snap nearest vertices
 * - edge-only: Rotate + translate to make walls colinear
 */

import { Vertex, Room, Aperture } from '../types';
import { localToWorld } from './coordinates';

// Thresholds
const SEGMENT_THRESHOLD = 50;  // pixels - max distance for edge snapping
const VERTEX_THRESHOLD = 30;   // pixels - max distance for vertex snapping
const ANGLE_TOLERANCE = 10;    // degrees - walls must be within this of opposite

// Types
interface LineSegment {
  p1: Vertex;
  p2: Vertex;
  edgeIndex?: number; // Track which actual edge this segment corresponds to
  room?: Room; // Track which room this segment belongs to
}

interface SegmentPair {
  moving: LineSegment;
  stationary: LineSegment;
  distance: number;
  movingVertexDistances: {
    p1p1: number;
    p1p2: number;
    p2p1: number;
    p2p2: number;
  };
}

export interface RoomSnapResult {
  rotation: number;      // Angle in radians to rotate moving room
  translation: Vertex;   // Delta to add to moving room position
  snapped: boolean;      // true if snap found
  mode?: 'edge-vertex' | 'vertex-only' | 'edge-only';
  movingRoomId?: string;       // ID of the moving room
  stationaryRoomId?: string;   // ID of the stationary room
  movingSegmentWorld?: { p1: Vertex; p2: Vertex };  // Centerline segment in world space
  stationarySegmentWorld?: { p1: Vertex; p2: Vertex }; // Centerline segment in world space
  debugInfo?: {
    closestMovingSegment?: LineSegment;
    closestStationarySegment?: LineSegment;
    closestMovingVertex?: Vertex;
    closestStationaryVertex?: Vertex;
  };
}

/**
 * Calculate wall centerline for a room using polygon offsetting
 * Returns vertices offset OUTWARD by half the wall thickness
 * (floor polygon is inner boundary, centerline is outside it)
 *
 * Uses assemblyVertices (with collinear reference points) if available,
 * otherwise falls back to geometry vertices
 */
export function calculateCenterline(room: Room): Vertex[] {
  const halfThickness = room.wallThickness / 2;

  // Use assemblyVertices (with reference points) if available, otherwise use geometry vertices
  const vertices = room.assemblyVertices || room.vertices;
  const n = vertices.length;

  if (n < 3) return vertices;

  // Create offset lines for each edge
  const offsetLines: { start: Vertex; end: Vertex }[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];

    // Edge vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) continue;

    // Normalize
    const dirX = dx / length;
    const dirY = dy / length;

    // Perpendicular outward (for CCW polygon, right-hand normal)
    const normalX = dirY;
    const normalY = -dirX;

    // Offset line
    offsetLines.push({
      start: {
        x: p1.x + normalX * halfThickness,
        y: p1.y + normalY * halfThickness
      },
      end: {
        x: p2.x + normalX * halfThickness,
        y: p2.y + normalY * halfThickness
      }
    });
  }

  // Find intersections of adjacent offset lines
  const centerline: Vertex[] = [];
  for (let i = 0; i < offsetLines.length; i++) {
    const line1 = offsetLines[i];
    const line2 = offsetLines[(i + 1) % offsetLines.length];

    // Find intersection
    const intersection = lineIntersection(line1, line2);
    if (intersection) {
      centerline.push(intersection);
    } else {
      // Fallback: use average of endpoints
      centerline.push({
        x: (line1.end.x + line2.start.x) / 2,
        y: (line1.end.y + line2.start.y) / 2
      });
    }
  }

  return centerline;
}

/**
 * Find intersection of two lines
 */
function lineIntersection(
  line1: { start: Vertex; end: Vertex },
  line2: { start: Vertex; end: Vertex }
): Vertex | null {
  const x1 = line1.start.x;
  const y1 = line1.start.y;
  const x2 = line1.end.x;
  const y2 = line1.end.y;
  const x3 = line2.start.x;
  const y3 = line2.start.y;
  const x4 = line2.end.x;
  const y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Parallel lines
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

/**
 * Get room segments from centerline
 */
function getRoomSegments(room: Room, offset: Vertex): LineSegment[] {
  // Use room.vertices (actual walls) so edgeIndex matches walls array and doors can be found
  const centerline = room.vertices;

  // Transform to world coordinates
  const worldVertices = centerline.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Apply offset
  const offsetVertices = worldVertices.map(v => ({
    x: v.x + offset.x,
    y: v.y + offset.y
  }));

  // Create segments
  const segments: LineSegment[] = [];
  for (let i = 0; i < offsetVertices.length; i++) {
    const next = (i + 1) % offsetVertices.length;
    segments.push({
      p1: offsetVertices[i],
      p2: offsetVertices[next],
      edgeIndex: i,
      room: room
    });
  }

  return segments;
}

/**
 * Find closest segment pair between moving and stationary rooms
 * Prioritizes opposite walls (180° apart)
 */
function findClosestSegmentPair(
  movingSegments: LineSegment[],
  stationarySegments: LineSegment[]
): SegmentPair | null {
  let bestPair: SegmentPair | null = null;
  let bestVertexOnlyPair: SegmentPair | null = null;
  let minVertexOnlyDistance = Infinity;
  const angleToleranceRad = ANGLE_TOLERANCE * Math.PI / 180;

  let bestScore = -Infinity;

  for (const movingSeg of movingSegments) {
    for (const statSeg of stationarySegments) {
      // Calculate vertex distances
      const vertexDistances = {
        p1p1: pointDistance(movingSeg.p1, statSeg.p1),
        p1p2: pointDistance(movingSeg.p1, statSeg.p2),
        p2p1: pointDistance(movingSeg.p2, statSeg.p1),
        p2p2: pointDistance(movingSeg.p2, statSeg.p2)
      };

      const minVertexDist = Math.min(
        vertexDistances.p1p1,
        vertexDistances.p1p2,
        vertexDistances.p2p1,
        vertexDistances.p2p2
      );

      // Track best vertex-only pair
      if (minVertexDist < minVertexOnlyDistance && minVertexDist < VERTEX_THRESHOLD) {
        minVertexOnlyDistance = minVertexDist;
        bestVertexOnlyPair = {
          moving: movingSeg,
          stationary: statSeg,
          distance: segmentToSegmentDistance(movingSeg, statSeg),
          movingVertexDistances: vertexDistances
        };
      }

      // Calculate angles
      const movingAngle = Math.atan2(
        movingSeg.p2.y - movingSeg.p1.y,
        movingSeg.p2.x - movingSeg.p1.x
      );
      const stationaryAngle = Math.atan2(
        statSeg.p2.y - statSeg.p1.y,
        statSeg.p2.x - statSeg.p1.x
      );

      // Check if walls are opposite (180° apart)
      const angleDiff = Math.abs(normalizeAngle(movingAngle - stationaryAngle));
      const oppositeAngleDiff = Math.abs(angleDiff - Math.PI);
      const isOpposite = oppositeAngleDiff <= angleToleranceRad;

      const distance = segmentToSegmentDistance(movingSeg, statSeg);

      if (distance >= SEGMENT_THRESHOLD) {
        continue;
      }

      // Score: prioritize opposite walls + closer distance
      let score = 0;

      if (isOpposite) {
        score = 1000 + (SEGMENT_THRESHOLD - distance) / SEGMENT_THRESHOLD * 100;
      } else {
        score = (SEGMENT_THRESHOLD - distance) / SEGMENT_THRESHOLD * 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPair = {
          moving: movingSeg,
          stationary: statSeg,
          distance,
          movingVertexDistances: vertexDistances
        };
      }
    }
  }

  return bestPair || bestVertexOnlyPair;
}

/**
 * Determine snap mode based on distances and angles
 */
function calculateSnapMode(
  segmentPair: SegmentPair,
  isOppositeWalls: boolean
): 'edge-vertex' | 'vertex-only' | 'edge-only' | 'none' {
  const { distance, movingVertexDistances } = segmentPair;
  const minVertexDist = Math.min(
    movingVertexDistances.p1p1,
    movingVertexDistances.p1p2,
    movingVertexDistances.p2p1,
    movingVertexDistances.p2p2
  );

  if (isOppositeWalls) {
    // Edge+Vertex (highest priority)
    if (distance < SEGMENT_THRESHOLD && minVertexDist < VERTEX_THRESHOLD) {
      return 'edge-vertex';
    }

    // Edge-only
    if (distance < SEGMENT_THRESHOLD) {
      return 'edge-only';
    }
  }

  // Vertex-only (works regardless of angle)
  if (minVertexDist < VERTEX_THRESHOLD) {
    return 'vertex-only';
  }

  return 'none';
}

/**
 * Calculate rotation to align two segments (anti-parallel)
 */
function alignAngles(movingSegment: LineSegment, stationarySegment: LineSegment): number {
  const movingAngle = Math.atan2(
    movingSegment.p2.y - movingSegment.p1.y,
    movingSegment.p2.x - movingSegment.p1.x
  );
  const stationaryAngle = Math.atan2(
    stationarySegment.p2.y - stationarySegment.p1.y,
    stationarySegment.p2.x - stationarySegment.p1.x
  );

  // Try both parallel and anti-parallel (180° opposite)
  const parallelRotation = normalizeAngle(stationaryAngle - movingAngle);
  const antiParallelRotation = normalizeAngle(stationaryAngle + Math.PI - movingAngle);

  // Adjust to [-PI, PI] range
  const parallel = parallelRotation > Math.PI ? parallelRotation - 2 * Math.PI : parallelRotation;
  const antiParallel = antiParallelRotation > Math.PI ? antiParallelRotation - 2 * Math.PI : antiParallelRotation;

  // Return whichever requires less rotation
  return Math.abs(parallel) < Math.abs(antiParallel) ? parallel : antiParallel;
}

/**
 * Rotate a point around a center
 */
function rotatePoint(point: Vertex, angle: number, center: Vertex): Vertex {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

/**
 * Project point onto infinite line defined by segment
 */
function projectPointOntoLine(point: Vertex, segment: LineSegment): Vertex {
  const A = point.x - segment.p1.x;
  const B = point.y - segment.p1.y;
  const C = segment.p2.x - segment.p1.x;
  const D = segment.p2.y - segment.p1.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    return segment.p1;
  }

  const param = dot / lenSq;

  return {
    x: segment.p1.x + param * C,
    y: segment.p1.y + param * D
  };
}

/**
 * Calculate transformation for snap mode
 */
function calculateTransformation(
  mode: 'edge-vertex' | 'vertex-only' | 'edge-only',
  segmentPair: SegmentPair,
  movingRoom: Room,
  currentOffset: Vertex,
  doorCenters?: {
    moving: Vertex;
    stationary: Vertex;
  }
): { rotation: number; translation: Vertex } {
  const center = {
    x: movingRoom.position.x + currentOffset.x,
    y: movingRoom.position.y + currentOffset.y
  };

  switch (mode) {
    case 'edge-vertex': {
      // Rotate to align edges
      const rotation = alignAngles(segmentPair.moving, segmentPair.stationary);

      // Use door centers if provided, otherwise use wall vertices
      if (doorCenters) {
        // Door-based alignment: rotate door center, then align with stationary door
        const rotatedDoorCenter = rotatePoint(doorCenters.moving, rotation, center);
        const translation = {
          x: currentOffset.x + (doorCenters.stationary.x - rotatedDoorCenter.x),
          y: currentOffset.y + (doorCenters.stationary.y - rotatedDoorCenter.y)
        };
        return { rotation, translation };
      } else {
        // Standard vertex-based alignment
        const rotatedP1 = rotatePoint(segmentPair.moving.p1, rotation, center);
        const rotatedP2 = rotatePoint(segmentPair.moving.p2, rotation, center);

        const d1 = pointDistance(rotatedP1, segmentPair.stationary.p1);
        const d2 = pointDistance(rotatedP1, segmentPair.stationary.p2);
        const d3 = pointDistance(rotatedP2, segmentPair.stationary.p1);
        const d4 = pointDistance(rotatedP2, segmentPair.stationary.p2);

        const minDist = Math.min(d1, d2, d3, d4);
        let translation = currentOffset;

        if (minDist === d1) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - rotatedP1.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - rotatedP1.y)
          };
        } else if (minDist === d2) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - rotatedP1.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - rotatedP1.y)
          };
        } else if (minDist === d3) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - rotatedP2.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - rotatedP2.y)
          };
        } else {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - rotatedP2.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - rotatedP2.y)
          };
        }

        return { rotation, translation };
      }
    }

    case 'vertex-only': {
      // No rotation, just translate to snap closest vertices/doors
      if (doorCenters) {
        // Door-based alignment: simple translation to align door centers
        const translation = {
          x: currentOffset.x + (doorCenters.stationary.x - doorCenters.moving.x),
          y: currentOffset.y + (doorCenters.stationary.y - doorCenters.moving.y)
        };
        return { rotation: 0, translation };
      } else {
        // Standard vertex-based alignment
        const { movingVertexDistances } = segmentPair;
        const minDist = Math.min(
          movingVertexDistances.p1p1,
          movingVertexDistances.p1p2,
          movingVertexDistances.p2p1,
          movingVertexDistances.p2p2
        );

        let translation = currentOffset;

        if (minDist === movingVertexDistances.p1p1) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - segmentPair.moving.p1.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - segmentPair.moving.p1.y)
          };
        } else if (minDist === movingVertexDistances.p1p2) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - segmentPair.moving.p1.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - segmentPair.moving.p1.y)
          };
        } else if (minDist === movingVertexDistances.p2p1) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - segmentPair.moving.p2.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - segmentPair.moving.p2.y)
          };
        } else {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - segmentPair.moving.p2.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - segmentPair.moving.p2.y)
          };
        }

        return { rotation: 0, translation };
      }
    }

    case 'edge-only': {
      // Rotate to align edges, then translate to make colinear
      const rotation = alignAngles(segmentPair.moving, segmentPair.stationary);

      // Apply rotation to segment
      const rotatedP1 = rotatePoint(segmentPair.moving.p1, rotation, center);
      const rotatedP2 = rotatePoint(segmentPair.moving.p2, rotation, center);
      const rotatedSegment = { p1: rotatedP1, p2: rotatedP2 };

      // Project midpoint onto stationary line
      const rotatedMidpoint = {
        x: (rotatedSegment.p1.x + rotatedSegment.p2.x) / 2,
        y: (rotatedSegment.p1.y + rotatedSegment.p2.y) / 2
      };

      const projected = projectPointOntoLine(rotatedMidpoint, segmentPair.stationary);

      const translation = {
        x: currentOffset.x + (projected.x - rotatedMidpoint.x),
        y: currentOffset.y + (projected.y - rotatedMidpoint.y)
      };

      return { rotation, translation };
    }
  }
}

// Helper functions
function pointDistance(p1: Vertex, p2: Vertex): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function pointToSegmentDistance(point: Vertex, segment: LineSegment): number {
  const A = point.x - segment.p1.x;
  const B = point.y - segment.p1.y;
  const C = segment.p2.x - segment.p1.x;
  const D = segment.p2.y - segment.p1.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = segment.p1.x;
    yy = segment.p1.y;
  } else if (param > 1) {
    xx = segment.p2.x;
    yy = segment.p2.y;
  } else {
    xx = segment.p1.x + param * C;
    yy = segment.p1.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function segmentToSegmentDistance(seg1: LineSegment, seg2: LineSegment): number {
  const d1 = pointToSegmentDistance(seg1.p1, seg2);
  const d2 = pointToSegmentDistance(seg1.p2, seg2);
  const d3 = pointToSegmentDistance(seg2.p1, seg1);
  const d4 = pointToSegmentDistance(seg2.p2, seg1);

  return Math.min(d1, d2, d3, d4);
}

function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

/**
 * Get all doors on a specific wall
 * @param room - Room to check
 * @param wallIndex - Index of the wall
 * @returns Array of doors on that wall
 */
function getDoorsOnWall(room: Room, wallIndex: number): Aperture[] {
  if (!room.walls || !room.walls[wallIndex] || !room.walls[wallIndex].apertures) {
    return [];
  }

  const doors = room.walls[wallIndex].apertures.filter(ap => ap.type === 'door');
  return doors;
}

/**
 * Calculate door center position in world coordinates
 * Uses the room's actual geometry vertices, not centerlines
 */
function getDoorCenterWorld(
  room: Room,
  wallIndex: number,
  aperture: Aperture,
  offset: Vertex = { x: 0, y: 0 }
): Vertex | null {
  if (!room.vertices || room.vertices.length < 3) return null;

  // Get wall start and end vertices (floor polygon geometry)
  const v1 = room.vertices[wallIndex];
  const v2 = room.vertices[(wallIndex + 1) % room.vertices.length];

  if (!v1 || !v2) return null;

  // Calculate wall length in local coordinates
  const wallDx = v2.x - v1.x;
  const wallDy = v2.y - v1.y;
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

  if (wallLength < 0.001) return null;

  // Calculate door center position along wall
  // aperture.distance and width are in METERS, convert to pixels (*100)
  let absolutePos: number;
  if (aperture.anchorVertex === 'start') {
    absolutePos = aperture.distance * 100 + (aperture.width * 100) / 2;
  } else {
    absolutePos = wallLength - aperture.distance * 100 - (aperture.width * 100) / 2;
  }

  // Parametric position along wall [0,1]
  const t = absolutePos / wallLength;

  // Interpolate in local coordinates (this is on the inner edge)
  const localCenterInner: Vertex = {
    id: 'door_center',
    x: v1.x + (v2.x - v1.x) * t,
    y: v1.y + (v2.y - v1.y) * t
  };

  // Offset outward by half wall thickness to get centerline position
  const wallThickness = room.walls[wallIndex]?.thickness || 20;
  const normalX = wallDy / wallLength;   // Perpendicular to wall (outward) - matches aperture drawing
  const normalY = -wallDx / wallLength;

  const localCenter: Vertex = {
    id: 'door_center',
    x: localCenterInner.x + normalX * (wallThickness / 2),
    y: localCenterInner.y + normalY * (wallThickness / 2)
  };

  // Transform to world coordinates
  const worldCenter = localToWorld(localCenter, room.position, room.rotation, room.scale);

  // Apply offset for moving rooms
  return {
    id: worldCenter.id,
    x: worldCenter.x + offset.x,
    y: worldCenter.y + offset.y
  };
}

/**
 * Main snap function - finds best snap between moving room and all other rooms
 */
export function snapRoomToRooms(
  movingRoom: Room,
  proposedOffset: Vertex,
  allRooms: Room[],
  visualizeOnly: boolean = false
): RoomSnapResult {
  // Get moving room segments (with offset applied)
  const movingSegments = getRoomSegments(movingRoom, proposedOffset);
  if (movingSegments.length === 0) {
    return { rotation: 0, translation: proposedOffset, snapped: false };
  }

  // Get all stationary room segments
  const stationarySegments: LineSegment[] = [];
  for (const room of allRooms) {
    if (room.id !== movingRoom.id) {
      stationarySegments.push(...getRoomSegments(room, { x: 0, y: 0 }));
    }
  }

  if (stationarySegments.length === 0) {
    return { rotation: 0, translation: proposedOffset, snapped: false };
  }

  // Find closest segment pair (these are the orange walls)
  const closestPair = findClosestSegmentPair(movingSegments, stationarySegments);
  if (!closestPair) {
    return { rotation: 0, translation: proposedOffset, snapped: false };
  }

  // Get all possible snap points: wall vertices + door centers
  const movingPoints: Vertex[] = [closestPair.moving.p1, closestPair.moving.p2];
  const stationaryPoints: Vertex[] = [closestPair.stationary.p1, closestPair.stationary.p2];

  // Add door centers ONLY from the closest wall pair
  if (closestPair.moving.room && closestPair.moving.edgeIndex !== undefined) {
    const doors = getDoorsOnWall(closestPair.moving.room, closestPair.moving.edgeIndex);
    for (const door of doors) {
      const doorCenter = getDoorCenterWorld(closestPair.moving.room, closestPair.moving.edgeIndex, door, proposedOffset);
      if (doorCenter) movingPoints.push(doorCenter);
    }
  }

  if (closestPair.stationary.room && closestPair.stationary.edgeIndex !== undefined) {
    const doors = getDoorsOnWall(closestPair.stationary.room, closestPair.stationary.edgeIndex);
    for (const door of doors) {
      const doorCenter = getDoorCenterWorld(closestPair.stationary.room, closestPair.stationary.edgeIndex, door);
      if (doorCenter) stationaryPoints.push(doorCenter);
    }
  }

  // Find closest point pair among ALL points (vertices + doors)
  let doorCenters: { moving: Vertex; stationary: Vertex } | undefined;
  let minPointDistance = Infinity;
  let closestMovingPoint: Vertex | undefined;
  let closestStationaryPoint: Vertex | undefined;

  for (const mPoint of movingPoints) {
    for (const sPoint of stationaryPoints) {
      const dist = pointDistance(mPoint, sPoint);
      if (dist < minPointDistance) {
        minPointDistance = dist;
        closestMovingPoint = mPoint;
        closestStationaryPoint = sPoint;
      }
    }
  }

  // Use door centers if the closest pair is within threshold and not wall vertices
  if (closestMovingPoint && closestStationaryPoint && minPointDistance < VERTEX_THRESHOLD) {
    const isMovingDoor = closestMovingPoint !== closestPair.moving.p1 && closestMovingPoint !== closestPair.moving.p2;
    const isStationaryDoor = closestStationaryPoint !== closestPair.stationary.p1 && closestStationaryPoint !== closestPair.stationary.p2;

    if (isMovingDoor || isStationaryDoor) {
      doorCenters = { moving: closestMovingPoint, stationary: closestStationaryPoint };
      console.log('🚪 DOOR SNAP:', minPointDistance.toFixed(1), 'px');
    }
  }

  // Check if walls are opposite
  const movingAngle = Math.atan2(
    closestPair.moving.p2.y - closestPair.moving.p1.y,
    closestPair.moving.p2.x - closestPair.moving.p1.x
  );
  const stationaryAngle = Math.atan2(
    closestPair.stationary.p2.y - closestPair.stationary.p1.y,
    closestPair.stationary.p2.x - closestPair.stationary.p1.x
  );
  const angleDiff = Math.abs(normalizeAngle(movingAngle - stationaryAngle));
  const oppositeAngleDiff = Math.abs(angleDiff - Math.PI);
  const isOppositeWalls = oppositeAngleDiff <= (ANGLE_TOLERANCE * Math.PI / 180);

  // Determine snap mode
  let snapMode = calculateSnapMode(closestPair, isOppositeWalls);

  // Door-to-door takes absolute priority - override any mode
  if (doorCenters) {
    snapMode = 'edge-vertex'; // Align walls + snap door centers
  }

  if (snapMode === 'none') {
    return { rotation: 0, translation: proposedOffset, snapped: false };
  }

  // For visualization only - return debug info without transformation
  if (visualizeOnly) {
    const minVertexDist = Math.min(
      closestPair.movingVertexDistances.p1p1,
      closestPair.movingVertexDistances.p1p2,
      closestPair.movingVertexDistances.p2p1,
      closestPair.movingVertexDistances.p2p2
    );

    let closestMovingVertex: Vertex | undefined;
    let closestStationaryVertex: Vertex | undefined;

    if (minVertexDist < VERTEX_THRESHOLD) {
      if (minVertexDist === closestPair.movingVertexDistances.p1p1) {
        closestMovingVertex = closestPair.moving.p1;
        closestStationaryVertex = closestPair.stationary.p1;
      } else if (minVertexDist === closestPair.movingVertexDistances.p1p2) {
        closestMovingVertex = closestPair.moving.p1;
        closestStationaryVertex = closestPair.stationary.p2;
      } else if (minVertexDist === closestPair.movingVertexDistances.p2p1) {
        closestMovingVertex = closestPair.moving.p2;
        closestStationaryVertex = closestPair.stationary.p1;
      } else {
        closestMovingVertex = closestPair.moving.p2;
        closestStationaryVertex = closestPair.stationary.p2;
      }
    }

    // Get actual wall edges (outer boundary) instead of centerlines
    let actualMovingWall: LineSegment | undefined;
    let actualStationaryWall: LineSegment | undefined;

    if (closestPair.moving.room && closestPair.moving.edgeIndex !== undefined) {
      const room = closestPair.moving.room;
      const edgeIdx = closestPair.moving.edgeIndex;

      // Safety check: ensure vertices exist at these indices
      if (room.vertices[edgeIdx] && room.vertices[(edgeIdx + 1) % room.vertices.length]) {
        const v1 = localToWorld(room.vertices[edgeIdx], room.position, room.rotation, room.scale);
        const v2 = localToWorld(room.vertices[(edgeIdx + 1) % room.vertices.length], room.position, room.rotation, room.scale);
        actualMovingWall = {
          p1: { x: v1.x + proposedOffset.x, y: v1.y + proposedOffset.y },
          p2: { x: v2.x + proposedOffset.x, y: v2.y + proposedOffset.y }
        };
      }
    }

    if (closestPair.stationary.room && closestPair.stationary.edgeIndex !== undefined) {
      const room = closestPair.stationary.room;
      const edgeIdx = closestPair.stationary.edgeIndex;

      // Safety check: ensure vertices exist at these indices
      if (room.vertices[edgeIdx] && room.vertices[(edgeIdx + 1) % room.vertices.length]) {
        const v1 = localToWorld(room.vertices[edgeIdx], room.position, room.rotation, room.scale);
        const v2 = localToWorld(room.vertices[(edgeIdx + 1) % room.vertices.length], room.position, room.rotation, room.scale);
        actualStationaryWall = {
          p1: v1,
          p2: v2
        };
      }
    }

    return {
      rotation: 0,
      translation: proposedOffset,
      snapped: true,
      mode: snapMode,
      movingRoomId: closestPair.moving.room?.id,
      stationaryRoomId: closestPair.stationary.room?.id,
      movingSegmentWorld: { p1: closestPair.moving.p1, p2: closestPair.moving.p2 },
      stationarySegmentWorld: { p1: closestPair.stationary.p1, p2: closestPair.stationary.p2 },
      debugInfo: {
        closestMovingSegment: actualMovingWall || closestPair.moving,
        closestStationarySegment: actualStationaryWall || closestPair.stationary,
        closestMovingVertex,
        closestStationaryVertex
      }
    };
  }

  // Calculate and return transformation (use door centers if available)
  const transformation = calculateTransformation(
    snapMode,
    closestPair,
    movingRoom,
    proposedOffset,
    doorCenters
  );

  return {
    ...transformation,
    snapped: true,
    mode: snapMode,
    movingRoomId: closestPair.moving.room?.id,
    stationaryRoomId: closestPair.stationary.room?.id,
    movingSegmentWorld: { p1: closestPair.moving.p1, p2: closestPair.moving.p2 },
    stationarySegmentWorld: { p1: closestPair.stationary.p1, p2: closestPair.stationary.p2 }
  };
}
