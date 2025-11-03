/**
 * UTM Projection Utilities for Spanish Cadastre
 * Handles UTM zones 28-31 for Spain (Canarias to Catalunya)
 */

import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import type { UTMZone, UTMZoneInfo } from '@/types/catastro';

// =============================================================================
// UTM ZONE DEFINITIONS
// =============================================================================

/**
 * UTM zones used in Spain with their characteristics
 */
export const UTM_ZONES: Record<UTMZone, UTMZoneInfo> = {
  28: {
    zone: 28,
    epsg: 'EPSG:25828',
    name: 'Canarias',
    longitudeRange: [-18, -12],
  },
  29: {
    zone: 29,
    epsg: 'EPSG:25829',
    name: 'Galicia/Oeste',
    longitudeRange: [-12, -6],
  },
  30: {
    zone: 30,
    epsg: 'EPSG:25830',
    name: 'Madrid/Centro',
    longitudeRange: [-6, 0],
  },
  31: {
    zone: 31,
    epsg: 'EPSG:25831',
    name: 'Catalunya/Este',
    longitudeRange: [0, 6],
  },
};

// =============================================================================
// PROJ4 DEFINITIONS
// =============================================================================

/**
 * Initialize all UTM zones for Spain
 * Must be called before using OpenLayers with UTM projections
 */
export function defineAllUTMZones(): void {
  // UTM Zone 28N (Canarias)
  proj4.defs(
    'EPSG:25828',
    '+proj=utm +zone=28 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
  );

  // UTM Zone 29N (Galicia/Oeste)
  proj4.defs(
    'EPSG:25829',
    '+proj=utm +zone=29 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
  );

  // UTM Zone 30N (Madrid/Centro)
  proj4.defs(
    'EPSG:25830',
    '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
  );

  // UTM Zone 31N (Catalunya/Este)
  proj4.defs(
    'EPSG:25831',
    '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
  );

  // Register with OpenLayers
  register(proj4);

  console.log('✅ UTM zones 28-31 registered with proj4');
}

// =============================================================================
// ZONE DETECTION
// =============================================================================

/**
 * Detect the correct UTM zone based on longitude
 * @param lng - Longitude in decimal degrees (WGS84)
 * @returns UTM zone number (28, 29, 30, or 31)
 *
 * @example
 * detectUTMZoneFromLng(-15) // Returns 28 (Canarias)
 * detectUTMZoneFromLng(-8)  // Returns 29 (Galicia)
 * detectUTMZoneFromLng(-3)  // Returns 30 (Madrid)
 * detectUTMZoneFromLng(2)   // Returns 31 (Catalunya)
 */
export function detectUTMZoneFromLng(lng: number): UTMZone {
  if (lng < -12) return 28; // Canarias
  if (lng < -6) return 29; // Galicia/Oeste
  if (lng < 0) return 30; // Madrid/Centro
  return 31; // Catalunya/Este
}

/**
 * Get UTM zone info for a given longitude
 * @param lng - Longitude in decimal degrees
 * @returns Complete UTM zone information
 */
export function getUTMZoneInfo(lng: number): UTMZoneInfo {
  const zone = detectUTMZoneFromLng(lng);
  return UTM_ZONES[zone];
}

/**
 * Get UTM zone number from EPSG code
 * @param epsg - EPSG code (e.g., "EPSG:25831" or 25831)
 * @returns UTM zone number or null if invalid
 *
 * @example
 * getZoneFromEPSG("EPSG:25831") // Returns 31
 * getZoneFromEPSG(25830)         // Returns 30
 */
export function getZoneFromEPSG(epsg: string | number): UTMZone | null {
  const epsgNum = typeof epsg === 'string' ? parseInt(epsg.replace('EPSG:', '')) : epsg;

  if (epsgNum >= 25828 && epsgNum <= 25831) {
    return (epsgNum - 25800) as UTMZone;
  }

  return null;
}

