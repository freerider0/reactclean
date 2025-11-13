/**
 * Vertex utility functions for ID-based vertex management
 */

import { Vertex } from '../types';

/**
 * Generate a unique ID for a vertex using UUID v4
 * Uses crypto.randomUUID() for cryptographically secure random UUIDs
 */
export function generateVertexId(): string {
  // Use native crypto.randomUUID() for proper UUID v4 generation
  // Prefix with 'v_' for backwards compatibility and easy identification
  return `v_${crypto.randomUUID()}`;
}

/**
 * Find a vertex by its ID
 */
export function findVertexById(vertices: Vertex[], id: string): Vertex | undefined {
  return vertices.find(v => v.id === id);
}

/**
 * Find the index of a vertex by its ID
 * Returns -1 if not found
 */
export function findVertexIndexById(vertices: Vertex[], id: string): number {
  return vertices.findIndex(v => v.id === id);
}

/**
 * Get vertex IDs from an array of vertices
 */
export function getVertexIds(vertices: Vertex[]): string[] {
  return vertices.map(v => v.id);
}

/**
 * Create a vertex with a unique ID
 */
export function createVertex(x: number, y: number, id?: string): Vertex {
  return {
    id: id || generateVertexId(),
    x,
    y
  };
}

/**
 * Migrate vertices without IDs by adding generated IDs
 * Used for backwards compatibility with old data
 */
export function migrateVerticesToIds(vertices: Vertex[]): Vertex[] {
  return vertices.map(v => {
    if (v.id) {
      return v; // Already has ID
    }
    return {
      ...v,
      id: generateVertexId()
    };
  });
}

/**
 * Convert vertex IDs to indices
 * Returns array of indices in the same order as input IDs
 * Returns -1 for IDs that don't exist
 */
export function vertexIdsToIndices(vertices: Vertex[], ids: string[]): number[] {
  return ids.map(id => findVertexIndexById(vertices, id));
}

/**
 * Convert vertex indices to IDs
 * Returns array of IDs in the same order as input indices
 * Skips invalid indices
 */
export function vertexIndicesToIds(vertices: Vertex[], indices: number[]): string[] {
  return indices
    .filter(index => index >= 0 && index < vertices.length)
    .map(index => vertices[index].id);
}
