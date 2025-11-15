/**
 * Room rendering functions
 * Functions for drawing rooms and envelopes
 */

import { Vertex, Room, Viewport } from '../../types';
import { worldToScreen, localToWorld } from '../coordinates';
import { drawWalls } from './walls';

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
