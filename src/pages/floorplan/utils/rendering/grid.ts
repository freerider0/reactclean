/**
 * Grid rendering functions
 * Functions for drawing grid and guidelines
 */

import { Viewport, GridConfig, GuideLine } from '../../types';
import { worldToScreen } from '../coordinates';

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
