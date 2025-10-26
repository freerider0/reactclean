/**
 * Rendering utility functions
 * Pure functions for drawing on canvas
 */

import { Vertex, Room, Viewport, GridConfig, GuideLine } from '../types';
import { worldToScreen, localToWorld } from './coordinates';
import { getWallQuad } from './walls';
import { getRotationHandlePosition, calculateRoomCenter } from './rotation';
import { calculateEdgeLength, calculateMidpoint, formatDistance, calculateLabelOffset } from './dimensions';

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
  } = {}
): void {
  if (room.walls.length === 0) return;

  ctx.save();

  // Transform vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Draw each wall with proper corner intersections
  room.walls.forEach(wall => {
    // Get wall quad vertices with mitered corners
    const [inner1, inner2, outer2, outer1] = getWallQuad(wall, worldVertices);

    // Transform to screen coordinates
    const screenInner1 = worldToScreen(inner1, viewport);
    const screenInner2 = worldToScreen(inner2, viewport);
    const screenOuter2 = worldToScreen(outer2, viewport);
    const screenOuter1 = worldToScreen(outer1, viewport);

    // Draw wall as filled quad
    ctx.fillStyle = options.wallColor || '#94a3b8'; // Slate gray
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
 * Draw dimension labels on room edges
 */
export function drawDimensionLabels(
  ctx: CanvasRenderingContext2D,
  room: Room,
  viewport: Viewport,
  options: {
    selected?: boolean;
    offsetDistance?: number;
  } = {}
): void {
  const offsetDistance = options.offsetDistance || 20;

  ctx.save();

  // Transform vertices to world coordinates
  const worldVertices = room.vertices.map(v =>
    localToWorld(v, room.position, room.rotation, room.scale)
  );

  // Draw label for each edge
  for (let i = 0; i < worldVertices.length; i++) {
    const v1 = worldVertices[i];
    const v2 = worldVertices[(i + 1) % worldVertices.length];

    // Calculate edge length
    const length = calculateEdgeLength(v1, v2);
    const labelText = formatDistance(length);

    // Calculate midpoint
    const midpoint = calculateMidpoint(v1, v2);

    // Calculate offset direction (perpendicular to edge)
    const offset = calculateLabelOffset(v1, v2);

    // Apply offset to position label outside the room
    const labelPosition = {
      x: midpoint.x + offset.x * offsetDistance,
      y: midpoint.y + offset.y * offsetDistance
    };

    // Transform to screen coordinates
    const screenPos = worldToScreen(labelPosition, viewport);

    // Draw background rectangle
    ctx.font = '12px sans-serif';
    const textMetrics = ctx.measureText(labelText);
    const padding = 4;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = 16 + padding * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(
      screenPos.x - bgWidth / 2,
      screenPos.y - bgHeight / 2,
      bgWidth,
      bgHeight
    );

    // Draw border
    ctx.strokeStyle = options.selected ? '#3b82f6' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      screenPos.x - bgWidth / 2,
      screenPos.y - bgHeight / 2,
      bgWidth,
      bgHeight
    );

    // Draw text
    ctx.fillStyle = options.selected ? '#3b82f6' : '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, screenPos.x, screenPos.y);
  }

  ctx.restore();
}

/**
 * Draw room joining snap indicators
 */
export function drawRoomSnapIndicators(
  ctx: CanvasRenderingContext2D,
  snapResult: any,
  viewport: Viewport
): void {
  if (!snapResult || !snapResult.snapped || !snapResult.debugInfo) return;

  ctx.save();

  const { closestMovingSegment, closestStationarySegment, closestMovingVertex, closestStationaryVertex } = snapResult.debugInfo;

  // Draw closest edge segments (wall centerlines)
  if (closestMovingSegment && closestStationarySegment) {
    // Stationary segment (magenta/pink)
    const statStart = worldToScreen(closestStationarySegment.p1, viewport);
    const statEnd = worldToScreen(closestStationarySegment.p2, viewport);

    ctx.strokeStyle = '#ec4899'; // Pink for stationary
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(statStart.x, statStart.y);
    ctx.lineTo(statEnd.x, statEnd.y);
    ctx.stroke();

    // Moving segment (cyan/blue)
    const movStart = worldToScreen(closestMovingSegment.p1, viewport);
    const movEnd = worldToScreen(closestMovingSegment.p2, viewport);

    ctx.strokeStyle = '#06b6d4'; // Cyan for moving
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(movStart.x, movStart.y);
    ctx.lineTo(movEnd.x, movEnd.y);
    ctx.stroke();
  }

  // Draw closest vertices (if within threshold)
  if (closestMovingVertex && closestStationaryVertex) {
    // Stationary vertex
    const statVertex = worldToScreen(closestStationaryVertex, viewport);
    ctx.fillStyle = 'rgba(236, 72, 153, 0.5)'; // Semi-transparent pink
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(statVertex.x, statVertex.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Moving vertex
    const movVertex = worldToScreen(closestMovingVertex, viewport);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Semi-transparent cyan
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(movVertex.x, movVertex.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw connection line between vertices
    ctx.strokeStyle = '#10b981'; // Green connecting line
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(statVertex.x, statVertex.y);
    ctx.lineTo(movVertex.x, movVertex.y);
    ctx.stroke();
  }

  // Draw snap mode label
  if (snapResult.mode) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const modeText = snapResult.mode.toUpperCase();
    const textX = 10;
    const textY = 30;
    ctx.strokeText(modeText, textX, textY);
    ctx.fillText(modeText, textX, textY);
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
