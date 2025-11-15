/**
 * Preview rendering functions
 * Functions for drawing previews and indicators during interaction
 */

import { Vertex, Room, Viewport } from '../../types';
import { worldToScreen, localToWorld } from '../coordinates';

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
