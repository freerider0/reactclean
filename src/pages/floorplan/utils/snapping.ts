/**
 * Snapping utility functions
 * Based on documented workflows and algorithms
 */

import { Vertex, SnapResult, SnapType, GuideLine, Room } from '../types';
import { distance } from './geometry';

// Snap thresholds (in world units - cm)
const GRID_SNAP_THRESHOLD = 50;
const ORTHOGONAL_SNAP_THRESHOLD_PX = 30; // Reduced for easier activation
const VERTEX_SNAP_THRESHOLD = 15;
const EDGE_SNAP_THRESHOLD = 15;
const ROOM_ASSEMBLY_SNAP_THRESHOLD = 20;

/**
 * Snap point to grid
 * Algorithm: round(x / gridSize) * gridSize
 */
export function snapToGrid(
  point: Vertex,
  gridSize: number
): SnapResult {
  const snappedX = Math.round(point.x / gridSize) * gridSize;
  const snappedY = Math.round(point.y / gridSize) * gridSize;

  return {
    snapped: true,
    position: { x: snappedX, y: snappedY },
    snapType: SnapType.Grid
  };
}

/**
 * Snap to orthogonal guides (horizontal, vertical, or 90-degree from last vertex)
 * Based on pixel-space threshold for better UX
 */
export function snapOrthogonal(
  point: Vertex,
  lastVertex: Vertex,
  allVertices: Vertex[],
  zoom: number
): SnapResult {
  const threshold = ORTHOGONAL_SNAP_THRESHOLD_PX / zoom; // Convert to world units

  // Check perpendicular to last edge (if we have at least 2 vertices)
  if (allVertices.length >= 2) {
    const prevVertex = allVertices[allVertices.length - 2];
    const lastEdgeVec = {
      x: lastVertex.x - prevVertex.x,
      y: lastVertex.y - prevVertex.y
    };
    const lastEdgeLength = Math.sqrt(lastEdgeVec.x * lastEdgeVec.x + lastEdgeVec.y * lastEdgeVec.y);

    if (lastEdgeLength > 0.001) {
      // Normalize the last edge vector
      const lastEdgeNorm = {
        x: lastEdgeVec.x / lastEdgeLength,
        y: lastEdgeVec.y / lastEdgeLength
      };

      // Perpendicular vector (90 degrees rotated)
      const perpVec = {
        x: -lastEdgeNorm.y,
        y: lastEdgeNorm.x
      };

      // Vector from last vertex to current point
      const toPointVec = {
        x: point.x - lastVertex.x,
        y: point.y - lastVertex.y
      };

      // Project onto the perpendicular direction
      const projLength = toPointVec.x * perpVec.x + toPointVec.y * perpVec.y;
      const projPoint = {
        x: lastVertex.x + perpVec.x * projLength,
        y: lastVertex.y + perpVec.y * projLength
      };

      // Check distance from point to projected point
      const distToPerpLine = Math.sqrt(
        (point.x - projPoint.x) * (point.x - projPoint.x) +
        (point.y - projPoint.y) * (point.y - projPoint.y)
      );

      if (distToPerpLine < threshold) {
        // Snap to perpendicular line
        return {
          snapped: true,
          position: projPoint,
          snapType: SnapType.Orthogonal,
          guideLine: {
            start: {
              x: lastVertex.x + perpVec.x * 1000,
              y: lastVertex.y + perpVec.y * 1000
            },
            end: {
              x: lastVertex.x - perpVec.x * 1000,
              y: lastVertex.y - perpVec.y * 1000
            },
            type: 'perpendicular'
          }
        };
      }
    }
  }

  // Check vertical alignment (X axis)
  const deltaX = Math.abs(point.x - lastVertex.x);
  if (deltaX < threshold) {
    return {
      snapped: true,
      position: { x: lastVertex.x, y: point.y },
      snapType: SnapType.Orthogonal,
      guideLine: {
        start: { x: lastVertex.x, y: lastVertex.y - 1000 },
        end: { x: lastVertex.x, y: lastVertex.y + 1000 },
        type: 'vertical'
      }
    };
  }

  // Check horizontal alignment (Y axis)
  const deltaY = Math.abs(point.y - lastVertex.y);
  if (deltaY < threshold) {
    return {
      snapped: true,
      position: { x: point.x, y: lastVertex.y },
      snapType: SnapType.Orthogonal,
      guideLine: {
        start: { x: lastVertex.x - 1000, y: lastVertex.y },
        end: { x: lastVertex.x + 1000, y: lastVertex.y },
        type: 'horizontal'
      }
    };
  }

  // Check alignment with earlier vertices
  for (let i = 0; i < allVertices.length - 1; i++) {
    const vertex = allVertices[i];

    // Vertical alignment with earlier vertex
    const deltaXEarlier = Math.abs(point.x - vertex.x);
    if (deltaXEarlier < threshold) {
      return {
        snapped: true,
        position: { x: vertex.x, y: point.y },
        snapType: SnapType.Orthogonal,
        guideLine: {
          start: { x: vertex.x, y: vertex.y - 1000 },
          end: { x: vertex.x, y: vertex.y + 1000 },
          type: 'vertical'
        }
      };
    }

    // Horizontal alignment with earlier vertex
    const deltaYEarlier = Math.abs(point.y - vertex.y);
    if (deltaYEarlier < threshold) {
      return {
        snapped: true,
        position: { x: point.x, y: vertex.y },
        snapType: SnapType.Orthogonal,
        guideLine: {
          start: { x: vertex.x - 1000, y: vertex.y },
          end: { x: vertex.x + 1000, y: vertex.y },
          type: 'horizontal'
        }
      };
    }
  }

  return {
    snapped: false,
    position: null
  };
}

