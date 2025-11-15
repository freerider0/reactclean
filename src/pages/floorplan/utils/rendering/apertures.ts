/**
 * Aperture rendering functions
 * Functions for drawing doors and windows on walls
 */

import { Vertex, Room, Viewport } from '../../types';
import { worldToScreen, localToWorld } from '../coordinates';
import { getWallQuad } from '../walls';

// --- Utility Functions (Extracted to eliminate duplication) ---

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ApertureCorners {
  roomEdgeStart: Vertex;
  roomEdgeEnd: Vertex;
  outerApertureStart: Vertex;
  outerApertureEnd: Vertex;
}

function calculateApertureCorners(
  wall: any,
  inner1: Vertex,
  inner2: Vertex,
  unitX: number,
  unitY: number,
  perpX: number,
  perpY: number,
  wallLength: number,
  aperture: any
): ApertureCorners {
  const apertureWidthPx = aperture.width * 100;
  let startDist: number;
  if (aperture.anchorVertex === 'end') {
    startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
  } else {
    startDist = aperture.distance * 100;
  }
  const endDist = startDist + apertureWidthPx;

  // Calculate corner points
  const roomEdgeStart = {
    x: inner1.x + unitX * startDist,
    y: inner1.y + unitY * startDist
  };
  const roomEdgeEnd = {
    x: inner1.x + unitX * endDist,
    y: inner1.y + unitY * endDist
  };

  // Use segment-based thickness for exterior vs interior walls
  // CRITICAL FIX: Pass the aperture object directly so getApertureThickness can access distance/anchorVertex
  const segmentThickness = getApertureThickness(wall, aperture, wallLength);
  const apertureDepth = segmentThickness;

  // Extend aperture outward from room edge
  const outerApertureStart = {
    x: roomEdgeStart.x + perpX * apertureDepth,
    y: roomEdgeStart.y + perpY * apertureDepth
  };
  const outerApertureEnd = {
    x: roomEdgeEnd.x + perpX * apertureDepth,
    y: roomEdgeEnd.y + perpY * apertureDepth
  };

  return { roomEdgeStart, roomEdgeEnd, outerApertureStart, outerApertureEnd };
}

interface DoorSwingGeometry {
  hingePoint: Vertex;
  doorWidth: number;
  closedAngle: number;
  openAngle: number;
  swingDirection: 1 | -1;
  hingeOnLeft: boolean;
}

function calculateDoorSwingGeometry(
  aperture: any,
  corners: {
    innerLeft: Vertex;
    innerRight: Vertex;
    outerLeft: Vertex;
    outerRight: Vertex;
  }
): DoorSwingGeometry {
  // Configuration flags
  const hingeOnLeft = !aperture.flipHorizontal; // true = left, false = right
  const hingeOnInnerEdge = !aperture.flipVertical; // true = inner, false = outer

  // Determine hinge point and panel end (opposite side)
  let hingePoint: Vertex;
  let panelEnd: Vertex;

  if (hingeOnLeft) {
    hingePoint = hingeOnInnerEdge ? corners.innerLeft : corners.outerLeft;
    panelEnd = hingeOnInnerEdge ? corners.innerRight : corners.outerRight;
  } else {
    hingePoint = hingeOnInnerEdge ? corners.innerRight : corners.outerRight;
    panelEnd = hingeOnInnerEdge ? corners.innerLeft : corners.outerLeft;
  }

  // Door width is distance between hinge and panel end
  const doorWidth = Math.sqrt(
    (panelEnd.x - hingePoint.x) ** 2 + (panelEnd.y - hingePoint.y) ** 2
  );

  // Angle of closed door panel (from hinge to panel end)
  const closedAngle = Math.atan2(panelEnd.y - hingePoint.y, panelEnd.x - hingePoint.x);

  // Determine swing direction: +1 = clockwise, -1 = counter-clockwise
  let swingDirection: 1 | -1;
  if (hingeOnInnerEdge) {
    // Inward swing: left hinge = clockwise, right hinge = counter-clockwise
    swingDirection = hingeOnLeft ? 1 : -1;
  } else {
    // Outward swing: left hinge = counter-clockwise, right hinge = clockwise
    swingDirection = hingeOnLeft ? -1 : 1;
  }

  // Open angle is ALWAYS exactly 90 degrees from closed angle
  const openAngle = closedAngle + (swingDirection * Math.PI / 2);

  return { hingePoint, doorWidth, closedAngle, openAngle, swingDirection, hingeOnLeft };
}

