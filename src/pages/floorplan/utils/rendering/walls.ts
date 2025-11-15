/**
 * Wall rendering functions
 * Functions for drawing walls with segments and external walls
 */

import { Vertex, Room, Viewport, WallType } from '../../types';
import { worldToScreen, localToWorld } from '../coordinates';
import { getWallQuad } from '../walls';

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
  const pointsToDraw: Vertex[] = [];
  const DEDUP_TOLERANCE = 1; // 1cm - same as wallSegments.ts

  // Collect all segmentVertices from all rooms with proper deduplication
  allRooms.forEach(room => {
    if (!room.segmentVertices || room.segmentVertices.length === 0) return;

    room.segmentVertices.forEach(vertex => {
      const worldVertex = localToWorld(vertex, room.position, room.rotation, room.scale);

      // Check if this vertex is too close to any already added vertex
      const isDuplicate = pointsToDraw.some(existing => {
        const dist = Math.sqrt(
          Math.pow(worldVertex.x - existing.x, 2) +
          Math.pow(worldVertex.y - existing.y, 2)
        );
        return dist < DEDUP_TOLERANCE;
      });

      if (!isDuplicate) {
        pointsToDraw.push(worldVertex);
      }
    });
  });

  // 4. Draw all unique points
  pointsToDraw.forEach((worldPos, index) => {
    const screenVertex = worldToScreen(worldPos, viewport);

    // Draw orange circle
    ctx.fillStyle = vertexColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(screenVertex.x, screenVertex.y, markerSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw index number
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index.toString(), screenVertex.x, screenVertex.y - 12);
  });

  ctx.restore();
}
