/**
 * Dimension rendering functions
 * Functions for drawing dimension labels and vertex numbers
 */

import { Vertex, Room, Viewport } from '../../types';
import { worldToScreen, localToWorld } from '../coordinates';

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