function drawDoorSwing(
  ctx: CanvasRenderingContext2D,
  geometry: DoorSwingGeometry
): void {
  // Draw 90-degree swing arc (path of the moving edge)
  ctx.beginPath();
  ctx.arc(
    geometry.hingePoint.x,
    geometry.hingePoint.y,
    geometry.doorWidth,
    geometry.closedAngle,  // Start angle
    geometry.openAngle,    // End angle (exactly 90° away)
    geometry.swingDirection === -1  // Anticlockwise flag
  );
  ctx.stroke();

  // Draw open door panel (from hinge to final position)
  const openEndX = geometry.hingePoint.x + Math.cos(geometry.openAngle) * geometry.doorWidth;
  const openEndY = geometry.hingePoint.y + Math.sin(geometry.openAngle) * geometry.doorWidth;

  ctx.beginPath();
  ctx.moveTo(geometry.hingePoint.x, geometry.hingePoint.y);
  ctx.lineTo(openEndX, openEndY);
  ctx.stroke();
}

// --- Main Functions ---

function getApertureThickness(wall: any, aperture: any, wallLength: number): number {
  // Calculate door center position along wall (0 to 1)
  const apertureWidthPx = aperture.width * 100;
  let startDist: number;
  if (aperture.anchorVertex === 'end') {
    startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
  } else {
    startDist = aperture.distance * 100;
  }
  const doorCenterDist = startDist + apertureWidthPx / 2;
  const doorCenterRatio = doorCenterDist / wallLength;

  // Default to wall thickness if no segments
  if (!wall.segments || wall.segments.length === 0) {
    return wall.thickness || 20;
  }

  // Find which segment the door is on
  const segmentCount = wall.segments.length;
  const segmentSize = 1.0 / segmentCount;

  for (let i = 0; i < wall.segments.length; i++) {
    const segmentStart = i * segmentSize;
    const segmentEnd = (i + 1) * segmentSize;

    if (doorCenterRatio >= segmentStart && doorCenterRatio < segmentEnd) {
      const segment = wall.segments[i];
      const isExterior = segment.wallType === 'exterior';
      return isExterior ? 30 : 15;
    }
  }

  // Fallback to last segment
  const lastSegment = wall.segments[wall.segments.length - 1];
  const isExterior = lastSegment.wallType === 'exterior';
  return isExterior ? 30 : 15;
}

function getApertureCenter(
  room: Room,
  wallIndex: number,
  aperture: any,
  worldVertices: Vertex[]
): Vertex | null {
  const wall = room.walls[wallIndex];
  if (!wall) return null;

  const inner1 = worldVertices[wall.vertexIndex];
  const inner2 = worldVertices[(wall.vertexIndex + 1) % worldVertices.length];

  const wallDx = inner2.x - inner1.x;
  const wallDy = inner2.y - inner1.y;
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

  if (wallLength === 0) return null;

  const apertureWidthPx = aperture.width * 100;
  let startDist: number;
  if (aperture.anchorVertex === 'end') {
    startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
  } else {
    startDist = aperture.distance * 100;
  }
  const centerDist = startDist + apertureWidthPx / 2;

  const unitX = wallDx / wallLength;
  const unitY = wallDy / wallLength;
  const perpX = unitY;
  const perpY = -unitX;

  const innerCenter = {
    x: inner1.x + unitX * centerDist,
    y: inner1.y + unitY * centerDist
  };

  return {
    id: 'aperture_center',
    x: innerCenter.x + perpX * (wall.thickness / 2),
    y: innerCenter.y + perpY * (wall.thickness / 2)
  };
}

