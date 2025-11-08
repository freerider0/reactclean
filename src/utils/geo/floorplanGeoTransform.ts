/**
 * Geo-referencing transformation utilities
 * Transforms floorplan rooms to UTM coordinates and OpenLayers Features
 */

import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import type { Room, Vertex } from '@/pages/floorplan/types';
import type { GeoReference } from '@/pages/floorplan/types/geo';
import { localToWorld } from '@/pages/floorplan/utils/coordinates';

/**
 * Transform a single vertex from floorplan coordinates to UTM coordinates
 *
 * Process:
 * 1. Convert from cm to meters
 * 2. Translate by -centroid (to rotate around centroid)
 * 3. Apply GeoReference rotation
 * 4. Translate by +centroid
 * 5. Apply GeoReference scale
 * 6. Translate to anchor point
 *
 * @param vertex - Vertex in floorplan world coordinates (cm)
 * @param geoRef - Geographic reference
 * @param centroid - Centroid in floorplan world coordinates (cm), used as rotation center
 * @returns UTM coordinates [easting, northing] in meters
 */
export function vertexToUTM(
  vertex: Vertex,
  geoRef: GeoReference,
  centroid: Vertex = { x: 0, y: 0 }
): [number, number] {
  // Convert from cm to meters
  const xMeters = vertex.x / 100;
  const yMeters = vertex.y / 100;
  const centroidXMeters = centroid.x / 100;
  const centroidYMeters = centroid.y / 100;

  // Translate so centroid is at origin (for rotation around centroid)
  const translatedX = xMeters - centroidXMeters;
  const translatedY = yMeters - centroidYMeters;

  // Apply GeoReference rotation (now rotating around centroid)
  const cos = Math.cos(geoRef.rotation);
  const sin = Math.sin(geoRef.rotation);

  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;

  // Translate back from centroid
  const recenteredX = rotatedX + centroidXMeters;
  const recenteredY = rotatedY + centroidYMeters;

  // Apply GeoReference scale
  const scaledX = recenteredX * geoRef.scale;
  const scaledY = recenteredY * geoRef.scale;

  // Translate to anchor point (UTM coordinates)
  const utmEasting = geoRef.anchor.x + scaledX;
  const utmNorthing = geoRef.anchor.y + scaledY;

  return [utmEasting, utmNorthing];
}

/**
 * Calculate centroid in world space (before geo-transformation)
 * Used as the rotation center for geo-referencing
 *
 * @param rooms - Array of rooms
 * @returns Centroid in world coordinates (cm)
 */
