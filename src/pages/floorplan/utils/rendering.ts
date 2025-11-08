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
  viewport: Viewport
): void {
  if (!room.envelopeVertices || room.envelopeVertices.length < 3) return;

  ctx.save();

  // Transform envelope vertices to world coordinates
  const worldEnvelope = room.envelopeVertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Transform to screen coordinates
  const screenEnvelope = worldEnvelope.map(v => worldToScreen(v, viewport));

  // Draw envelope with gray fill and black outline
  ctx.fillStyle = '#94a3b8'; // Same gray as walls
  ctx.strokeStyle = '#000000'; // Black
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(screenEnvelope[0].x, screenEnvelope[0].y);
  for (let i = 1; i < screenEnvelope.length; i++) {
    ctx.lineTo(screenEnvelope[i].x, screenEnvelope[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

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

  // Draw stroke
  ctx.strokeStyle = options.strokeColor || (options.selected ? '#3b82f6' : '#64748b');
  ctx.lineWidth = options.lineWidth || (options.selected ? 3 : 2);
  ctx.stroke();

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
  } = {}
): void {
  if (room.walls.length === 0) return;

  ctx.save();

  // Transform vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
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
      const v1World = localToWorld(room.vertices[wall.vertexIndex], room.position, room.rotation, room.scale);
      const v2World = localToWorld(room.vertices[(wall.vertexIndex + 1) % room.vertices.length], room.position, room.rotation, room.scale);

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

    // Draw apertures (doors and windows) if any
    if (wall.apertures && wall.apertures.length > 0) {
      // Calculate wall direction along inner edge
      const wallDx = inner2.x - inner1.x;
      const wallDy = inner2.y - inner1.y;
      const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

      if (wallLength > 0) {
        // Unit vector along wall
        const unitX = wallDx / wallLength;
        const unitY = wallDy / wallLength;

        // Perpendicular vector pointing outward
        const perpX = unitY;
        const perpY = -unitX;

        ctx.save();
        ctx.shadowBlur = 0; // No shadow for apertures

        for (const aperture of wall.apertures) {
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

          // Aperture corners on inner edge
          const innerApertureStart = {
            x: inner1.x + unitX * startDist,
            y: inner1.y + unitY * startDist
          };
          const innerApertureEnd = {
            x: inner1.x + unitX * endDist,
            y: inner1.y + unitY * endDist
          };

          // Aperture corners on outer edge
          const outerApertureStart = {
            x: innerApertureStart.x + perpX * wall.thickness,
            y: innerApertureStart.y + perpY * wall.thickness
          };
          const outerApertureEnd = {
            x: innerApertureEnd.x + perpX * wall.thickness,
            y: innerApertureEnd.y + perpY * wall.thickness
          };

          // Transform to screen coordinates
          const screenInnerApertureStart = worldToScreen(innerApertureStart, viewport);
          const screenInnerApertureEnd = worldToScreen(innerApertureEnd, viewport);
          const screenOuterApertureStart = worldToScreen(outerApertureStart, viewport);
          const screenOuterApertureEnd = worldToScreen(outerApertureEnd, viewport);

          // Draw aperture as white rectangle (creates opening)
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = 1;

          ctx.beginPath();
          ctx.moveTo(screenInnerApertureStart.x, screenInnerApertureStart.y);
          ctx.lineTo(screenInnerApertureEnd.x, screenInnerApertureEnd.y);
          ctx.lineTo(screenOuterApertureEnd.x, screenOuterApertureEnd.y);
          ctx.lineTo(screenOuterApertureStart.x, screenOuterApertureStart.y);
          ctx.closePath();
          ctx.fill();

          // Draw door arc if it's a door
          if (aperture.type === 'door') {
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1 / viewport.zoom;
            ctx.globalAlpha = 0.5;

            const arcRadius = apertureWidthPx * viewport.zoom;
            const baseAngle = Math.atan2(perpY, perpX);

            ctx.beginPath();
            ctx.arc(
              screenInnerApertureStart.x,
              screenInnerApertureStart.y,
              arcRadius,
              baseAngle - Math.PI / 2,
              baseAngle,
              false
            );
            ctx.stroke();

            // Draw door panel line
            ctx.beginPath();
            ctx.moveTo(screenInnerApertureStart.x, screenInnerApertureStart.y);
            ctx.lineTo(
              screenInnerApertureStart.x + Math.cos(baseAngle - Math.PI / 4) * arcRadius,
              screenInnerApertureStart.y + Math.sin(baseAngle - Math.PI / 4) * arcRadius
            );
            ctx.stroke();
          }
        }

        ctx.restore();
      }
    }
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
  } = {}
): void {
  const handleSize = options.handleSize || 8;
  const touchTargetSize = options.touchTargetSize || 20;

  ctx.save();

  vertices.forEach((vertex, index) => {
    const screenVertex = worldToScreen(vertex, viewport);
    const isSelected = options.selectedIndex === index;
    const isHover = options.hoverIndex === index;

    // Draw larger transparent touch target circle
    // Make it more visible on hover to show it's interactive
    if (isHover || isSelected) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, touchTargetSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw visible handle on top
    ctx.fillStyle = isSelected ? '#3b82f6' : isHover ? '#60a5fa' : '#ffffff';
    ctx.strokeStyle = '#1e40af';
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

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(lastVertex.x, lastVertex.y);
    ctx.lineTo(snapScreen.x, snapScreen.y);
    ctx.stroke();
  }

  // Draw vertices
  screenVertices.forEach((v, index) => {
    const isFirst = index === 0;
    ctx.fillStyle = isFirst ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.arc(v.x, v.y, isFirst ? 10 : 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw snap position indicator
  if (snapPosition) {
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