function shouldSkipPairedDoor(
  currentRoom: Room,
  wallIndex: number,
  aperture: any,
  currentWorldVertices: Vertex[],
  allRooms: Room[]
): boolean {
  if (aperture.type !== 'door') return false;

  const currentCenter = getApertureCenter(currentRoom, wallIndex, aperture, currentWorldVertices);
  if (!currentCenter) return false;

  for (const otherRoom of allRooms) {
    if (otherRoom.id === currentRoom.id || !otherRoom.walls) continue;

    const otherWorldVertices = otherRoom.vertices.map(v =>
      localToWorld(v, otherRoom.position, otherRoom.rotation, otherRoom.scale)
    );

    for (let otherWallIndex = 0; otherWallIndex < otherRoom.walls.length; otherWallIndex++) {
      const otherWall = otherRoom.walls[otherWallIndex];
      if (!otherWall.apertures) continue;

      for (const otherAperture of otherWall.apertures) {
        if (otherAperture.type !== 'door') continue;

        const otherCenter = getApertureCenter(otherRoom, otherWallIndex, otherAperture, otherWorldVertices);
        if (!otherCenter) continue;

        const dist = Math.sqrt(
          (currentCenter.x - otherCenter.x) ** 2 + (currentCenter.y - otherCenter.y) ** 2
        );

        if (dist < 5) {
          return (currentRoom.createdAt || 0) > (otherRoom.createdAt || 0);
        }
      }
    }
  }

  return false;
}

/**
 * Draw apertures (doors and windows) on walls
 */
