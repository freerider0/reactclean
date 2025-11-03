/**
 * Convierte coordenadas UTM (EPSG:25831) a WGS84 (lat/lng)
 * EPSG:25831 = UTM Zone 31N usado por el catastro español
 */

// Parámetros del elipsoide WGS84
const a = 6378137.0; // Semi-eje mayor
const f = 1 / 298.257223563; // Aplanamiento
const b = a * (1 - f); // Semi-eje menor
const e2 = (a * a - b * b) / (a * a); // Primera excentricidad al cuadrado
const e_prime2 = (a * a - b * b) / (b * b); // Segunda excentricidad al cuadrado

// Parámetros de la proyección UTM Zone 31N
const k0 = 0.9996; // Factor de escala
const E0 = 500000; // False Easting
const N0 = 0; // False Northing (hemisferio norte)
const lambda0 = 3 * Math.PI / 180; // Meridiano central zona 31 (3°E)

export interface CoordenadaUTM {
  x: number; // Este (Easting)
  y: number; // Norte (Northing)
}

export interface CoordenadaWGS84 {
  lat: number;
  lng: number;
}

/**
 * Convierte coordenadas UTM Zone 31N a WGS84
 */
export function utm31nToWGS84(utm: CoordenadaUTM): CoordenadaWGS84 {
  const x = utm.x - E0;
  const y = utm.y - N0;

  const M = y / k0;

  // Calcular la latitud usando serie de Fourier
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 = mu +
    (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) +
    (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu) +
    (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

  const C1 = e_prime2 * Math.cos(phi1) * Math.cos(phi1);
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = x / (N1 * k0);

  // Calcular latitud
  const lat = phi1 - (N1 * Math.tan(phi1) / R1) *
    (D * D / 2 -
      (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e_prime2) * D * D * D * D / 24 +
      (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e_prime2 - 3 * C1 * C1) * D * D * D * D * D * D / 720);

  // Calcular longitud
  const lng = lambda0 +
    (D -
      (1 + 2 * T1 + C1) * D * D * D / 6 +
      (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e_prime2 + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1);

  return {
    lat: lat * 180 / Math.PI,
    lng: lng * 180 / Math.PI
  };
}

/**
 * Convierte un objeto con coordenadas UTM a WGS84
 */
export function convertirCoordenadas(coords: CoordenadaUTM): CoordenadaWGS84 {
  return utm31nToWGS84(coords);
}

/**
 * Formatea coordenadas para mostrar
 */
export function formatearCoordenadas(coords: CoordenadaWGS84): string {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

/**
 * Interfaz para coordenadas Web Mercator (EPSG:3857)
 */
export interface CoordenadaWebMercator {
  x: number; // Coordenada X en metros
  y: number; // Coordenada Y en metros
}

/**
 * Convierte coordenadas UTM Zone 31N a Web Mercator (EPSG:3857)
 * Útil para cargar geometrías en mapas OpenLayers/Leaflet
 */
export function utm31nToWebMercator(utm: CoordenadaUTM): CoordenadaWebMercator {
  // UTM → WGS84 → Web Mercator
  const wgs84 = utm31nToWGS84(utm);

  // WGS84 → Web Mercator
  const lng = wgs84.lng * Math.PI / 180;
  const lat = wgs84.lat * Math.PI / 180;

  const x = 6378137 * lng;
  const y = 6378137 * Math.log(Math.tan(Math.PI / 4 + lat / 2));

  return { x, y };
}

/**
 * Convierte coordenadas Web Mercator (EPSG:3857) a UTM Zone 31N
 * Útil para mostrar coordenadas del ratón en UTM
 */
export function webMercatorToUTM31n(webMercator: CoordenadaWebMercator): CoordenadaUTM {
  // Web Mercator → WGS84
  const lng = (webMercator.x / 6378137) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(webMercator.y / 6378137)) - Math.PI / 2) * 180 / Math.PI;

  // WGS84 → UTM 31N
  return wgs84ToUTM31n({ lat, lng });
}

/**
 * Convierte coordenadas WGS84 (lat/lng) a UTM Zone 31N
 * Inversa de utm31nToWGS84
 */
export function wgs84ToUTM31n(wgs84: CoordenadaWGS84): CoordenadaUTM {
  const lat = wgs84.lat * Math.PI / 180;
  const lng = wgs84.lng * Math.PI / 180;

  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  const T = Math.tan(lat) * Math.tan(lat);
  const C = e_prime2 * Math.cos(lat) * Math.cos(lat);
  const A = (lng - lambda0) * Math.cos(lat);

  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * lat -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * lat) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * lat) -
    (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * lat)
  );

  const x = k0 * N * (A + (1 - T + C) * A * A * A / 6 +
    (5 - 18 * T + T * T + 72 * C - 58 * e_prime2) * A * A * A * A * A / 120) + E0;

  const y = k0 * (M + N * Math.tan(lat) * (
    A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 +
    (61 - 58 * T + T * T + 600 * C - 330 * e_prime2) * A * A * A * A * A * A / 720
  )) + N0;

  return { x, y };
}