/**
 * Snap to nearest vertex in rooms
 */
export function snapToVertex(
  point: Vertex,
  rooms: Room[],
  excludeRoomId?: string
): SnapResult {
  let closestVertex: Vertex | null = null;
  let minDistance = VERTEX_SNAP_THRESHOLD;

  for (const room of rooms) {
    if (room.id === excludeRoomId) continue;

    // Transform vertices to world coordinates
    for (const localVertex of room.vertices) {
      const worldVertex = localToWorldSimple(localVertex, room);
      const dist = distance(point, worldVertex);

      if (dist < minDistance) {
        minDistance = dist;
        closestVertex = worldVertex;
      }
    }
  }

  if (closestVertex) {
    return {
      snapped: true,
      position: closestVertex,
      snapType: SnapType.Vertex
    };
  }

  return {
    snapped: false,
    position: null
  };
}

/**
 * Snap to nearest edge in rooms
 */
export function snapToEdge(
  point: Vertex,
  rooms: Room[],
  excludeRoomId?: string
): SnapResult {
  let closestPoint: Vertex | null = null;
  let minDistance = EDGE_SNAP_THRESHOLD;

  for (const room of rooms) {
    if (room.id === excludeRoomId) continue;

    // Transform vertices to world coordinates
    const worldVertices = room.vertices.map(v => localToWorldSimple(v, room));

    for (let i = 0; i < worldVertices.length; i++) {
      const v1 = worldVertices[i];
      const v2 = worldVertices[(i + 1) % worldVertices.length];

      const { distance: dist, closestPoint: closest } = distanceToSegmentSimple(point, v1, v2);

      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = closest;
      }
    }
  }

  if (closestPoint) {
    return {
      snapped: true,
      position: closestPoint,
      snapType: SnapType.Edge
    };
  }

  return {
    snapped: false,
    position: null
  };
}

/**
 * Combined snap with priority: orthogonal > grid
 */
export function snapWithPriority(
  point: Vertex,
  lastVertex: Vertex | null,
  allVertices: Vertex[],
  gridSize: number,
  zoom: number,
  orthogonalEnabled: boolean,
  gridEnabled: boolean
): SnapResult {
  // Priority 1: Orthogonal snap
  if (orthogonalEnabled && lastVertex) {
    const orthogonalSnap = snapOrthogonal(point, lastVertex, allVertices, zoom);
    if (orthogonalSnap.snapped) {
      return orthogonalSnap;
    }
  }

  // Priority 2: Grid snap
  if (gridEnabled) {
    return snapToGrid(point, gridSize);
  }

  return {
    snapped: false,
    position: null
  };
}

/**
 * Room assembly snap result
 */
export interface RoomSnapResult {
  snapped: boolean;
  offset?: Vertex;
  guideLines?: GuideLine[];
}

/**
 * Snap room to other rooms during assembly mode
 * Checks vertex-to-vertex and vertex-to-edge alignment
 */
