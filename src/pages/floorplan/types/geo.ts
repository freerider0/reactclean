/**
 * Geo-referencing types for floorplan placement on map
 */

/**
 * Geographic reference for positioning floorplan on a map
 * All coordinates are in UTM meters
 */
export interface GeoReference {
  /** Anchor point in UTM coordinates (meters) - typically the centroid of the cadastral parcel */
  anchor: {
    x: number; // UTM Easting (meters)
    y: number; // UTM Northing (meters)
  };

  /** Rotation of the entire floorplan in radians (0 = North) */
  rotation: number;

  /** SRID/EPSG code for the UTM zone (25828-25831 for Spain) */
  srid: number;

  /** Scale factor for adjustments (1.0 = actual scale) */
  scale: number;
}

/**
 * Initial geo reference derived from cadastral parcel data
 */
export interface InitialGeoReference {
  anchor: { x: number; y: number };
  srid: number;
}
