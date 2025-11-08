/**
 * Point in shadow coordinate system (azimuth/elevation)
 */
export interface ShadowPoint {
  azimut: number;    // Azimuth angle in degrees (-180 to 180)
  elevation: number; // Elevation angle in degrees (0 to 90)
}

/**
 * Shadow projected by a building wall
 * Represented as a quadrilateral in azimuth-elevation space
 */
export interface Shadow {
  id: string;
  gid: string;
  cadastralNumber: string;
  points: {
    downLeft: ShadowPoint;
    upLeft: ShadowPoint;
    upRight: ShadowPoint;
    downRight: ShadowPoint;
  };
}

/**
 * 3D point in space
 */
export interface Point3D {
  x: number; // X coordinate (UTM)
  y: number; // Y coordinate (UTM)
  z: number; // Z coordinate (height in meters)
}

/**
 * External wall of a building represented as a 3D quadrilateral
 */
export interface WallExternalBuilding {
  id: string;
  gid: string;
  cadastralNumber: string;
  points: {
    downLeft: Point3D;
    upLeft: Point3D;
    upRight: Point3D;
    downRight: Point3D;
  };
}

/**
 * Request parameters for shadow calculation
 */
export interface ShadowCalculationRequest {
  centerX: number;      // Center X coordinate (UTM)
  centerY: number;      // Center Y coordinate (UTM)
  centerZ?: number;     // Center Z coordinate (height in meters), default 0
  bufferMeters?: number; // Radius to search for buildings, default 100
}

/**
 * Response from shadow calculation API
 */
export interface ShadowCalculationResponse {
  message: string;
  data: Shadow[];
  query: {
    center: Point3D;
    buffer: number;
    bounds: {
      bottom_left: { x: number; y: number };
      top_right: { x: number; y: number };
    };
  };
}

/**
 * Building data from cadastre with geometry
 */
export interface CatastroBuilding {
  data: {
    gid: number;
    area: number;
    geom: {
      type: string;
      crs: {
        type: string;
        properties: {
          name: string;
        };
      };
      coordinates: number[][][][];
    };
    refcat: string;
    constru: string;
  };
  json_geometria: string;
}