export function snapRoomToRooms(
  draggedRoom: Room,
  proposedPosition: Vertex,
  allRooms: Room[]
): RoomSnapResult {
  const threshold = ROOM_ASSEMBLY_SNAP_THRESHOLD;

  // Calculate vertices of dragged room at proposed position
  const draggedWorldVertices = draggedRoom.vertices.map(v =>
    localToWorldSimple(v, { ...draggedRoom, position: proposedPosition })
  );

  let bestSnap: RoomSnapResult | null = null;
  let minDistance = threshold;

  // Check against all other rooms
  for (const otherRoom of allRooms) {
    if (otherRoom.id === draggedRoom.id) continue;

    const otherWorldVertices = otherRoom.vertices.map(v =>
      localToWorldSimple(v, otherRoom)
    );

    // Check vertex-to-vertex snapping
    for (let i = 0; i < draggedWorldVertices.length; i++) {
      const draggedVertex = draggedWorldVertices[i];

      for (const otherVertex of otherWorldVertices) {
        const dx = otherVertex.x - draggedVertex.x;
        const dy = otherVertex.y - draggedVertex.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
          minDistance = dist;
          bestSnap = {
            snapped: true,
            offset: { x: dx, y: dy },
            guideLines: [
              {
                start: { x: otherVertex.x - 20, y: otherVertex.y },
                end: { x: otherVertex.x + 20, y: otherVertex.y },
                type: 'horizontal'
              },
              {
                start: { x: otherVertex.x, y: otherVertex.y - 20 },
                end: { x: otherVertex.x, y: otherVertex.y + 20 },
                type: 'vertical'
              }
            ]
          };
        }
      }
    }

    // Check vertex-to-edge snapping (horizontal/vertical alignment)
    for (let i = 0; i < draggedWorldVertices.length; i++) {
      const draggedVertex = draggedWorldVertices[i];

      for (let j = 0; j < otherWorldVertices.length; j++) {
        const v1 = otherWorldVertices[j];
        const v2 = otherWorldVertices[(j + 1) % otherWorldVertices.length];

        // Check if edge is horizontal or vertical
        const edgeDx = Math.abs(v2.x - v1.x);
        const edgeDy = Math.abs(v2.y - v1.y);
        const isHorizontal = edgeDy < 1 && edgeDx > 1;
        const isVertical = edgeDx < 1 && edgeDy > 1;

        // Horizontal edge - snap Y coordinate
        if (isHorizontal) {
          const dy = v1.y - draggedVertex.y;
          const dist = Math.abs(dy);

          // Check if vertex is roughly aligned with edge in X direction
          const minX = Math.min(v1.x, v2.x);
          const maxX = Math.max(v1.x, v2.x);
          const isAlignedX = draggedVertex.x >= minX - threshold && draggedVertex.x <= maxX + threshold;

          if (dist < minDistance && isAlignedX) {
            minDistance = dist;
            bestSnap = {
              snapped: true,
              offset: { x: 0, y: dy },
              guideLines: [
                {
                  start: { x: minX - 50, y: v1.y },
                  end: { x: maxX + 50, y: v1.y },
                  type: 'horizontal'
                }
              ]
            };
          }
        }

        // Vertical edge - snap X coordinate
        if (isVertical) {
          const dx = v1.x - draggedVertex.x;
          const dist = Math.abs(dx);

          // Check if vertex is roughly aligned with edge in Y direction
          const minY = Math.min(v1.y, v2.y);
          const maxY = Math.max(v1.y, v2.y);
          const isAlignedY = draggedVertex.y >= minY - threshold && draggedVertex.y <= maxY + threshold;

          if (dist < minDistance && isAlignedY) {
            minDistance = dist;
            bestSnap = {
              snapped: true,
              offset: { x: dx, y: 0 },
              guideLines: [
                {
                  start: { x: v1.x, y: minY - 50 },
                  end: { x: v1.x, y: maxY + 50 },
                  type: 'vertical'
                }
              ]
            };
          }
        }
      }
    }
  }

  return bestSnap || { snapped: false };
}

// Helper functions (simplified versions without full transform logic)
function localToWorldSimple(localPoint: Vertex, room: Room): Vertex {
  const cos = Math.cos(room.rotation);
  const sin = Math.sin(room.rotation);

  const scaledX = localPoint.x * room.scale;
  const scaledY = localPoint.y * room.scale;

  const rotatedX = scaledX * cos - scaledY * sin;
  const rotatedY = scaledX * sin + scaledY * cos;

  return {
    x: rotatedX + room.position.x,
    y: rotatedY + room.position.y
  };
}

function distanceToSegmentSimple(
  point: Vertex,
  segmentStart: Vertex,
  segmentEnd: Vertex
): { distance: number; closestPoint: Vertex } {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const dist = distance(point, segmentStart);
    return { distance: dist, closestPoint: segmentStart };
  }

  let t = ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const closestPoint = {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy
  };

  return {
    distance: distance(point, closestPoint),
    closestPoint
  };
}
