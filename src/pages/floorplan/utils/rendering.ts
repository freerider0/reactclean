/**
 * Rendering utility functions
 * Pure functions for drawing on canvas
 */

import { Vertex, Room, Viewport, GridConfig, GuideLine, WallType } from '../types';
import { worldToScreen, localToWorld } from './coordinates';
import { getWallQuad } from './walls';
import { getRotationHandlePosition, calculateRoomCenter } from './rotation';
import { calculateEdgeLength, calculateMidpoint, formatDistance, calculateLabelOffset } from './dimensions';

// Wall type colors for envelope edges
const WALL_TYPE_COLORS: Record<WallType, string> = {
  'exterior': '#10b981',           // Green
  'neighbor_same_block': '#eab308', // Yellow
  'neighbor_other_block': '#ea580c', // Dark orange
  'interior_division': '#60a5fa',   // Light blue
  'interior_structural': '#3b82f6', // Blue
  'interior_partition': '#a855f7',  // Purple
  'terrain_contact': '#92400e',     // Brown
  'adiabatic': '#f97316'            // Orange
};

/**
 * Draw envelope polygon for a room
 */
export function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  snapSegmentWorld?: { p1: Vertex; p2: Vertex },
  isDragging: boolean = false,
  showDebugLines: boolean = false,
  selectedSegment?: { roomId: string; wallIndex: number; segmentIndex: number } | null,
  showHalfWalls: boolean = false
): void {
  if (!room.envelopeVertices || room.envelopeVertices.length < 3) return;

  ctx.save();

  // When not dragging, ALWAYS draw the outer envelope polygon (dark gray fill)
  // This is the base layer - segments will be drawn on top
  if (!isDragging) {
    // Transform envelope vertices to world coordinates
    const worldEnvelope = room.envelopeVertices.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );

    // Transform to screen coordinates
    const screenEnvelope = worldEnvelope.map(v => worldToScreen(v, viewport));

    // Draw envelope with dark gray fill only (no outline)
    ctx.fillStyle = '#1a1a1a'; // Very dark gray

    ctx.beginPath();
    ctx.moveTo(screenEnvelope[0].x, screenEnvelope[0].y);
    for (let i = 1; i < screenEnvelope.length; i++) {
      ctx.lineTo(screenEnvelope[i].x, screenEnvelope[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // PINK LINE: Merged centerline (skip when dragging or debug disabled)
  if (!isDragging && showDebugLines && room.debugMergedCenterline && room.debugMergedCenterline.length >= 3) {
    const worldCenterline = room.debugMergedCenterline.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );
    const screenCenterline = worldCenterline.map(v => worldToScreen(v, viewport));

    ctx.strokeStyle = '#ec4899'; // Pink
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line

    ctx.beginPath();
    ctx.moveTo(screenCenterline[0].x, screenCenterline[0].y);
    for (let i = 1; i < screenCenterline.length; i++) {
      ctx.lineTo(screenCenterline[i].x, screenCenterline[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash
  }

  // Draw walls (with segments if they exist)
  // When dragging, always draw walls to show snap indicators
  // When not dragging, only draw if showHalfWalls is enabled and has segments
  const hasSegments = room.walls.some(w => w.segments && w.segments.length > 0);

  if (isDragging || (showHalfWalls && hasSegments)) {
    drawWalls(ctx, room, viewport, {
      snapSegmentWorld,
      selectedSegment,
      skipSegments: true  // Segments drawn separately on top
    });
  }

  // YELLOW LINE: Inner boundary of exterior walls (skip when dragging or debug disabled)
  if (!isDragging && showDebugLines && room.innerBoundaryVertices && room.innerBoundaryVertices.length >= 3) {
    const worldInnerBoundary = room.innerBoundaryVertices.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );
    const screenInnerBoundary = worldInnerBoundary.map(v => worldToScreen(v, viewport));

    ctx.strokeStyle = '#eab308'; // Yellow
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line

    ctx.beginPath();
    ctx.moveTo(screenInnerBoundary[0].x, screenInnerBoundary[0].y);
    for (let i = 1; i < screenInnerBoundary.length; i++) {
      ctx.lineTo(screenInnerBoundary[i].x, screenInnerBoundary[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash
  }

  // GREEN LINE: Contracted envelope (skip when dragging or debug disabled)
  if (!isDragging && showDebugLines && room.debugContractedEnvelope && room.debugContractedEnvelope.length >= 3) {
    const worldContracted = room.debugContractedEnvelope.map(v =>
      localToWorld(v, room.position, room.rotation, room.scale)
    );
    const screenContracted = worldContracted.map(v => worldToScreen(v, viewport));

    ctx.strokeStyle = '#10b981'; // Green
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line

    ctx.beginPath();
    ctx.moveTo(screenContracted[0].x, screenContracted[0].y);
    for (let i = 1; i < screenContracted.length; i++) {
      ctx.lineTo(screenContracted[i].x, screenContracted[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash
  }

  ctx.restore();
}

/**
 * Draw apertures (doors and windows) on walls
 * Should be called AFTER walls/envelope are drawn to ensure visibility
 */
/**
 * Helper to calculate aperture center in world coordinates
 */
function getApertureCenter(
  room: Room,
  wallIndex: number,
  aperture: Aperture,
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

  // Calculate aperture position
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

  // Center on inner edge
  const innerCenter = {
    x: inner1.x + unitX * centerDist,
    y: inner1.y + unitY * centerDist
  };

  // Offset by half wall thickness to get centerline position
  return {
    id: 'aperture_center',
    x: innerCenter.x + perpX * (wall.thickness / 2),
    y: innerCenter.y + perpY * (wall.thickness / 2)
  };
}

/**
 * Check if this aperture has a paired door in another room
 * Returns true if we should skip drawing this door
 */
function shouldSkipPairedDoor(
  currentRoom: Room,
  wallIndex: number,
  aperture: Aperture,
  currentWorldVertices: Vertex[],
  allRooms: Room[]
): boolean {
  // Only check for doors, not windows
  if (aperture.type !== 'door') return false;

  const currentCenter = getApertureCenter(currentRoom, wallIndex, aperture, currentWorldVertices);
  if (!currentCenter) return false;

  // Check all other rooms for doors at the same position
  for (const otherRoom of allRooms) {
    if (otherRoom.id === currentRoom.id) continue;
    if (!otherRoom.walls) continue;

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

        // Check if doors are at same position (within 5px threshold)
        const dist = Math.sqrt(
          (currentCenter.x - otherCenter.x) ** 2 + (currentCenter.y - otherCenter.y) ** 2
        );

        if (dist < 5) {
          // Found a paired door - only draw from the room with smaller ID to avoid duplicates
          return currentRoom.id > otherRoom.id;
        }
      }
    }
  }

  return false;
}

export function drawApertures(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  allRooms?: Room[]
): void {
  if (!room.walls || room.walls.length === 0) return;

  ctx.save();

  // Get vertices (use room vertices - the inner edge)
  const sourceVertices = room.vertices;
  if (!sourceVertices || sourceVertices.length < 3) {
    ctx.restore();
    return;
  }

  // Transform to world coordinates
  const worldVertices = sourceVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Draw apertures for each wall
  room.walls.forEach((wall, wallIndex) => {
    if (!wall.apertures || wall.apertures.length === 0) return;

    // Get wall quad vertices
    const [inner1, inner2] = getWallQuad(wall, worldVertices);

    // Calculate wall direction along inner edge
    const wallDx = inner2.x - inner1.x;
    const wallDy = inner2.y - inner1.y;
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    if (wallLength === 0) return;

    // Unit vector along wall
    const unitX = wallDx / wallLength;
    const unitY = wallDy / wallLength;

    // Perpendicular vector pointing outward
    const perpX = unitY;
    const perpY = -unitX;

    // Draw each aperture
    for (const aperture of wall.apertures) {
      // Skip paired doors if we have access to all rooms
      if (allRooms && shouldSkipPairedDoor(room, wallIndex, aperture, worldVertices, allRooms)) {
        continue;
      }

      // Convert aperture width from meters to pixels (1m = 100px)
      const apertureWidthPx = aperture.width * 100;

      // Calculate aperture position along wall
      let startDist: number;
      if (aperture.anchorVertex === 'end') {
        startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
      } else {
        startDist = aperture.distance * 100;
      }
      const endDist = startDist + apertureWidthPx;

      // Aperture corners on room edge (inner edge)
      const roomEdgeStart = {
        x: inner1.x + unitX * startDist,
        y: inner1.y + unitY * startDist
      };
      const roomEdgeEnd = {
        x: inner1.x + unitX * endDist,
        y: inner1.y + unitY * endDist
      };

      // Extend aperture outward from room edge
      const apertureDepth = wall.thickness + 10;
      const outerApertureStart = {
        x: roomEdgeStart.x + perpX * apertureDepth,
        y: roomEdgeStart.y + perpY * apertureDepth
      };
      const outerApertureEnd = {
        x: roomEdgeEnd.x + perpX * apertureDepth,
        y: roomEdgeEnd.y + perpY * apertureDepth
      };

      // Transform to screen coordinates
      const screenRoomEdgeStart = worldToScreen(roomEdgeStart, viewport);
      const screenRoomEdgeEnd = worldToScreen(roomEdgeEnd, viewport);
      const screenOuterApertureStart = worldToScreen(outerApertureStart, viewport);
      const screenOuterApertureEnd = worldToScreen(outerApertureEnd, viewport);

      // Draw aperture opening as white rectangle
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.moveTo(screenRoomEdgeStart.x, screenRoomEdgeStart.y);
      ctx.lineTo(screenRoomEdgeEnd.x, screenRoomEdgeEnd.y);
      ctx.lineTo(screenOuterApertureEnd.x, screenOuterApertureEnd.y);
      ctx.lineTo(screenOuterApertureStart.x, screenOuterApertureStart.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw door swing arc for doors (architectural floor plan style)
      if (aperture.type === 'door') {
        // Hinge is at the OUTER edge of the aperture (outerApertureStart)
        const hingePoint = screenOuterApertureStart;

        // Door panel at closed position (along the outer wall edge)
        const doorPanelEnd = screenOuterApertureEnd;

        // Calculate door width in screen coordinates
        const doorWidth = Math.sqrt(
          (doorPanelEnd.x - hingePoint.x) ** 2 +
          (doorPanelEnd.y - hingePoint.y) ** 2
        );

        // Calculate angle from hinge to door panel (closed position)
        const angleToDoorPanel = Math.atan2(
          doorPanelEnd.y - hingePoint.y,
          doorPanelEnd.x - hingePoint.x
        );

        // Door swings inward (perpendicular to wall, into the room)
        // Start angle is the door panel position
        // End angle is 90 degrees counterclockwise from door panel
        const startAngle = angleToDoorPanel;
        const endAngle = angleToDoorPanel - Math.PI / 2;

        // Draw door panel line (thin black line at closed position)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hingePoint.x, hingePoint.y);
        ctx.lineTo(doorPanelEnd.x, doorPanelEnd.y);
        ctx.stroke();

        // Draw 90-degree swing arc
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          hingePoint.x,
          hingePoint.y,
          doorWidth,
          endAngle, // Start at open position
          startAngle, // End at closed position
          false
        );
        ctx.stroke();

        // Draw line from end of arc back to hinge (door in open position)
        // This completes the "wedge" showing the door swing area
        const openDoorEndX = hingePoint.x + Math.cos(endAngle) * doorWidth;
        const openDoorEndY = hingePoint.y + Math.sin(endAngle) * doorWidth;

        ctx.beginPath();
        ctx.moveTo(hingePoint.x, hingePoint.y);
        ctx.lineTo(openDoorEndX, openDoorEndY);
        ctx.stroke();
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

  // Transform to world coordinates
  const worldVertices = sourceVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Get wall quad vertices
  const [inner1, inner2] = getWallQuad(wall, worldVertices);

  // Calculate wall direction along inner edge
  const wallDx = inner2.x - inner1.x;
  const wallDy = inner2.y - inner1.y;
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

  if (wallLength === 0) {
    ctx.restore();
    return;
  }

  // Unit vector along wall
  const unitX = wallDx / wallLength;
  const unitY = wallDy / wallLength;

  // Perpendicular vector pointing outward
  const perpX = unitY;
  const perpY = -unitX;

  // Convert aperture width from meters to pixels
  const apertureWidthPx = aperture.width * 100;

  // Calculate aperture position along wall
  let startDist: number;
  if (targetAnchor === 'end') {
    startDist = wallLength - (targetDistance * 100) - apertureWidthPx;
  } else {
    startDist = targetDistance * 100;
  }
  const endDist = startDist + apertureWidthPx;

  // Aperture corners on room edge (inner edge)
  const roomEdgeStart = {
    x: inner1.x + unitX * startDist,
    y: inner1.y + unitY * startDist
  };
  const roomEdgeEnd = {
    x: inner1.x + unitX * endDist,
    y: inner1.y + unitY * endDist
  };

  // Extend aperture outward from room edge
  const apertureDepth = wall.thickness + 10;
  const outerApertureStart = {
    x: roomEdgeStart.x + perpX * apertureDepth,
    y: roomEdgeStart.y + perpY * apertureDepth
  };
  const outerApertureEnd = {
    x: roomEdgeEnd.x + perpX * apertureDepth,
    y: roomEdgeEnd.y + perpY * apertureDepth
  };

  // Transform to screen coordinates
  const screenRoomEdgeStart = worldToScreen(roomEdgeStart, viewport);
  const screenRoomEdgeEnd = worldToScreen(roomEdgeEnd, viewport);
  const screenOuterApertureStart = worldToScreen(outerApertureStart, viewport);
  const screenOuterApertureEnd = worldToScreen(outerApertureEnd, viewport);

  // Draw ghost aperture with transparency
  // Use cyan for valid position, red for invalid
  ctx.fillStyle = isValid ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)';
  ctx.strokeStyle = isValid ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  ctx.beginPath();
  ctx.moveTo(screenRoomEdgeStart.x, screenRoomEdgeStart.y);
  ctx.lineTo(screenRoomEdgeEnd.x, screenRoomEdgeEnd.y);
  ctx.lineTo(screenOuterApertureEnd.x, screenOuterApertureEnd.y);
  ctx.lineTo(screenOuterApertureStart.x, screenOuterApertureStart.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw door swing arc for door ghosts (architectural floor plan style)
  if (aperture.type === 'door') {
    ctx.setLineDash([]); // Solid lines for door arc

    // Hinge is at the OUTER edge of the aperture (outerApertureStart)
    const hingePoint = screenOuterApertureStart;

    // Door panel at closed position (along the outer wall edge)
    const doorPanelEnd = screenOuterApertureEnd;

    // Calculate door width in screen coordinates
    const doorWidth = Math.sqrt(
      (doorPanelEnd.x - hingePoint.x) ** 2 +
      (doorPanelEnd.y - hingePoint.y) ** 2
    );

    // Calculate angle from hinge to door panel (closed position)
    const angleToDoorPanel = Math.atan2(
      doorPanelEnd.y - hingePoint.y,
      doorPanelEnd.x - hingePoint.x
    );

    // Door swings inward (perpendicular to wall, into the room)
    const startAngle = angleToDoorPanel;
    const endAngle = angleToDoorPanel - Math.PI / 2;

    // Draw door panel line (semi-transparent)
    ctx.strokeStyle = isValid ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hingePoint.x, hingePoint.y);
    ctx.lineTo(doorPanelEnd.x, doorPanelEnd.y);
    ctx.stroke();

    // Draw 90-degree swing arc
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      hingePoint.x,
      hingePoint.y,
      doorWidth,
      endAngle, // Start at open position
      startAngle, // End at closed position
      false
    );
    ctx.stroke();

    // Draw line from end of arc back to hinge (door in open position)
    // This completes the "wedge" showing the door swing area
    const openDoorEndX = hingePoint.x + Math.cos(endAngle) * doorWidth;
    const openDoorEndY = hingePoint.y + Math.sin(endAngle) * doorWidth;

    ctx.beginPath();
    ctx.moveTo(hingePoint.x, hingePoint.y);
    ctx.lineTo(openDoorEndX, openDoorEndY);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw external walls using envelope vertex pairings
 * Uses debugContractedEnvelope (inner edge) and envelopeVertices (outer edge)
 */
export function drawExternalWalls(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  options: {
    selectedWallIndex?: number | null;
    hoverWallIndex?: number | null;
  } = {}
): void {
  if (!room.envelopeVertices || !room.debugContractedEnvelope) return;
  if (room.envelopeVertices.length !== room.debugContractedEnvelope.length) return;
  if (!room.walls || room.walls.length === 0) return;

  ctx.save();

  // Transform both envelopes to world coordinates
  const outerWorld = room.envelopeVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );
  const innerWorld = room.debugContractedEnvelope.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  const n = outerWorld.length;

  // Draw each wall quadrilateral
  for (let i = 0; i < n; i++) {
    // Find the wall index for this edge
    const wallIndex = room.walls.findIndex(w => w.vertexIndex === i);
    if (wallIndex === -1) continue;

    const wall = room.walls[wallIndex];

    // Check if this wall is selected or hovered
    const isSelected = options.selectedWallIndex !== undefined &&
                       options.selectedWallIndex !== null &&
                       wallIndex === options.selectedWallIndex;
    const isHover = options.hoverWallIndex !== undefined &&
                    options.hoverWallIndex !== null &&
                    wallIndex === options.hoverWallIndex;

    // Get quadrilateral vertices
    const innerStart = innerWorld[i];
    const innerEnd = innerWorld[(i + 1) % n];
    const outerEnd = outerWorld[(i + 1) % n];
    const outerStart = outerWorld[i];

    // Transform to screen coordinates
    const screenInnerStart = worldToScreen(innerStart, viewport);
    const screenInnerEnd = worldToScreen(innerEnd, viewport);
    const screenOuterEnd = worldToScreen(outerEnd, viewport);
    const screenOuterStart = worldToScreen(outerStart, viewport);

    // Choose colors based on state and wall type
    let strokeColor = '#475569'; // Darker gray
    let lineWidth = 1;

    // Create gradient or solid fill
    let fillStyle: string | CanvasGradient;

    if (isSelected) {
      fillStyle = '#3b82f6'; // Blue for selected
      strokeColor = '#2563eb';
      lineWidth = 3;
    } else if (isHover) {
      fillStyle = '#60a5fa'; // Light blue for hover
      strokeColor = '#3b82f6';
      lineWidth = 2;
    } else if (wall.wallType && WALL_TYPE_COLORS[wall.wallType]) {
      // Simple: gradient from inner edge center to outer edge center
      const innerCenterX = (screenInnerStart.x + screenInnerEnd.x) / 2;
      const innerCenterY = (screenInnerStart.y + screenInnerEnd.y) / 2;
      const outerCenterX = (screenOuterStart.x + screenOuterEnd.x) / 2;
      const outerCenterY = (screenOuterStart.y + screenOuterEnd.y) / 2;

      const gradient = ctx.createLinearGradient(
        innerCenterX, innerCenterY,  // Inner edge center
        outerCenterX, outerCenterY   // Outer edge center
      );

      gradient.addColorStop(0, '#64748b');  // Gray at inner edge
      gradient.addColorStop(0.5, '#64748b'); // Keep gray for 50% of the wall
      gradient.addColorStop(1, WALL_TYPE_COLORS[wall.wallType]); // Wall type color at outer edge

      fillStyle = gradient;
      strokeColor = WALL_TYPE_COLORS[wall.wallType];
    } else {
      fillStyle = '#64748b'; // Default gray
    }

    // Draw filled wall quad
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(screenInnerStart.x, screenInnerStart.y);
    ctx.lineTo(screenInnerEnd.x, screenInnerEnd.y);
    ctx.lineTo(screenOuterEnd.x, screenOuterEnd.y);
    ctx.lineTo(screenOuterStart.x, screenOuterStart.y);
    ctx.closePath();
    ctx.fill();

    // Draw outline
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw grid on canvas
 * Algorithm: World-space aligned grid with major/minor lines
 * COPIED FROM ORIGINAL - DO NOT MODIFY
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gridConfig: GridConfig,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!gridConfig.enabled) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
  ctx.lineWidth = 1;

  const zoom = viewport.zoom;
  const offsetX = viewport.x;
  const offsetY = viewport.y;
  const gridSize = gridConfig.size * zoom;

  // Calculate grid offset to keep it aligned with world space
  const startX = (offsetX % gridSize + gridSize) % gridSize;
  const startY = (offsetY % gridSize + gridSize) % gridSize;

  // Draw vertical lines
  for (let x = startX; x <= canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = startY; y <= canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Draw major grid lines (every 5 minor lines)
  if (gridSize >= 10) {
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.lineWidth = 2;

    const majorGridSize = gridSize * gridConfig.majorLines;
    const majorStartX = (offsetX % majorGridSize + majorGridSize) % majorGridSize;
    const majorStartY = (offsetY % majorGridSize + majorGridSize) % majorGridSize;

    for (let x = majorStartX; x <= canvasWidth; x += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    for (let y = majorStartY; y <= canvasHeight; y += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw a room on canvas
 */
export function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  options: {
    fillColor?: string;
    strokeColor?: string;
    lineWidth?: number;
    selected?: boolean;
    selectedEdgeIndex?: number | null;
  } = {}
): void {
  if (room.vertices.length < 3) return;

  ctx.save();

  // Transform vertices to screen coordinates
  const screenVertices = room.vertices.map(v => {
    const worldVertex = localToWorld(v, room.position, room.rotation, room.scale);
    return worldToScreen(worldVertex, viewport);
  });

  // Draw filled polygon
  ctx.fillStyle = options.fillColor || room.color || 'rgba(200, 220, 255, 0.5)';
  ctx.beginPath();
  ctx.moveTo(screenVertices[0].x, screenVertices[0].y);
  for (let i = 1; i < screenVertices.length; i++) {
    ctx.lineTo(screenVertices[i].x, screenVertices[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Draw edges individually to allow different colors per edge
  const defaultStrokeColor = options.strokeColor || (options.selected ? '#3b82f6' : '#64748b');
  const defaultLineWidth = options.lineWidth || (options.selected ? 3 : 2);
  const goldColor = '#fbbf24'; // Gold color for selected edge

  for (let i = 0; i < screenVertices.length; i++) {
    const v1 = screenVertices[i];
    const v2 = screenVertices[(i + 1) % screenVertices.length];

    // Check if this edge is selected
    const isSelectedEdge = options.selectedEdgeIndex !== undefined &&
                          options.selectedEdgeIndex !== null &&
                          options.selectedEdgeIndex === i;

    ctx.strokeStyle = isSelectedEdge ? goldColor : defaultStrokeColor;
    ctx.lineWidth = isSelectedEdge ? 4 : defaultLineWidth; // Thicker for selected edge

    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw numbered circles at envelope vertices for debugging (blue exterior merged polygon)
 */
export function drawCenterlineVertexNumbers(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport
): void {
  if (!room.envelopeVertices || room.envelopeVertices.length === 0) return;

  ctx.save();

  room.envelopeVertices.forEach((vertex, index) => {
    // Transform to world then screen coordinates
    const worldVertex = localToWorld(vertex, room.position, room.rotation, room.scale);
    const screenVertex = worldToScreen(worldVertex, viewport);

    // Draw circle
    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Blue with transparency
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw vertex number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index.toString(), screenVertex.x, screenVertex.y);
  });

  ctx.restore();
}

/**
 * Draw numbered circles at contracted envelope vertices for debugging (green merged polygon)
 */
export function drawContractedEnvelopeVertexNumbers(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport
): void {
  if (!room.debugContractedEnvelope || room.debugContractedEnvelope.length === 0) return;

  ctx.save();

  room.debugContractedEnvelope.forEach((vertex, index) => {
    // Transform to world then screen coordinates
    const worldVertex = localToWorld(vertex, room.position, room.rotation, room.scale);
    const screenVertex = worldToScreen(worldVertex, viewport);

    // Draw circle
    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)'; // Green with transparency
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw vertex number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index.toString(), screenVertex.x, screenVertex.y);
  });

  ctx.restore();
}

/**
 * Draw walls for a room with proper mitered corners
 */
export function drawWalls(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  options: {
    wallColor?: string;
    selected?: boolean;
    snapSegmentWorld?: { p1: Vertex; p2: Vertex };  // Centerline segment in world space
    snapMode?: 'edge-vertex' | 'vertex-only' | 'edge-only';
    selectedWallIndex?: number | null;  // Wall index that is selected in Edit mode
    hoverWallIndex?: number | null;  // Wall index that is hovered in Edit mode
    selectedSegment?: { roomId: string; wallIndex: number; segmentIndex: number } | null;  // Selected segment in Assembly mode
    skipSegments?: boolean;  // Skip drawing segments (they will be drawn separately on top)
  } = {}
): void {
  if (room.walls.length === 0) return;

  ctx.save();

  // Walls are drawn from floor vertices to centerline (half thickness only)
  // This shows how the two halves stick together when rooms connect
  const sourceVertices = room.vertices;

  // Transform vertices to world coordinates
  const worldVertices = sourceVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Check if walls should be highlighted (any snap mode)
  const shouldHighlightWalls = options.snapSegmentWorld !== undefined;

  // Find which wall is closest to the snap segment (if any)
  let closestWallIndex = -1;
  if (shouldHighlightWalls && options.snapSegmentWorld) {
    const snapMid = {
      x: (options.snapSegmentWorld.p1.x + options.snapSegmentWorld.p2.x) / 2,
      y: (options.snapSegmentWorld.p1.y + options.snapSegmentWorld.p2.y) / 2
    };

    let minDist = Infinity;

    room.walls.forEach((wall, wallIndex) => {
      // Get wall vertices in world space
      const v1World = localToWorld(sourceVertices[wall.vertexIndex], room.position, room.rotation, room.scale);
      const v2World = localToWorld(sourceVertices[(wall.vertexIndex + 1) % sourceVertices.length], room.position, room.rotation, room.scale);

      // Calculate wall midpoint
      const wallMid = {
        x: (v1World.x + v2World.x) / 2,
        y: (v1World.y + v2World.y) / 2
      };

      // Distance between midpoints
      const dist = Math.sqrt((wallMid.x - snapMid.x) ** 2 + (wallMid.y - snapMid.y) ** 2);

      if (dist < minDist) {
        minDist = dist;
        closestWallIndex = wallIndex;
      }
    });
  }

  // Pulsing animation for glow intensity
  const pulsePhase = (Date.now() % 1000) / 1000;
  const glowIntensity = 15 + Math.sin(pulsePhase * Math.PI * 2) * 8;

  // Draw each wall with proper corner intersections
  room.walls.forEach((wall, wallIndex) => {
    // Check if this is the wall that will snap
    const isSnapWall = shouldHighlightWalls && wallIndex === closestWallIndex;

    // Check if this wall is selected or hovered (Edit mode)
    const isSelectedWall = options.selectedWallIndex !== undefined &&
                           options.selectedWallIndex !== null &&
                           wallIndex === options.selectedWallIndex;
    const isHoverWall = options.hoverWallIndex !== undefined &&
                        options.hoverWallIndex !== null &&
                        wallIndex === options.hoverWallIndex;

    // If wall has segments, draw each segment separately with its own color
    // Skip if segments will be drawn separately on top
    if (wall.segments && wall.segments.length > 0 && room.segmentVertices && !options.skipSegments) {
      // Build segmentVertex lookup map for O(1) access
      const segmentVertexMap = new Map(
        room.segmentVertices.map(v => [v.id, v])
      );

      wall.segments.forEach((segment, segmentIndex) => {
        // Check if this segment is selected
        const isSelectedSegment = options.selectedSegment &&
                                   options.selectedSegment.roomId === room.id &&
                                   options.selectedSegment.wallIndex === wallIndex &&
                                   options.selectedSegment.segmentIndex === segmentIndex;

        // Look up segment vertices by ID
        const segStartLocal = segmentVertexMap.get(segment.startVertexId);
        const segEndLocal = segmentVertexMap.get(segment.endVertexId);

        if (!segStartLocal || !segEndLocal) {
          console.warn(`Segment vertices not found for IDs: ${segment.startVertexId}, ${segment.endVertexId}`);
          return;
        }

        // Transform to world coordinates
        const segStart = localToWorld(segStartLocal, room.position, room.rotation, room.scale);
        const segEnd = localToWorld(segEndLocal, room.position, room.rotation, room.scale);

        // Create a temporary wall-like structure for this segment
        const segmentWall = {
          ...wall,
          wallType: segment.wallType
        };

        // Get the edge vertices for this segment (use indices for getWallQuad)
        const segmentVertices = [segStart, segEnd];

        // Calculate wall quad for this segment
        // We need to calculate the outer vertices based on wall thickness
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.001) return; // Skip zero-length segments

        const normalX = -dy / length;
        const normalY = dx / length;
        const halfThickness = wall.thickness / 2;

        const outer1 = {
          id: 'temp',
          x: segStart.x + normalX * halfThickness,
          y: segStart.y + normalY * halfThickness
        };
        const outer2 = {
          id: 'temp',
          x: segEnd.x + normalX * halfThickness,
          y: segEnd.y + normalY * halfThickness
        };

        // Transform to screen coordinates
        const screenInner1 = worldToScreen(segStart, viewport);
        const screenInner2 = worldToScreen(segEnd, viewport);
        const screenOuter1 = worldToScreen(outer1, viewport);
        const screenOuter2 = worldToScreen(outer2, viewport);

        // Choose color based on segment wall type
        if (isSelectedSegment) {
          // Selected segment - red with strong glow
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
        } else if (isSelectedWall) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#3b82f6';
          ctx.fillStyle = '#3b82f6';
        } else if (isHoverWall) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#60a5fa';
          ctx.fillStyle = '#60a5fa';
        } else if (isSnapWall) {
          ctx.shadowBlur = glowIntensity;
          ctx.shadowColor = '#f59e0b';
          ctx.fillStyle = '#f59e0b';
        } else {
          // Use segment wall type color
          ctx.shadowBlur = 0;
          ctx.fillStyle = WALL_TYPE_COLORS[segment.wallType] || options.wallColor || '#94a3b8';
        }

        // Draw segment as filled quad
        ctx.beginPath();
        ctx.moveTo(screenInner1.x, screenInner1.y);
        ctx.lineTo(screenInner2.x, screenInner2.y);
        ctx.lineTo(screenOuter2.x, screenOuter2.y);
        ctx.lineTo(screenOuter1.x, screenOuter1.y);
        ctx.closePath();
        ctx.fill();

        // Draw segment outline - thicker and red if selected
        ctx.shadowBlur = 0; // Remove shadow for stroke
        ctx.strokeStyle = isSelectedSegment ? '#ef4444' : (options.selected ? '#3b82f6' : '#64748b');
        ctx.lineWidth = isSelectedSegment ? 3 : 1;
        ctx.stroke();
      });

      // Skip the regular wall drawing below for walls with segments
      return;
    }

    // Regular wall drawing (no segments) - original code
    // Get wall quad vertices with mitered corners
    const [inner1, inner2, outer2, outer1] = getWallQuad(wall, worldVertices);

    // Transform to screen coordinates
    const screenInner1 = worldToScreen(inner1, viewport);
    const screenInner2 = worldToScreen(inner2, viewport);
    const screenOuter2 = worldToScreen(outer2, viewport);
    const screenOuter1 = worldToScreen(outer1, viewport);

    // Apply colors and effects based on state
    if (isSelectedWall) {
      // Selected wall in Edit mode - blue with glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#3b82f6';
      ctx.fillStyle = '#3b82f6'; // Blue
    } else if (isHoverWall) {
      // Hover wall in Edit mode - light blue with glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#60a5fa';
      ctx.fillStyle = '#60a5fa'; // Light blue
    } else if (isSnapWall) {
      // Wall that will snap in Assembly mode - orange with pulsing glow
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = '#f59e0b';
      ctx.fillStyle = '#f59e0b'; // Orange
    } else {
      // Normal wall
      ctx.shadowBlur = 0;
      ctx.fillStyle = options.wallColor || '#94a3b8'; // Slate gray
    }

    // Draw wall as filled quad
    ctx.beginPath();
    ctx.moveTo(screenInner1.x, screenInner1.y);
    ctx.lineTo(screenInner2.x, screenInner2.y);
    ctx.lineTo(screenOuter2.x, screenOuter2.y);
    ctx.lineTo(screenOuter1.x, screenOuter1.y);
    ctx.closePath();
    ctx.fill();

    // Draw wall outline
    ctx.strokeStyle = options.selected ? '#3b82f6' : '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw colored line on outer edge if wall has a type and is on envelope
    if (wall.wallType && room.envelopeVertices && room.envelopeVertices.length > 0) {
      // Check if outer edge is on the envelope
      // An edge is on envelope if both outer vertices are close to envelope vertices
      const tolerance = 5; // pixels in world space

      // Transform envelope to world space
      const worldEnvelope = room.envelopeVertices.map(v =>
        localToWorld(v, room.position, room.rotation, room.scale)
      );

      // Check if outer edge matches any envelope edge
      let isOnEnvelope = false;
      for (let i = 0; i < worldEnvelope.length; i++) {
        const envP1 = worldEnvelope[i];
        const envP2 = worldEnvelope[(i + 1) % worldEnvelope.length];

        // Check if [outer1, outer2] matches [envP1, envP2] in either direction
        const dist1 = Math.hypot(outer1.x - envP1.x, outer1.y - envP1.y);
        const dist2 = Math.hypot(outer2.x - envP2.x, outer2.y - envP2.y);
        const dist3 = Math.hypot(outer1.x - envP2.x, outer1.y - envP2.y);
        const dist4 = Math.hypot(outer2.x - envP1.x, outer2.y - envP1.y);

        if ((dist1 < tolerance && dist2 < tolerance) || (dist3 < tolerance && dist4 < tolerance)) {
          isOnEnvelope = true;
          break;
        }
      }

      // Draw colored line on outer edge if on envelope
      if (isOnEnvelope) {
        ctx.save();
        ctx.shadowBlur = 0; // No shadow for type indicator
        ctx.strokeStyle = WALL_TYPE_COLORS[wall.wallType];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenOuter1.x, screenOuter1.y);
        ctx.lineTo(screenOuter2.x, screenOuter2.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // NOTE: Aperture rendering has been moved to dedicated drawApertures() function
    // which is called separately in Canvas.tsx to ensure proper rendering order
  });

  ctx.restore();
}

/**
 * Draw vertex handles
 */
export function drawVertexHandles(
  ctx: CanvasRenderingContext2D,
  vertices: Vertex[],
  viewport: Viewport,
  options: {
    selectedIndex?: number | null;
    hoverIndex?: number | null;
    handleSize?: number;
    touchTargetSize?: number;
    color?: string;
  } = {}
): void {
  const handleSize = options.handleSize || 8;
  const touchTargetSize = options.touchTargetSize || 20;
  const baseColor = options.color || '#3b82f6'; // Default blue

  ctx.save();

  vertices.forEach((vertex, index) => {
    const screenVertex = worldToScreen(vertex, viewport);
    const isSelected = options.selectedIndex === index;
    const isHover = options.hoverIndex === index;

    // Draw larger transparent touch target circle
    // Make it more visible on hover to show it's interactive
    if (isHover || isSelected) {
      ctx.fillStyle = `${baseColor}33`; // 20% opacity
      ctx.strokeStyle = `${baseColor}66`; // 40% opacity
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = `${baseColor}1A`; // 10% opacity
      ctx.strokeStyle = `${baseColor}33`; // 20% opacity
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, touchTargetSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw visible handle on top
    ctx.fillStyle = isSelected ? baseColor : isHover ? `${baseColor}CC` : '#ffffff';
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Draw edge handles (midpoints)
 */
export function drawEdgeHandles(
  ctx: CanvasRenderingContext2D,
  vertices: Vertex[],
  viewport: Viewport,
  options: {
    selectedIndex?: number | null;
    hoverIndex?: number | null;
    handleSize?: number;
  } = {}
): void {
  const handleSize = options.handleSize || 6;

  ctx.save();

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];

    const midpoint = {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2
    };

    const screenMidpoint = worldToScreen(midpoint, viewport);
    const isSelected = options.selectedIndex === i;
    const isHover = options.hoverIndex === i;

    // Draw handle
    ctx.fillStyle = isSelected ? '#3b82f6' : isHover ? '#60a5fa' : '#ffffff';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(screenMidpoint.x, screenMidpoint.y, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw segments for all rooms - call this LAST to ensure segments are on top
 */
export function drawSegments(
  ctx: CanvasRenderingContext2D,
  allRooms: Room[],
  viewport: Viewport,
  selectedSegment?: { roomId: string; wallIndex: number; segmentIndex: number } | null
): void {
  ctx.save();

  allRooms.forEach(room => {
    if (!room.walls || room.walls.length === 0 || !room.segmentVertices) return;

    const segmentVertexMap = new Map(
      room.segmentVertices.map(v => [v.id, v])
    );

    room.walls.forEach((wall, wallIndex) => {
      if (!wall.segments || wall.segments.length === 0) return;

      wall.segments.forEach((segment, segmentIndex) => {
        const isSelected = selectedSegment &&
                          selectedSegment.roomId === room.id &&
                          selectedSegment.wallIndex === wallIndex &&
                          selectedSegment.segmentIndex === segmentIndex;

        const segStartLocal = segmentVertexMap.get(segment.startVertexId);
        const segEndLocal = segmentVertexMap.get(segment.endVertexId);

        if (!segStartLocal || !segEndLocal) return;

        const segStartWorld = localToWorld(segStartLocal, room.position, room.rotation, room.scale);
        const segEndWorld = localToWorld(segEndLocal, room.position, room.rotation, room.scale);
        const segStartScreen = worldToScreen(segStartWorld, viewport);
        const segEndScreen = worldToScreen(segEndWorld, viewport);

        const dx = segEndScreen.x - segStartScreen.x;
        const dy = segEndScreen.y - segStartScreen.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.001) return;

        const normalX = -dy / length;
        const normalY = dx / length;
        const halfThickness = (wall.thickness / 2) * viewport.zoom;

        const outer1 = {
          x: segStartScreen.x + normalX * halfThickness,
          y: segStartScreen.y + normalY * halfThickness
        };
        const outer2 = {
          x: segEndScreen.x + normalX * halfThickness,
          y: segEndScreen.y + normalY * halfThickness
        };
        const inner2 = {
          x: segEndScreen.x - normalX * halfThickness,
          y: segEndScreen.y - normalY * halfThickness
        };
        const inner1 = {
          x: segStartScreen.x - normalX * halfThickness,
          y: segStartScreen.y - normalY * halfThickness
        };

        ctx.beginPath();
        ctx.moveTo(outer1.x, outer1.y);
        ctx.lineTo(outer2.x, outer2.y);
        ctx.lineTo(inner2.x, inner2.y);
        ctx.lineTo(inner1.x, inner1.y);
        ctx.closePath();

        const colors = {
          exterior: isSelected ? '#16a34a' : 'rgba(34, 197, 94, 0.7)',
          interior_division: isSelected ? '#2563eb' : 'rgba(59, 130, 246, 0.7)',
          interior_structural: isSelected ? '#7c3aed' : 'rgba(124, 58, 237, 0.7)',
          interior_partition: isSelected ? '#db2777' : 'rgba(219, 39, 119, 0.7)',
          terrain_contact: isSelected ? '#65a30d' : 'rgba(101, 163, 13, 0.7)',
          adiabatic: isSelected ? '#fbbf24' : 'rgba(251, 191, 36, 0.7)',
          neighbor_same_block: isSelected ? '#f97316' : 'rgba(249, 115, 22, 0.7)',
          neighbor_other_block: isSelected ? '#dc2626' : 'rgba(220, 38, 38, 0.7)'
        };

        ctx.fillStyle = colors[segment.wallType] || 'rgba(156, 163, 175, 0.7)';
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });
  });

  ctx.restore();
}

/**
 * Draw segment vertices (orange dots) - shows the actual vertices used for wall segments
 * These are the original room vertices plus intersection points with contracted envelopes
 */
export function drawWallSegmentVertices(
  ctx: CanvasRenderingContext2D,
  allRooms: Room[],
  viewport: Viewport
): void {
  ctx.save();

  const vertexColor = '#f59e0b'; // Orange
  const markerSize = 6;
  const pointsToDrawSet = new Set<string>(); // Unique world positions to avoid duplicates
  const pointsToDraw: Vertex[] = [];

  // Collect all segmentVertices from all rooms
  allRooms.forEach(room => {
    if (!room.segmentVertices || room.segmentVertices.length === 0) return;

    room.segmentVertices.forEach(vertex => {
      const worldVertex = localToWorld(vertex, room.position, room.rotation, room.scale);
      const key = `${worldVertex.x.toFixed(1)},${worldVertex.y.toFixed(1)}`;

      if (!pointsToDrawSet.has(key)) {
        pointsToDrawSet.add(key);
        pointsToDraw.push(worldVertex);
      }
    });
  });

  // 4. Draw all unique points
  pointsToDraw.forEach(worldPos => {
    const screenVertex = worldToScreen(worldPos, viewport);

    ctx.fillStyle = vertexColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, markerSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Check if a point lies on a line segment (within tolerance)
 */
function isPointOnSegment(point: Vertex, segStart: Vertex, segEnd: Vertex, tolerance: number): boolean {
  // Calculate distance from point to segment
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 0.0001) {
    // Segment is a point
    const dist = Math.hypot(point.x - segStart.x, point.y - segStart.y);
    return dist < tolerance;
  }

  // Calculate projection parameter t
  const t = Math.max(0, Math.min(1,
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSquared
  ));

  // Calculate closest point on segment
  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;

  // Check distance
  const dist = Math.hypot(point.x - projX, point.y - projY);
  return dist < tolerance;
}

/**
 * Draw guide lines (orthogonal snap indicators)
 */
export function drawGuideLine(
  ctx: CanvasRenderingContext2D,
  guideLine: GuideLine,
  viewport: Viewport
): void {
  ctx.save();

  const start = worldToScreen(guideLine.start, viewport);
  const end = worldToScreen(guideLine.end, viewport);

  ctx.strokeStyle = '#ef4444'; // Bright red
  ctx.lineWidth = 2; // Thicker for better visibility
  ctx.setLineDash([8, 4]); // Longer dashes for better visibility

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw drawing preview (polygon being drawn)
 */
export function drawDrawingPreview(
  ctx: CanvasRenderingContext2D,
  vertices: Vertex[],
  currentMouseWorld: Vertex | null,
  snapPosition: Vertex | null,
  viewport: Viewport
): void {
  if (vertices.length === 0) return;

  ctx.save();

  const screenVertices = vertices.map(v => worldToScreen(v, viewport));

  // Check if we're close to the first vertex (for closing indicator)
  const MIN_VERTICES = 3;
  const CLOSE_THRESHOLD = 20; // Must match Canvas.tsx
  let isNearFirstVertex = false;
  if (vertices.length >= MIN_VERTICES && snapPosition) {
    const firstVertex = vertices[0];
    const dx = snapPosition.x - firstVertex.x;
    const dy = snapPosition.y - firstVertex.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    isNearFirstVertex = dist < CLOSE_THRESHOLD;
  }

  // Draw completed segments
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screenVertices[0].x, screenVertices[0].y);
  for (let i = 1; i < screenVertices.length; i++) {
    ctx.lineTo(screenVertices[i].x, screenVertices[i].y);
  }
  ctx.stroke();

  // Draw preview line to current mouse position
  if (currentMouseWorld && snapPosition) {
    const lastVertex = screenVertices[screenVertices.length - 1];
    const snapScreen = worldToScreen(snapPosition, viewport);

    // If near first vertex, draw closing line in green
    if (isNearFirstVertex) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
    }
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(lastVertex.x, lastVertex.y);
    ctx.lineTo(snapScreen.x, snapScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw vertices
  screenVertices.forEach((v, index) => {
    const isFirst = index === 0;
    // Highlight first vertex in green if we're close enough to close
    const vertexColor = isFirst && isNearFirstVertex ? '#22c55e' : (isFirst ? '#ef4444' : '#3b82f6');
    ctx.fillStyle = vertexColor;
    ctx.beginPath();
    ctx.arc(v.x, v.y, isFirst ? 10 : 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw pulsing ring around first vertex when close
    if (isFirst && isNearFirstVertex) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(v.x, v.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Draw snap position indicator
  if (snapPosition && !isNearFirstVertex) {
    const snapScreen = worldToScreen(snapPosition, viewport);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(snapScreen.x, snapScreen.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw rotation handle for selected room
 */
export function drawRotationHandle(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  options: {
    handleDistance?: number;
    isHover?: boolean;
    isDragging?: boolean;
  } = {}
): void {
  const handleDistance = options.handleDistance || 80;

  ctx.save();

  // Calculate room center in world space
  const center = calculateRoomCenter(room.vertices, room.position);
  const screenCenter = worldToScreen(center, viewport);

  // Calculate handle position
  const handleWorldPos = getRotationHandlePosition(center, room.rotation, handleDistance);
  const handleScreenPos = worldToScreen(handleWorldPos, viewport);

  // Draw line from center to handle
  ctx.strokeStyle = options.isDragging ? '#3b82f6' : '#64748b';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(screenCenter.x, screenCenter.y);
  ctx.lineTo(handleScreenPos.x, handleScreenPos.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw rotation handle circle
  const handleSize = options.isDragging ? 12 : options.isHover ? 10 : 8;
  ctx.fillStyle = options.isDragging ? '#3b82f6' : options.isHover ? '#60a5fa' : '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(handleScreenPos.x, handleScreenPos.y, handleSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw rotation icon (circular arrow)
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(handleScreenPos.x, handleScreenPos.y, handleSize / 2, -Math.PI / 4, Math.PI, false);
  // Arrow tip
  ctx.lineTo(handleScreenPos.x - handleSize / 4, handleScreenPos.y);
  ctx.lineTo(handleScreenPos.x - handleSize / 2.5, handleScreenPos.y + handleSize / 4);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw architectural dimension lines on room edges
 * Copied from original DimensionRenderer.ts with proper extension lines and arrows
 */
export function drawDimensionLabels(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  options: {
    selected?: boolean;
    offsetDistance?: number;
    onRegisterLabel?: (label: {
      roomId: string;
      edgeIndex: number;
      position: { x: number; y: number };
      bounds: { x: number; y: number; width: number; height: number };
      currentValue: number;
      wallVertices: [Vertex, Vertex];
    }) => void;
  } = {}
): void {
  ctx.save();

  // Transform vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Configuration (matching original DimensionRenderer)
  const EXTENSION_LINE_OFFSET = 10;
  const DIMENSION_LINE_BASE_OFFSET = 30;
  const EXTENSION_LINE_OVERSHOOT = 10;
  const ARROW_LENGTH = 10;
  const ARROW_WIDTH = 3;
  const TEXT_PADDING = 8;

  // Calculate centroid for outward direction
  let centroidX = 0, centroidY = 0;
  for (const v of worldVertices) {
    centroidX += v.x;
    centroidY += v.y;
  }
  centroidX /= worldVertices.length;
  centroidY /= worldVertices.length;

  // Draw dimension for each edge
  for (let i = 0; i < worldVertices.length; i++) {
    const v1 = worldVertices[i];
    const v2 = worldVertices[(i + 1) % worldVertices.length];

    // Calculate edge length
    const lengthCm = Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);
    const lengthM = lengthCm / 100;

    // Skip very small edges
    if (lengthCm < 10) continue;

    // Format dimension text
    const text = lengthM < 10 ? `${lengthM.toFixed(2)}m` : `${lengthM.toFixed(1)}m`;

    // Check for constraints on this edge
    let constraintIcons = '';
    if (room.constraints) {
      const hasHorizontal = room.constraints.some(c =>
        c.enabled && c.type === 'horizontal' &&
        c.indices.length === 2 &&
        ((c.indices[0] === i && c.indices[1] === (i + 1) % worldVertices.length) ||
         (c.indices[1] === i && c.indices[0] === (i + 1) % worldVertices.length))
      );
      const hasVertical = room.constraints.some(c =>
        c.enabled && c.type === 'vertical' &&
        c.indices.length === 2 &&
        ((c.indices[0] === i && c.indices[1] === (i + 1) % worldVertices.length) ||
         (c.indices[1] === i && c.indices[0] === (i + 1) % worldVertices.length))
      );
      const hasDistance = room.constraints.some(c =>
        c.enabled && c.type === 'distance' &&
        c.indices.length === 2 &&
        ((c.indices[0] === i && c.indices[1] === (i + 1) % worldVertices.length) ||
         (c.indices[1] === i && c.indices[0] === (i + 1) % worldVertices.length))
      );

      if (hasHorizontal) constraintIcons += ' [H]';
      if (hasVertical) constraintIcons += ' [V]';
      if (hasDistance) constraintIcons += ' 🔒';
    }

    const displayText = text + constraintIcons;

    // Calculate wall angle and perpendicular
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const wallAngle = Math.atan2(dy, dx);
    const perpAngle = wallAngle + Math.PI / 2;

    // Determine outward direction
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;
    const outwardX = midX - centroidX;
    const outwardY = midY - centroidY;
    const perpX = -dy;
    const perpY = dx;
    const dotProduct = perpX * outwardX + perpY * outwardY;
    const outwardDirection = dotProduct > 0 ? 1 : -1;

    // Get wall thickness
    const wallThickness = room.walls[i]?.thickness || room.wallThickness || 10;
    const totalOffsetWorld = wallThickness + DIMENSION_LINE_BASE_OFFSET;
    const totalOffset = totalOffsetWorld * viewport.zoom;

    // Calculate offset
    const offsetX = Math.cos(perpAngle) * totalOffset * outwardDirection;
    const offsetY = Math.sin(perpAngle) * totalOffset * outwardDirection;

    // Extension line positions
    const ext1Start = worldToScreen(v1, viewport);
    const ext2Start = worldToScreen(v2, viewport);

    const ext1EndX = ext1Start.x + offsetX + Math.cos(perpAngle) * EXTENSION_LINE_OVERSHOOT * outwardDirection;
    const ext1EndY = ext1Start.y + offsetY + Math.sin(perpAngle) * EXTENSION_LINE_OVERSHOOT * outwardDirection;
    const ext2EndX = ext2Start.x + offsetX + Math.cos(perpAngle) * EXTENSION_LINE_OVERSHOOT * outwardDirection;
    const ext2EndY = ext2Start.y + offsetY + Math.sin(perpAngle) * EXTENSION_LINE_OVERSHOOT * outwardDirection;

    // Dimension line endpoints
    const dim1X = ext1Start.x + offsetX;
    const dim1Y = ext1Start.y + offsetY;
    const dim2X = ext2Start.x + offsetX;
    const dim2Y = ext2Start.y + offsetY;

    // Draw extension lines
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(
      ext1Start.x + Math.cos(perpAngle) * EXTENSION_LINE_OFFSET * outwardDirection,
      ext1Start.y + Math.sin(perpAngle) * EXTENSION_LINE_OFFSET * outwardDirection
    );
    ctx.lineTo(ext1EndX, ext1EndY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      ext2Start.x + Math.cos(perpAngle) * EXTENSION_LINE_OFFSET * outwardDirection,
      ext2Start.y + Math.sin(perpAngle) * EXTENSION_LINE_OFFSET * outwardDirection
    );
    ctx.lineTo(ext2EndX, ext2EndY);
    ctx.stroke();

    // Draw dimension line
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dim1X, dim1Y);
    ctx.lineTo(dim2X, dim2Y);
    ctx.stroke();

    // Draw arrows
    ctx.fillStyle = '#374151';
    const drawArrow = (x: number, y: number, direction: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(wallAngle + direction);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-ARROW_LENGTH, -ARROW_WIDTH);
      ctx.lineTo(-ARROW_LENGTH, ARROW_WIDTH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawArrow(dim1X, dim1Y, 0);
    drawArrow(dim2X, dim2Y, Math.PI);

    // Draw text
    const textCenterX = (dim1X + dim2X) / 2;
    const textCenterY = (dim1Y + dim2Y) / 2;

    // Calculate readable text angle
    let textAngle = wallAngle;
    const degrees = (wallAngle * 180 / Math.PI + 360) % 360;
    if (degrees > 90 && degrees < 270) {
      textAngle = wallAngle + Math.PI;
    }

    ctx.save();
    ctx.translate(textCenterX, textCenterY);
    ctx.rotate(textAngle);

    // Measure text
    ctx.font = 'bold 14px Arial, sans-serif';
    const textMetrics = ctx.measureText(displayText);
    const textWidth = textMetrics.width;
    const textHeight = 14;

    const isFlipped = degrees > 90 && degrees < 270;
    const textOffsetY = isFlipped ? TEXT_PADDING : -TEXT_PADDING;

    // Draw text background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(-textWidth / 2 - 4, textOffsetY - textHeight / 2 - 2, textWidth + 8, textHeight + 4);

    // Draw text
    ctx.fillStyle = constraintIcons ? '#dc2626' : '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, 0, textOffsetY);

    ctx.restore();

    // Register this dimension label for click detection
    if (options.onRegisterLabel) {
      // Calculate actual text bounds in screen coordinates
      const actualTextX = textCenterX - Math.sin(textAngle) * textOffsetY;
      const actualTextY = textCenterY + Math.cos(textAngle) * textOffsetY;

      options.onRegisterLabel({
        roomId: room.id,
        edgeIndex: i,
        position: { x: actualTextX, y: actualTextY },
        bounds: {
          x: actualTextX - textWidth / 2 - 4,
          y: actualTextY - textHeight / 2 - 2,
          width: textWidth + 8,
          height: textHeight + 4
        },
        currentValue: lengthCm,
        wallVertices: [v1, v2]
      });
    }
  }

  ctx.restore();
}

/**
 * Draw room joining snap indicators (only vertex pulsing)
 */
export function drawRoomSnapIndicators(
  ctx: CanvasRenderingContext2D,
  snapResult: any,
  viewport: Viewport
): void {
  if (!snapResult || !snapResult.snapped || !snapResult.debugInfo) return;

  ctx.save();

  const { closestMovingVertex, closestStationaryVertex } = snapResult.debugInfo;

  // Draw pulsing vertex indicators (always show when vertices will snap)
  if (closestMovingVertex && closestStationaryVertex) {
    const statVertex = worldToScreen(closestStationaryVertex, viewport);
    const movVertex = worldToScreen(closestMovingVertex, viewport);

    // Pulsing animation
    const pulsePhase = (Date.now() % 1000) / 1000;
    const pulseSize = 8 + Math.sin(pulsePhase * Math.PI * 2) * 4;
    const pulseAlpha = 0.6 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;

    // Stationary vertex
    ctx.fillStyle = `rgba(16, 185, 129, ${pulseAlpha})`;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#10b981';
    ctx.beginPath();
    ctx.arc(statVertex.x, statVertex.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Moving vertex
    ctx.fillStyle = `rgba(16, 185, 129, ${pulseAlpha})`;
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(movVertex.x, movVertex.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * Draw door centers as visual debug markers
 * Shows where door centers are positioned for alignment debugging
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

  // Helper to calculate door center in world coordinates
  const getDoorCenter = (room: Room, wallIndex: number, aperture: any, offset: Vertex = { x: 0, y: 0 }): Vertex | null => {
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

    // Apply offset
    return {
      id: worldCenter.id,
      x: worldCenter.x + offset.x,
      y: worldCenter.y + offset.y
    };
  };

  // Find room objects
  const movingRoom = movingRoomId ? rooms.find(r => r.id === movingRoomId) : undefined;
  const stationaryRoom = stationaryRoomId ? rooms.find(r => r.id === stationaryRoomId) : undefined;

  // Helper to find closest wall index using midpoint comparison (same as roomJoining.ts)
  const findClosestWallIndex = (
    currentRoom: Room,
    otherRoom: Room,
    currentRoomOffset: Vertex = { x: 0, y: 0 }
  ): number => {
    if (!currentRoom.walls || !otherRoom.vertices) return -1;

    // Step 1: Find closest segment on OTHER room to current room
    let minSegmentDist = Infinity;
    let closestSegmentMid: Vertex | null = null;

    for (let i = 0; i < otherRoom.vertices.length; i++) {
      const v1 = otherRoom.vertices[i];
      const v2 = otherRoom.vertices[(i + 1) % otherRoom.vertices.length];

      // Transform to world coordinates
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

      // Segment midpoint
      const segMid = {
        x: (v1World.x + v2World.x) / 2,
        y: (v1World.y + v2World.y) / 2
      };

      // Calculate distance from segment to current room (approximate with centroid)
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

    // Step 2: Find wall in CURRENT room with midpoint closest to the segment midpoint
    let closestWallIdx = -1;
    let minWallDist = Infinity;

    currentRoom.walls.forEach((wall, wallIndex) => {
      const v1 = currentRoom.vertices[wall.vertexIndex];
      const v2 = currentRoom.vertices[(wall.vertexIndex + 1) % currentRoom.vertices.length];

      if (!v1 || !v2) return;

      // Transform to world coordinates
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

      // Wall midpoint
      const wallMid = {
        x: (v1World.x + v2World.x) / 2,
        y: (v1World.y + v2World.y) / 2
      };

      // Distance between midpoints
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

  // Calculate closest wall indices for each room
  const movingRoomClosestWallIndex = movingRoom && stationaryRoom
    ? findClosestWallIndex(movingRoom, stationaryRoom, movingRoomOffset || { x: 0, y: 0 })
    : -1;

  const stationaryRoomClosestWallIndex = stationaryRoom && movingRoom
    ? findClosestWallIndex(stationaryRoom, movingRoom)
    : -1;

  // Track door centers for drawing connecting line
  let movingDoorCenter: Vertex | null = null;
  let stationaryDoorCenter: Vertex | null = null;

  // Draw door centers for each room
  rooms.forEach(room => {
    if (!room.walls || room.walls.length === 0) return;

    const isMovingRoom = movingRoomId && room.id === movingRoomId;
    const isStationaryRoom = stationaryRoomId && room.id === stationaryRoomId;

    // Only draw for moving or stationary rooms
    if (!isMovingRoom && !isStationaryRoom) return;

    // Determine color and offset
    // Use bright green when door snap is active, otherwise magenta/cyan
    let color: string;
    if (isDoorSnap) {
      color = '#10b981'; // Bright green for active door snap
    } else {
      color = isMovingRoom ? '#d946ef' : '#0dcaf0'; // Magenta for moving, cyan for stationary
    }
    const offset = isMovingRoom && movingRoomOffset ? movingRoomOffset : { x: 0, y: 0 };

    // Get the closest wall index for this room
    const closestWallIndex = isMovingRoom ? movingRoomClosestWallIndex : stationaryRoomClosestWallIndex;

    // Only show doors on the closest wall (orange wall)
    if (closestWallIndex === -1) return;

    // Iterate through walls, but only draw doors on the closest wall
    room.walls.forEach((wall, wallIndex) => {
      // Skip walls that are not the closest wall
      if (wallIndex !== closestWallIndex) return;

      if (!wall.apertures || wall.apertures.length === 0) return;

      // Draw each door's center
      wall.apertures.forEach(aperture => {
        if (aperture.type !== 'door') return; // Only doors, not windows

        const doorCenter = getDoorCenter(room, wallIndex, aperture, offset);
        if (!doorCenter) return;

        // Store door centers for drawing connection line
        if (isMovingRoom) {
          movingDoorCenter = doorCenter;
        } else if (isStationaryRoom) {
          stationaryDoorCenter = doorCenter;
        }

        const screenCenter = worldToScreen(doorCenter, viewport);

        // Draw door center marker
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(screenCenter.x, screenCenter.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw small cross in center for precision
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

  // Draw connecting line between door centers when door snap is active
  if (isDoorSnap && movingDoorCenter && stationaryDoorCenter) {
    const screenMoving = worldToScreen(movingDoorCenter, viewport);
    const screenStationary = worldToScreen(stationaryDoorCenter, viewport);

    ctx.strokeStyle = '#10b981'; // Bright green
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]); // Dashed line

    ctx.beginPath();
    ctx.moveTo(screenMoving.x, screenMoving.y);
    ctx.lineTo(screenStationary.x, screenStationary.y);
    ctx.stroke();

    ctx.setLineDash([]); // Reset to solid lines
  }

  ctx.restore();
}

/**
 * Clear canvas
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw constraint indicators on a room
 * NEW - Additive function for constraint visualization
 */
export function drawConstraintIndicators(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport
): void {
  if (!room.constraints || room.constraints.length === 0) return;

  ctx.save();

  // Transform vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  room.constraints.forEach((constraint) => {
    if (!constraint.enabled) return;

    const { type, indices } = constraint;

    // Draw based on constraint type
    switch (type) {
      case 'distance': {
        // Distance constraint - draw line between vertices with measurement
        if (indices.length !== 2) return;
        const v1 = worldVertices[indices[0]];
        const v2 = worldVertices[indices[1]];
        const sv1 = worldToScreen(v1, viewport);
        const sv2 = worldToScreen(v2, viewport);

        // Draw constraint line
        ctx.strokeStyle = '#10b981'; // Green
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sv1.x, sv1.y);
        ctx.lineTo(sv2.x, sv2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw measurement badge
        const midX = (sv1.x + sv2.x) / 2;
        const midY = (sv1.y + sv2.y) / 2;
        const distance = constraint.value?.toFixed(1) || '';

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px sans-serif';
        const text = `${distance}cm`;
        const metrics = ctx.measureText(text);
        const padding = 3;

        ctx.fillRect(
          midX - metrics.width / 2 - padding,
          midY - 8,
          metrics.width + padding * 2,
          16
        );

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, midX, midY);
        break;
      }

      case 'horizontal': {
        // Horizontal constraint - draw horizontal indicator
        if (indices.length !== 2) return;
        const v1 = worldVertices[indices[0]];
        const v2 = worldVertices[indices[1]];
        const sv1 = worldToScreen(v1, viewport);
        const sv2 = worldToScreen(v2, viewport);

        // Draw horizontal line
        ctx.strokeStyle = '#3b82f6'; // Blue
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sv1.x, sv1.y);
        ctx.lineTo(sv2.x, sv2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw H badge
        const midX = (sv1.x + sv2.x) / 2;
        const midY = (sv1.y + sv2.y) / 2;

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(midX, midY, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', midX, midY);
        break;
      }

      case 'vertical': {
        // Vertical constraint - draw vertical indicator
        if (indices.length !== 2) return;
        const v1 = worldVertices[indices[0]];
        const v2 = worldVertices[indices[1]];
        const sv1 = worldToScreen(v1, viewport);
        const sv2 = worldToScreen(v2, viewport);

        // Draw vertical line
        ctx.strokeStyle = '#6366f1'; // Indigo
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sv1.x, sv1.y);
        ctx.lineTo(sv2.x, sv2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw V badge
        const midX = (sv1.x + sv2.x) / 2;
        const midY = (sv1.y + sv2.y) / 2;

        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(midX, midY, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', midX, midY);
        break;
      }

      case 'parallel': {
        // Parallel constraint - draw parallel indicator on edges
        if (indices.length !== 2) return;
        const edge1Idx = indices[0];
        const edge2Idx = indices[1];

        // Get edge midpoints
        const e1v1 = worldVertices[edge1Idx];
        const e1v2 = worldVertices[(edge1Idx + 1) % worldVertices.length];
        const e2v1 = worldVertices[edge2Idx];
        const e2v2 = worldVertices[(edge2Idx + 1) % worldVertices.length];

        const e1Mid = { x: (e1v1.x + e1v2.x) / 2, y: (e1v1.y + e1v2.y) / 2 };
        const e2Mid = { x: (e2v1.x + e2v2.x) / 2, y: (e2v1.y + e2v2.y) / 2 };

        const se1Mid = worldToScreen(e1Mid, viewport);
        const se2Mid = worldToScreen(e2Mid, viewport);

        // Draw parallel symbol on both edges
        ctx.fillStyle = '#a855f7'; // Purple
        ctx.beginPath();
        ctx.arc(se1Mid.x, se1Mid.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(se2Mid.x, se2Mid.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        // Draw parallel lines symbol
        ctx.beginPath();
        ctx.moveTo(se1Mid.x - 4, se1Mid.y - 4);
        ctx.lineTo(se1Mid.x + 4, se1Mid.y + 4);
        ctx.moveTo(se1Mid.x - 4, se1Mid.y + 1);
        ctx.lineTo(se1Mid.x + 4, se1Mid.y + 9);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(se2Mid.x - 4, se2Mid.y - 4);
        ctx.lineTo(se2Mid.x + 4, se2Mid.y + 4);
        ctx.moveTo(se2Mid.x - 4, se2Mid.y + 1);
        ctx.lineTo(se2Mid.x + 4, se2Mid.y + 9);
        ctx.stroke();
        break;
      }

      case 'perpendicular': {
        // Perpendicular constraint - draw perpendicular indicator
        if (indices.length !== 2) return;
        const edge1Idx = indices[0];
        const edge2Idx = indices[1];

        // Get edge midpoints
        const e1v1 = worldVertices[edge1Idx];
        const e1v2 = worldVertices[(edge1Idx + 1) % worldVertices.length];
        const e2v1 = worldVertices[edge2Idx];
        const e2v2 = worldVertices[(edge2Idx + 1) % worldVertices.length];

        const e1Mid = { x: (e1v1.x + e1v2.x) / 2, y: (e1v1.y + e1v2.y) / 2 };
        const e2Mid = { x: (e2v1.x + e2v2.x) / 2, y: (e2v1.y + e2v2.y) / 2 };

        const se1Mid = worldToScreen(e1Mid, viewport);
        const se2Mid = worldToScreen(e2Mid, viewport);

        // Draw perpendicular symbol (⊥)
        ctx.fillStyle = '#f59e0b'; // Amber
        ctx.beginPath();
        ctx.arc(se1Mid.x, se1Mid.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(se2Mid.x, se2Mid.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⊥', se1Mid.x, se1Mid.y);
        ctx.fillText('⊥', se2Mid.x, se2Mid.y);
        break;
      }

      case 'equal': {
        // Equal length constraint
        if (indices.length !== 2) return;
        const edge1Idx = indices[0];
        const edge2Idx = indices[1];

        // Get edge midpoints
        const e1v1 = worldVertices[edge1Idx];
        const e1v2 = worldVertices[(edge1Idx + 1) % worldVertices.length];
        const e2v1 = worldVertices[edge2Idx];
        const e2v2 = worldVertices[(edge2Idx + 1) % worldVertices.length];

        const e1Mid = { x: (e1v1.x + e1v2.x) / 2, y: (e1v1.y + e1v2.y) / 2 };
        const e2Mid = { x: (e2v1.x + e2v2.x) / 2, y: (e2v1.y + e2v2.y) / 2 };

        const se1Mid = worldToScreen(e1Mid, viewport);
        const se2Mid = worldToScreen(e2Mid, viewport);

        // Draw equals symbol
        ctx.fillStyle = '#ec4899'; // Pink
        ctx.beginPath();
        ctx.arc(se1Mid.x, se1Mid.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(se2Mid.x, se2Mid.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('=', se1Mid.x, se1Mid.y);
        ctx.fillText('=', se2Mid.x, se2Mid.y);
        break;
      }
    }
  });

  ctx.restore();
}