// =============================================================================
// EPSG CODE HELPERS
// =============================================================================

/**
 * Get EPSG code for a UTM zone
 * @param zone - UTM zone number (28-31)
 * @returns EPSG code string (e.g., "EPSG:25831")
 */
export function getEPSGCode(zone: UTMZone): string {
  return `EPSG:258${zone}`;
}

/**
 * Get SRID (numeric) from UTM zone
 * @param zone - UTM zone number (28-31)
 * @returns SRID number (e.g., 25831)
 */
export function getSRID(zone: UTMZone): number {
  return 25800 + zone;
}

/**
 * Get EPSG code from longitude
 * @param lng - Longitude in decimal degrees
 * @returns EPSG code for the appropriate UTM zone
 */
export function getEPSGFromLng(lng: number): string {
  const zone = detectUTMZoneFromLng(lng);
  return getEPSGCode(zone);
}

/**
 * Get SRID from longitude
 * @param lng - Longitude in decimal degrees
 * @returns SRID number for the appropriate UTM zone
 */
export function getSRIDFromLng(lng: number): number {
  const zone = detectUTMZoneFromLng(lng);
  return getSRID(zone);
}

// =============================================================================
// COORDINATE FORMATTING
// =============================================================================

/**
 * Format UTM coordinates for display
 * @param x - X coordinate in meters
 * @param y - Y coordinate in meters
 * @param zone - UTM zone
 * @returns Formatted string
 *
 * @example
 * formatUTMCoordinates(430123, 4581234, 31)
 * // Returns "UTM 31N: 430,123 m E, 4,581,234 m N"
 */
export function formatUTMCoordinates(x: number, y: number, zone: UTMZone): string {
  const xFormatted = Math.round(x).toLocaleString('es-ES');
  const yFormatted = Math.round(y).toLocaleString('es-ES');
  return `UTM ${zone}N: ${xFormatted} m E, ${yFormatted} m N`;
}

/**
 * Format coordinates with zone name
 * @param x - X coordinate in meters
 * @param y - Y coordinate in meters
 * @param zone - UTM zone
 * @returns Formatted string with zone name
 */
export function formatUTMWithZoneName(x: number, y: number, zone: UTMZone): string {
  const zoneInfo = UTM_ZONES[zone];
  const xFormatted = Math.round(x).toLocaleString('es-ES');
  const yFormatted = Math.round(y).toLocaleString('es-ES');
  return `${zoneInfo.name} (UTM ${zone}N)\nX: ${xFormatted} m\nY: ${yFormatted} m`;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a coordinate is valid for a given UTM zone
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param zone - UTM zone
 * @returns true if coordinates are valid
 */
export function isValidUTMCoordinate(x: number, y: number, zone: UTMZone): boolean {
  // Basic validation - UTM coordinates in Spain are roughly:
  // X: 100,000 to 900,000 (within zone)
  // Y: 4,000,000 to 4,900,000 (for mainland Spain)
  // Y: 3,000,000 to 3,300,000 (for Canary Islands)

  if (zone === 28) {
    // Canary Islands
    return x >= 100000 && x <= 900000 && y >= 3000000 && y <= 3300000;
  }

  // Mainland Spain
  return x >= 100000 && x <= 900000 && y >= 4000000 && y <= 4900000;
}

/**
 * Validate EPSG code
 * @param epsg - EPSG code to validate
 * @returns true if valid Spanish UTM zone
 */
export function isValidSpanishEPSG(epsg: string | number): boolean {
  const zone = getZoneFromEPSG(epsg);
  return zone !== null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  UTM_ZONES,
  defineAllUTMZones,
  detectUTMZoneFromLng,
  getUTMZoneInfo,
  getZoneFromEPSG,
  getEPSGCode,
  getSRID,
  getEPSGFromLng,
  getSRIDFromLng,
  formatUTMCoordinates,
  formatUTMWithZoneName,
  isValidUTMCoordinate,
  isValidSpanishEPSG,
};
