/**
 * Handle rendering functions
 * Functions for drawing vertex handles, edge handles, and rotation handles
 */

import { Vertex, Room, Viewport } from '../../types';
import { worldToScreen } from '../coordinates';
import { getRotationHandlePosition, calculateRoomCenter } from '../rotation';

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