export function getFloorplanCentroidWorld(rooms: Room[]): Vertex {
  if (rooms.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  rooms.forEach((room) => {
    // Transform vertices from local to world coordinates
    const worldVertices = room.vertices.map((vertex) =>
      localToWorld(vertex, room.position, room.rotation, room.scale)
    );

    worldVertices.forEach((vertex) => {
      sumX += vertex.x;
      sumY += vertex.y;
      count++;
    });
  });

  return {
    x: sumX / count,
    y: sumY / count,
  };
}

/**
 * Transform all vertices of a room to UTM coordinates
 *
 * First applies room's assembly transform (position, rotation, scale),
 * then applies geo-reference transform
 *
 * @param room - Room with vertices in local coordinates
 * @param geoRef - Geographic reference
 * @param centroid - Centroid in world coordinates (optional, used as rotation center)
 * @returns Array of UTM coordinates [easting, northing]
 */
export function roomVerticesToUTM(
  room: Room,
  geoRef: GeoReference,
  centroid?: Vertex
): [number, number][] {
  // First, transform vertices from local to world coordinates
  const worldVertices = room.vertices.map((vertex) =>
    localToWorld(vertex, room.position, room.rotation, room.scale)
  );

  // Then transform from world coordinates to UTM
  return worldVertices.map((vertex) => vertexToUTM(vertex, geoRef, centroid));
}

/**
 * Create an OpenLayers Feature from a Room
 *
 * The Feature will have:
 * - Polygon geometry in UTM coordinates
 * - Properties: room id, name, color
 *
 * @param room - Room to convert
 * @param geoRef - Geographic reference
 * @param centroid - Centroid in world coordinates (optional, used as rotation center)
 * @returns OpenLayers Feature with Polygon geometry
 */
export function roomToFeature(
  room: Room,
  geoRef: GeoReference,
  centroid?: Vertex
): Feature<Polygon> {
  const utmCoordinates = roomVerticesToUTM(room, geoRef, centroid);

  // Close the polygon (first point = last point)
  const closedCoordinates = [...utmCoordinates, utmCoordinates[0]];

  // Create OpenLayers Polygon
  // Note: OpenLayers expects coordinates as [x, y] which matches our [easting, northing]
  const polygon = new Polygon([closedCoordinates]);

  // Create Feature
  const feature = new Feature({
    geometry: polygon,
    id: room.id,
    name: room.name,
    color: room.color,
    roomType: 'floorplan-room',
  });

  feature.setId(room.id);

  return feature;
}

/**
 * Convert entire floorplan (all rooms) to OpenLayers Features
 * Rotates around the floorplan's centroid
 *
 * @param rooms - Array of rooms
 * @param geoRef - Geographic reference
 * @returns Array of OpenLayers Features
 */
export function floorplanToFeatures(
  rooms: Room[],
  geoRef: GeoReference
): Feature<Polygon>[] {
  // Calculate centroid once for the entire floorplan (rotation center)
  const centroid = getFloorplanCentroidWorld(rooms);

  return rooms.map((room) => roomToFeature(room, geoRef, centroid));
}

/**
 * Calculate the bounding box of the floorplan in UTM coordinates
 *
 * Useful for:
 * - Centering the map view on the floorplan
 * - Calculating buffer zones for shadow calculations
 *
 * @param rooms - Array of rooms
 * @param geoRef - Geographic reference
 * @returns Bounding box [minX, minY, maxX, maxY] in UTM meters
 */
export function getFloorplanBoundsUTM(
  rooms: Room[],
  geoRef: GeoReference
): [number, number, number, number] {
  if (rooms.length === 0) {
    return [geoRef.anchor.x, geoRef.anchor.y, geoRef.anchor.x, geoRef.anchor.y];
  }

  // Calculate centroid for rotation
  const centroid = getFloorplanCentroidWorld(rooms);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Collect all vertices from all rooms
  rooms.forEach((room) => {
    const utmVertices = roomVerticesToUTM(room, geoRef, centroid);
    utmVertices.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });

  return [minX, minY, maxX, maxY];
}

/**
 * Transform a UTM point back to floorplan world coordinates
 *
 * Inverse of vertexToUTM - useful for interactive placement
 *
 * @param utmPoint - UTM coordinates [easting, northing] in meters
 * @param geoRef - Geographic reference
 * @param centroid - Centroid in world coordinates (optional, used as rotation center)
 * @returns Vertex in floorplan world coordinates (cm)
 */
export function utmToVertex(
  utmPoint: [number, number],
  geoRef: GeoReference,
  centroid: Vertex = { x: 0, y: 0 }
): Vertex {
  const [easting, northing] = utmPoint;
  const centroidXMeters = centroid.x / 100;
  const centroidYMeters = centroid.y / 100;

  // Remove translation (subtract anchor)
  const translatedX = easting - geoRef.anchor.x;
  const translatedY = northing - geoRef.anchor.y;

  // Remove scale
  const unscaledX = translatedX / geoRef.scale;
  const unscaledY = translatedY / geoRef.scale;

  // Translate so centroid is at origin (inverse of recentering)
  const decenteredX = unscaledX - centroidXMeters;
  const decenteredY = unscaledY - centroidYMeters;

  // Remove rotation (inverse rotation around centroid)
  const cos = Math.cos(-geoRef.rotation);
  const sin = Math.sin(-geoRef.rotation);

  const rotatedX = decenteredX * cos - decenteredY * sin;
  const rotatedY = decenteredX * sin + decenteredY * cos;

  // Translate back from centroid
  const finalX = rotatedX + centroidXMeters;
  const finalY = rotatedY + centroidYMeters;

  // Convert from meters to cm
  return {
    x: finalX * 100,
    y: finalY * 100,
  };
}

/**
 * Calculate the centroid of all rooms in UTM coordinates
 *
 * @param rooms - Array of rooms
 * @param geoRef - Geographic reference
 * @returns Centroid [easting, northing] in UTM meters
 */
export function getFloorplanCentroidUTM(
  rooms: Room[],
  geoRef: GeoReference
): [number, number] {
  if (rooms.length === 0) {
    return [geoRef.anchor.x, geoRef.anchor.y];
  }

  // Calculate centroid in world space for rotation
  const centroidWorld = getFloorplanCentroidWorld(rooms);

  // Transform the centroid itself to UTM
  return vertexToUTM(centroidWorld, geoRef, centroidWorld);
}