export function drawApertures(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  allRooms?: Room[]
): void {
  if (!room.walls || room.walls.length === 0) return;

  ctx.save();

  const sourceVertices = room.vertices;
  if (!sourceVertices || sourceVertices.length < 3) {
    ctx.restore();
    return;
  }

  const worldVertices = sourceVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  room.walls.forEach((wall, wallIndex) => {
    if (!wall.apertures || wall.apertures.length === 0) return;

    const [inner1, inner2] = getWallQuad(wall, worldVertices);

    const wallDx = inner2.x - inner1.x;
    const wallDy = inner2.y - inner1.y;
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    if (wallLength === 0) return;

    const unitX = wallDx / wallLength;
    const unitY = wallDy / wallLength;
    const perpX = unitY;
    const perpY = -unitX;

    for (const aperture of wall.apertures) {
      if (allRooms && shouldSkipPairedDoor(room, wallIndex, aperture, worldVertices, allRooms)) {
        continue;
      }

      // Calculate aperture corners
      const corners = calculateApertureCorners(
        wall, inner1, inner2, unitX, unitY, perpX, perpY, wallLength, aperture
      );

      // Transform to screen coordinates
      const screenRoomEdgeStart = worldToScreen(corners.roomEdgeStart, viewport);
      const screenRoomEdgeEnd = worldToScreen(corners.roomEdgeEnd, viewport);
      const screenOuterApertureStart = worldToScreen(corners.outerApertureStart, viewport);
      const screenOuterApertureEnd = worldToScreen(corners.outerApertureEnd, viewport);

      // Draw aperture opening
      ctx.fillStyle = room.color || '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(screenRoomEdgeStart.x, screenRoomEdgeStart.y);
      ctx.lineTo(screenRoomEdgeEnd.x, screenRoomEdgeEnd.y);
      ctx.lineTo(screenOuterApertureEnd.x, screenOuterApertureEnd.y);
      ctx.lineTo(screenOuterApertureStart.x, screenOuterApertureStart.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.setLineDash([]);

      // Draw door swing for doors
      if (aperture.type === 'door') {
        const doorCorners = {
          innerLeft: screenRoomEdgeStart,
          innerRight: screenRoomEdgeEnd,
          outerLeft: screenOuterApertureStart,
          outerRight: screenOuterApertureEnd
        };

        const geometry = calculateDoorSwingGeometry(aperture, doorCorners);

        // Draw swing arc and open door line
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        drawDoorSwing(ctx, geometry);

        // Visual indicator: small circle at hinge point
        if (aperture.flipHorizontal !== undefined) {
          ctx.fillStyle = geometry.hingeOnLeft ? '#4ECDC4' : '#FF6B6B';
          ctx.beginPath();
          ctx.arc(geometry.hingePoint.x, geometry.hingePoint.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });

  ctx.restore();
}

/**
 * Draw ghost preview of aperture being dragged
 */
export function drawApertureGhost(
  ctx: CanvasRenderingContext2D,
  room: Room,
  wallIndex: number,
  aperture: { width: number; type: 'door' | 'window' },
  targetDistance: number,
  targetAnchor: 'start' | 'end',
  viewport: Viewport,
  isValid: boolean = true
): void {
  if (!room.walls || wallIndex < 0 || wallIndex >= room.walls.length) return;

  ctx.save();

  const wall = room.walls[wallIndex];
  const sourceVertices = room.vertices;
  if (!sourceVertices || sourceVertices.length < 3) {
    ctx.restore();
    return;
  }

  const worldVertices = sourceVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  const [inner1, inner2] = getWallQuad(wall, worldVertices);

  const wallDx = inner2.x - inner1.x;
  const wallDy = inner2.y - inner1.y;
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

  if (wallLength === 0) {
    ctx.restore();
    return;
  }

  const unitX = wallDx / wallLength;
  const unitY = wallDy / wallLength;
  const perpX = unitY;
  const perpY = -unitX;

  // CRITICAL FIX: Create temp aperture with target properties for correct thickness calculation
  const tempAperture = {
    ...aperture,
    distance: targetDistance,
    anchorVertex: targetAnchor,
    flipVertical: false // Ghost preview shows inward swing
  };

  // Calculate aperture corners
  const corners = calculateApertureCorners(
    wall, inner1, inner2, unitX, unitY, perpX, perpY, wallLength, tempAperture
  );

  // Transform to screen coordinates
  const screenRoomEdgeStart = worldToScreen(corners.roomEdgeStart, viewport);
  const screenRoomEdgeEnd = worldToScreen(corners.roomEdgeEnd, viewport);
  const screenOuterApertureStart = worldToScreen(corners.outerApertureStart, viewport);
  const screenOuterApertureEnd = worldToScreen(corners.outerApertureEnd, viewport);

  // Draw ghost aperture
  ctx.fillStyle = hexToRgba(room.color || '#FFFFFF', 0.8);
  ctx.strokeStyle = isValid ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.moveTo(screenRoomEdgeStart.x, screenRoomEdgeStart.y);
  ctx.lineTo(screenRoomEdgeEnd.x, screenRoomEdgeEnd.y);
  ctx.lineTo(screenOuterApertureEnd.x, screenOuterApertureEnd.y);
  ctx.lineTo(screenOuterApertureStart.x, screenOuterApertureStart.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw door swing ghost
  if (aperture.type === 'door') {
    ctx.setLineDash([]);

    const doorCorners = {
      innerLeft: screenRoomEdgeStart,
      innerRight: screenRoomEdgeEnd,
      outerLeft: screenOuterApertureStart,
      outerRight: screenOuterApertureEnd
    };

    const geometry = calculateDoorSwingGeometry(tempAperture, doorCorners);

    ctx.strokeStyle = isValid ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 1;
    drawDoorSwing(ctx, geometry);
  }

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw door centers as visual debug markers
 */
export function drawDoorCenters(
  ctx: CanvasRenderingContext2D,
  rooms: Room[],
  viewport: Viewport,
  movingRoomId?: string,
  stationaryRoomId?: string,
  movingRoomOffset?: Vertex,
  isDoorSnap?: boolean
): void {
  ctx.save();

  const getDoorCenter = (room: Room, wallIndex: number, aperture: any, offset: Vertex = { x: 0, y: 0 }): Vertex | null => {
    if (!room.vertices || room.vertices.length < 3) return null;

    const v1 = room.vertices[wallIndex];
    const v2 = room.vertices[(wallIndex + 1) % room.vertices.length];
    if (!v1 || !v2) return null;

    const wallDx = v2.x - v1.x;
    const wallDy = v2.y - v1.y;
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
    if (wallLength < 0.001) return null;

    let absolutePos: number;
    if (aperture.anchorVertex === 'start') {
      absolutePos = aperture.distance * 100 + (aperture.width * 100) / 2;
    } else {
      absolutePos = wallLength - aperture.distance * 100 - (aperture.width * 100) / 2;
    }

    const t = absolutePos / wallLength;
    const localCenterInner: Vertex = {
      id: 'door_center',
      x: v1.x + (v2.x - v1.x) * t,
      y: v1.y + (v2.y - v1.y) * t
    };

    const wallThickness = room.walls[wallIndex]?.thickness || 20;
    const normalX = wallDy / wallLength;
    const normalY = -wallDx / wallLength;

    const localCenter: Vertex = {
      id: 'door_center',
      x: localCenterInner.x + normalX * (wallThickness / 2),
      y: localCenterInner.y + normalY * (wallThickness / 2)
    };

    const worldCenter = localToWorld(localCenter, room.position, room.rotation, room.scale);
    return {
      id: worldCenter.id,
      x: worldCenter.x + offset.x,
      y: worldCenter.y + offset.y
    };
  };

  const movingRoom = movingRoomId ? rooms.find(r => r.id === movingRoomId) : undefined;
  const stationaryRoom = stationaryRoomId ? rooms.find(r => r.id === stationaryRoomId) : undefined;

  const findClosestWallIndex = (
    currentRoom: Room,
    otherRoom: Room,
    currentRoomOffset: Vertex = { x: 0, y: 0 }
  ): number => {
    if (!currentRoom.walls || !otherRoom.vertices) return -1;

    let minSegmentDist = Infinity;
    let closestSegmentMid: Vertex | null = null;

    for (let i = 0; i < otherRoom.vertices.length; i++) {
      const v1 = otherRoom.vertices[i];
      const v2 = otherRoom.vertices[(i + 1) % otherRoom.vertices.length];

      const cos = Math.cos(otherRoom.rotation);
      const sin = Math.sin(otherRoom.rotation);
      const v1World = {
        x: otherRoom.position.x + (v1.x * cos - v1.y * sin) * otherRoom.scale,
        y: otherRoom.position.y + (v1.x * sin + v1.y * cos) * otherRoom.scale
      };
      const v2World = {
        x: otherRoom.position.x + (v2.x * cos - v2.y * sin) * otherRoom.scale,
        y: otherRoom.position.y + (v2.x * sin + v2.y * cos) * otherRoom.scale
      };

      const segMid = {
        x: (v1World.x + v2World.x) / 2,
        y: (v1World.y + v2World.y) / 2
      };

      const currentCentroidX = currentRoom.position.x + currentRoomOffset.x;
      const currentCentroidY = currentRoom.position.y + currentRoomOffset.y;
      const dist = Math.sqrt(
        (segMid.x - currentCentroidX) ** 2 + (segMid.y - currentCentroidY) ** 2
      );

      if (dist < minSegmentDist) {
        minSegmentDist = dist;
        closestSegmentMid = segMid;
      }
    }

    if (!closestSegmentMid) return -1;

    let closestWallIdx = -1;
    let minWallDist = Infinity;

    currentRoom.walls.forEach((wall, wallIndex) => {
      const v1 = currentRoom.vertices[wall.vertexIndex];
      const v2 = currentRoom.vertices[(wall.vertexIndex + 1) % currentRoom.vertices.length];
      if (!v1 || !v2) return;

      const cos = Math.cos(currentRoom.rotation);
      const sin = Math.sin(currentRoom.rotation);
      const v1World = {
        x: currentRoom.position.x + (v1.x * cos - v1.y * sin) * currentRoom.scale + currentRoomOffset.x,
        y: currentRoom.position.y + (v1.x * sin + v1.y * cos) * currentRoom.scale + currentRoomOffset.y
      };
      const v2World = {
        x: currentRoom.position.x + (v2.x * cos - v2.y * sin) * currentRoom.scale + currentRoomOffset.x,
        y: currentRoom.position.y + (v2.x * sin + v2.y * cos) * currentRoom.scale + currentRoomOffset.y
      };

      const wallMid = {
        x: (v1World.x + v2World.x) / 2,
        y: (v1World.y + v2World.y) / 2
      };

      const dist = Math.sqrt(
        (wallMid.x - closestSegmentMid.x) ** 2 + (wallMid.y - closestSegmentMid.y) ** 2
      );

      if (dist < minWallDist) {
        minWallDist = dist;
        closestWallIdx = wallIndex;
      }
    });

    return closestWallIdx;
  };

  const movingRoomClosestWallIndex = movingRoom && stationaryRoom
    ? findClosestWallIndex(movingRoom, stationaryRoom, movingRoomOffset || { x: 0, y: 0 })
    : -1;

  const stationaryRoomClosestWallIndex = stationaryRoom && movingRoom
    ? findClosestWallIndex(stationaryRoom, movingRoom)
    : -1;

  let movingDoorCenter: Vertex | null = null;
  let stationaryDoorCenter: Vertex | null = null;

  rooms.forEach(room => {
    if (!room.walls || room.walls.length === 0) return;

    const isMovingRoom = movingRoomId && room.id === movingRoomId;
    const isStationaryRoom = stationaryRoomId && room.id === stationaryRoomId;
    if (!isMovingRoom && !isStationaryRoom) return;

    const color = isDoorSnap ? '#10b981' : (isMovingRoom ? '#d946ef' : '#0dcaf0');
    const offset = isMovingRoom && movingRoomOffset ? movingRoomOffset : { x: 0, y: 0 };
    const closestWallIndex = isMovingRoom ? movingRoomClosestWallIndex : stationaryRoomClosestWallIndex;
    if (closestWallIndex === -1) return;

    room.walls.forEach((wall, wallIndex) => {
      if (wallIndex !== closestWallIndex) return;
      if (!wall.apertures || wall.apertures.length === 0) return;

      wall.apertures.forEach(aperture => {
        if (aperture.type !== 'door') return;

        const doorCenter = getDoorCenter(room, wallIndex, aperture, offset);
        if (!doorCenter) return;

        if (isMovingRoom) {
          movingDoorCenter = doorCenter;
        } else if (isStationaryRoom) {
          stationaryDoorCenter = doorCenter;
        }

        const screenCenter = worldToScreen(doorCenter, viewport);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x - 5, screenCenter.y);
        ctx.lineTo(screenCenter.x + 5, screenCenter.y);
        ctx.moveTo(screenCenter.x, screenCenter.y - 5);
        ctx.lineTo(screenCenter.x, screenCenter.y + 5);
        ctx.stroke();
      });
    });
  });

  if (isDoorSnap && movingDoorCenter && stationaryDoorCenter) {
    const screenMoving = worldToScreen(movingDoorCenter, viewport);
    const screenStationary = worldToScreen(stationaryDoorCenter, viewport);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(screenMoving.x, screenMoving.y);
    ctx.lineTo(screenStationary.x, screenStationary.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}