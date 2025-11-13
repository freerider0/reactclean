/**
 * Room migration utilities
 * Handles backwards compatibility for rooms created before vertex ID implementation
 */

import { Room } from '../types';
import { migrateVerticesToIds, vertexIndicesToIds } from './vertexUtils';

/**
 * Migrate a room to use vertex IDs
 * - Adds IDs to vertices that don't have them
 * - Updates constraints to include vertexIds field
 * - Safe to call multiple times (idempotent)
 */
export function migrateRoomToVertexIds(room: Room): Room {
  // Migrate vertices to have IDs
  const migratedVertices = migrateVerticesToIds(room.vertices);

  // Migrate originalVertices if they exist
  const migratedOriginalVertices = room.originalVertices
    ? migrateVerticesToIds(room.originalVertices)
    : undefined;

  // Migrate centerlineVertices
  const migratedCenterlineVertices = room.centerlineVertices
    ? migrateVerticesToIds(room.centerlineVertices)
    : room.centerlineVertices;

  // Migrate envelope vertices if they exist
  const migratedEnvelopeVertices = room.envelopeVertices
    ? migrateVerticesToIds(room.envelopeVertices)
    : undefined;

  // Migrate constraints to include vertexIds
  const migratedConstraints = room.constraints.map(constraint => {
    // If constraint already has vertexIds, return as-is
    if (constraint.vertexIds && constraint.vertexIds.length > 0) {
      return constraint;
    }

    // For vertex-based constraints (Distance, Horizontal, Vertical),
    // convert indices to vertex IDs
    const vertexBasedTypes = ['distance', 'horizontal', 'vertical'];

    if (vertexBasedTypes.includes(constraint.type)) {
      // Convert indices to vertex IDs using the migrated vertices
      const vertexIds = vertexIndicesToIds(migratedVertices, constraint.indices);

      return {
        ...constraint,
        vertexIds
      };
    }

    // Edge-based constraints (Parallel, Perpendicular, Angle, Equal) don't need vertexIds
    return constraint;
  });

  return {
    ...room,
    vertices: migratedVertices,
    originalVertices: migratedOriginalVertices,
    centerlineVertices: migratedCenterlineVertices,
    envelopeVertices: migratedEnvelopeVertices,
    constraints: migratedConstraints
  };
}

/**
 * Migrate all rooms in a Map to use vertex IDs
 */
export function migrateAllRooms(rooms: Map<string, Room>): Map<string, Room> {
  const migratedRooms = new Map<string, Room>();

  for (const [id, room] of rooms.entries()) {
    migratedRooms.set(id, migrateRoomToVertexIds(room));
  }

  return migratedRooms;
}
