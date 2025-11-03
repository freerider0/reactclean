/**
 * Tipos de dirección estructurada (compatible con catastro español)
 */

export type TipoVia =
  | 'Calle'
  | 'Avenida'
  | 'Plaza'
  | 'Paseo'
  | 'Camino'
  | 'Travesía'
  | 'Ronda'
  | 'Glorieta'
  | 'Carretera'
  | 'Urbanización'
  | 'Polígono'
  | 'Sector'
  | 'Barrio'
  | 'Otro';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Address {
  // Identificación de la vía
  tipo_via?: TipoVia;
  nombre_via?: string;

  // Número y localizadores
  numero?: string; // Puede incluir letras: "123", "123 bis", "s/n"
  bloque?: string;
  portal?: string;
  escalera?: string;
  piso?: string;
  puerta?: string;

  // Localización administrativa
  codigo_postal?: string;
  municipio?: string;
  provincia?: string;
  pais?: string;

  // Datos catastrales
  referencia_catastral?: string;

  // Geolocalización
  coordenadas?: Coordenadas;

  // Notas adicionales
  notas?: string;
}

/**
 * Formatea una dirección al estilo catastro español
 */
export function formatAddress(address: Address, oneLine: boolean = true): string {
  const parts: string[] = [];

  // Tipo y nombre de vía
  if (address.tipo_via && address.nombre_via) {
    parts.push(`${address.tipo_via} ${address.nombre_via}`);
  } else if (address.nombre_via) {
    parts.push(address.nombre_via);
  }

  // Número
  if (address.numero) {
    parts.push(address.numero);
  }

  // Detalles del edificio/vivienda
  const details: string[] = [];
  if (address.bloque) details.push(`Bloque ${address.bloque}`);
  if (address.portal) details.push(`Portal ${address.portal}`);
  if (address.escalera) details.push(`Esc. ${address.escalera}`);
  if (address.piso) details.push(`${address.piso}º`);
  if (address.puerta) details.push(address.puerta);

  if (details.length > 0) {
    parts.push(details.join(', '));
  }

  // Localización
  const location: string[] = [];
  if (address.codigo_postal) location.push(address.codigo_postal);
  if (address.municipio) location.push(address.municipio);
  if (address.provincia && address.provincia !== address.municipio) {
    location.push(address.provincia);
  }

  if (location.length > 0) {
    parts.push(location.join(' '));
  }

  // Unir las partes
  if (oneLine) {
    return parts.join(', ');
  } else {
    return parts.join('\n');
  }
}

/**
 * Obtiene la dirección corta (solo calle y número)
 */
export function getShortAddress(address: Address): string {
  const parts: string[] = [];

  if (address.tipo_via && address.nombre_via) {
    parts.push(`${address.tipo_via} ${address.nombre_via}`);
  } else if (address.nombre_via) {
    parts.push(address.nombre_via);
  }

  if (address.numero) {
    parts.push(address.numero);
  }

  if (address.piso || address.puerta) {
    const apt: string[] = [];
    if (address.piso) apt.push(`${address.piso}º`);
    if (address.puerta) apt.push(address.puerta);
    parts.push(apt.join(' '));
  }

  return parts.join(', ') || 'Sin dirección';
}

/**
 * Obtiene el municipio y provincia
 */
export function getLocation(address: Address): string {
  const parts: string[] = [];

  if (address.municipio) parts.push(address.municipio);
  if (address.provincia && address.provincia !== address.municipio) {
    parts.push(address.provincia);
  }

  return parts.join(', ') || 'Sin localización';
}

/**
 * Valida si una dirección tiene los campos mínimos
 */
export function isValidAddress(address: Address): boolean {
  return !!(address.nombre_via && address.municipio);
}

/**
 * Crea un objeto de dirección vacío
 */
export function createEmptyAddress(): Address {
  return {
    tipo_via: undefined,
    nombre_via: undefined,
    numero: undefined,
    bloque: undefined,
    portal: undefined,
    escalera: undefined,
    piso: undefined,
    puerta: undefined,
    codigo_postal: undefined,
    municipio: undefined,
    provincia: undefined,
    pais: 'España',
    referencia_catastral: undefined,
    coordenadas: undefined,
    notas: undefined,
  };
}

/**
 * Obtiene coordenadas desde una dirección (si existen)
 */
export function getCoordinates(address: Address): Coordenadas | null {
  return address.coordenadas || null;
}

/**
 * Lista de tipos de vías comunes en España
 */
export const TIPOS_VIA: TipoVia[] = [
  'Calle',
  'Avenida',
  'Plaza',
  'Paseo',
  'Camino',
  'Travesía',
  'Ronda',
  'Glorieta',
  'Carretera',
  'Urbanización',
  'Polígono',
  'Sector',
  'Barrio',
  'Otro',
];
