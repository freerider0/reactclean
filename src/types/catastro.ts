/**
 * TypeScript types for Catastro API responses
 * Based on Spanish cadastral data structure
 */

// =============================================================================
// COORDINATE TYPES
// =============================================================================

export interface Coordenadas {
  x: number; // X coordinate in UTM (meters)
  y: number; // Y coordinate in UTM (meters)
}

// =============================================================================
// PARCEL TYPES
// =============================================================================

export interface ParcelaResponse {
  refcat: string; // 14-character cadastral reference
  area: number; // Area in m²
  coordenadas: Coordenadas; // Centroid coordinates
  wkt: string; // Geometry as Well-Known Text
  srid: number; // Spatial Reference ID (25828-25831)
  epsg: string; // EPSG code (e.g., "EPSG:25831")
  datos_finca: DatosFinca | null;
  estadisticas: Estadisticas;
}

export interface ParcelaCompleta {
  refcat: string;
  parcela: {
    datos_finca: DatosFinca | null;
    geometria: GeometriaInfo;
  };
  inmuebles: InmuebleSimple[];
  construcciones_geometria: ConstruccionGeometria[];
  estadisticas: Estadisticas;
}

export interface GeometriaInfo {
  area: number;
  coordenadas: Coordenadas;
  wkt: string;
  srid: number;
  epsg: string;
}

// =============================================================================
// FINCA (PLOT) TYPES
// =============================================================================

export interface DatosFinca {
  tipo_registro?: string;
  codigo_delegacion_meh?: string;
  codigo_municipio_dgc_parcela?: string;
  parcela_catastral?: string;
  codigo_provincia?: string;
  nombre_provincia?: string;
  codigo_municipio_ine?: string;
  nombre_municipio?: string;
  nombre_entidad_menor?: string;
  tipo_via?: string;
  nombre_via?: string;
  numero_policia1?: string | number;
  letra1?: string;
  numero_policia2?: string | number;
  letra2?: string;
  kilometro?: number;
  codigo_postal?: string;
  superficie_finca?: number; // m²
  superficie_construida_total?: number; // m²
  superficie_construida_sobre_rasante?: number; // m²
  superficie_construida_bajo_rasante?: number; // m²
  coordenada_x?: number;
  coordenada_y?: number;
  sistema_referencia?: string; // e.g., "EPSG:25831"
  created_at?: string;
}

// =============================================================================
// PROPERTY (INMUEBLE) TYPES
// =============================================================================

export interface InmuebleSimple {
  refcat_completa: string; // 20-character complete reference
  direccion: string;
  escalera?: string;
  planta?: string;
  puerta?: string;
  superficie: number; // m²
}

export interface InmuebleCompleto {
  referencia_catastral_completa: string;
  referencia_catastral_parcela: string;
  numero_secuencial: number;
  control: string;
  inmueble: InmuebleDetalle;
  parcela?: any;
}

export interface InmuebleDetalle {
  numero_fijo_bien_inmueble: string;
  clase: string; // 'UR' = Urban, 'RU' = Rustic, 'BI' = Special
  direccion: Direccion;
  ubicacion: Ubicacion;
  caracteristicas: Caracteristicas;
  registro: Registro;
  construcciones?: Construccion[];
}

export interface Direccion {
  tipo_via: string;
  nombre_via: string;
  numero: number;
  letra?: string;
  bloque?: string;
  escalera?: string;
  planta?: string;
  puerta?: string;
  codigo_postal: string;
}

export interface Ubicacion {
  municipio: string;
  provincia: string;
}

export interface Caracteristicas {
  ano_antiguedad: number;
  superficie_elementos_constructivos: number; // m²
  superficie_elementos_suelo: number; // m²
  coeficiente_propiedad: number;
}

export interface Registro {
  numero_finca_registral?: string;
  numero_orden_division_horizontal?: string;
}

export interface Construccion {
  codigo_unidad_constructiva: string;
  uso: string; // Destination code
  ubicacion: {
    escalera?: string;
    planta?: string;
    puerta?: string;
  };
  superficies: {
    total: number;
    porches_terrazas: number;
    otras_plantas: number;
  };
  antiguedad: {
    ano_efectivo: number;
    ano_reforma?: number;
    indicador_reforma?: string;
  };
  tipologia_constructiva: string;
  local_interior: boolean | string;
}

// =============================================================================
// CONSTRUCTION GEOMETRY TYPES
// =============================================================================

export interface ConstruccionGeometria {
  tipo: string; // Construction type code
  wkt: string; // Building footprint as WKT
  area: number; // m²
  tipo_suelo?: string;
  fecha_alta?: string; // ISO date
  coorx?: number;
  coory?: number;
}

// =============================================================================
// STATISTICS TYPES
// =============================================================================

export interface Estadisticas {
  total_inmuebles: number;
  superficie_total: number; // m²
}

export interface EstadisticasCompletas extends Estadisticas {
  superficie_media_inmueble?: number;
  ano_construccion_min?: number;
  ano_construccion_max?: number;
  coeficiente_propiedad_total?: number;
  distribucion_usos?: DistribucionUso[];
}

export interface DistribucionUso {
  uso: string;
  cantidad: number;
  superficie_total: number;
}

// =============================================================================
// ADJACENT PARCELS TYPES
// =============================================================================

export interface ParcelaColindante {
  refcat: string;
  area: number;
  longitud_frontera: number; // Shared boundary length in meters
}

export interface ParcelaCercana {
  refcat: string;
  area: number;
  distancia: number; // Distance in meters
}

// =============================================================================
// DATABASE STATS TYPE
// =============================================================================

export interface DatabaseStats {
  total_parcelas: number;
  total_fincas: number;
  total_inmuebles: number;
}

// =============================================================================
// UTM ZONE TYPES
// =============================================================================

export type UTMZone = 28 | 29 | 30 | 31;

export interface UTMZoneInfo {
  zone: UTMZone;
  epsg: string; // e.g., "EPSG:25831"
  name: string; // e.g., "Catalunya/Este"
  longitudeRange: [number, number]; // e.g., [0, 6]
}

// =============================================================================
// API ERROR TYPES
// =============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: any;
}

// =============================================================================
// SEARCH/FILTER TYPES
// =============================================================================

export interface SearchParams {
  refcat?: string;
  x?: number;
  y?: number;
  srid?: number;
  radio?: number;
  limit?: number;
}
