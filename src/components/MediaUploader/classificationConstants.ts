/**
 * Classification constants matching the API configuration
 * These are all the possible values that Gemini can return
 */

export const DOCUMENT_TYPES = {
  IDENTITY: 'identity_document',
  PROPERTY: 'property_document',
  CERTIFICATE: 'certificate',
  CONTRACT: 'contract',
  TECHNICAL: 'technical_document',
  PHOTO: 'property_photo',
  UNKNOWN: 'unknown'
} as const;

export const PHOTO_CATEGORIES = {
  INTERIOR: 'Interior',
  EXTERIOR: 'Exterior'
} as const;

export const ROOM_TYPES = {
  // Interiores
  SALON: 'Salón',
  COMEDOR: 'Comedor',
  COCINA: 'Cocina',
  DORMITORIO: 'Dormitorio',
  BANO: 'Baño',
  PASILLO: 'Pasillo',
  VESTIBULO: 'Vestíbulo',
  DESPACHO: 'Despacho',
  LAVADERO: 'Lavadero',
  TRASTERO: 'Trastero',
  GARAJE_INTERIOR: 'Garaje Interior',

  // Exteriores
  FACHADA: 'Fachada',
  JARDIN: 'Jardín',
  PISCINA: 'Piscina',
  TERRAZA: 'Terraza',
  BALCON: 'Balcón',
  PATIO: 'Patio',
  VISTAS: 'Vistas',
  AZOTEA: 'Azotea',
  PARKING: 'Parking',
  ZONA_COMUN: 'Zona Común'
} as const;

export const DOCUMENT_CATEGORIES = {
  // Identity documents
  DNI: 'DNI',
  PASAPORTE: 'Pasaporte',
  NIE: 'NIE',

  // Property documents
  ESCRITURAS: 'Escrituras',
  NOTA_SIMPLE: 'Nota Simple',
  CONSULTA_CATASTRAL: 'Consulta Catastral',
  RECIBO_IBI: 'Recibo IBI',
  RECIBO_LUZ: 'Recibo Luz',
  RECIBO_AGUA: 'Recibo Agua',
  RECIBO_GAS: 'Recibo Gas',
  RECIBO_COMUNIDAD: 'Recibo Comunidad',

  // Certificates
  CERTIFICADO_ENERGETICO: 'Certificado Energético',
  CEDULA_HABITABILIDAD: 'Cédula Habitabilidad',
  ITE: 'ITE',
  LICENCIA_OCUPACION: 'Licencia de Ocupación',

  // Contracts
  CONTRATO_COMPRAVENTA: 'Contrato de Compraventa',
  CONTRATO_ARRAS: 'Contrato de Arras',
  CONTRATO_ALQUILER: 'Contrato de Alquiler',

  // Technical documents
  PLANOS: 'Planos',
  PROYECTO_OBRA: 'Proyecto de Obra',
  LICENCIA_OBRA: 'Licencia de Obra'
} as const;

/**
 * All possible room types (Interior + Exterior)
 */
export const ALL_ROOM_TYPES = Object.values(ROOM_TYPES);

/**
 * Interior room types
 */
export const INTERIOR_ROOM_TYPES = [
  ROOM_TYPES.SALON,
  ROOM_TYPES.COMEDOR,
  ROOM_TYPES.COCINA,
  ROOM_TYPES.DORMITORIO,
  ROOM_TYPES.BANO,
  ROOM_TYPES.PASILLO,
  ROOM_TYPES.VESTIBULO,
  ROOM_TYPES.DESPACHO,
  ROOM_TYPES.LAVADERO,
  ROOM_TYPES.TRASTERO,
  ROOM_TYPES.GARAJE_INTERIOR,
];

/**
 * Exterior room types
 */
export const EXTERIOR_ROOM_TYPES = [
  ROOM_TYPES.FACHADA,
  ROOM_TYPES.JARDIN,
  ROOM_TYPES.PISCINA,
  ROOM_TYPES.TERRAZA,
  ROOM_TYPES.BALCON,
  ROOM_TYPES.PATIO,
  ROOM_TYPES.VISTAS,
  ROOM_TYPES.AZOTEA,
  ROOM_TYPES.PARKING,
  ROOM_TYPES.ZONA_COMUN,
];

/**
 * All document categories (non-photos)
 */
export const ALL_DOCUMENT_CATEGORIES = Object.values(DOCUMENT_CATEGORIES);

/**
 * Main category types for the first select
 */
export const MAIN_CATEGORIES = {
  INTERIOR: 'Interior',
  EXTERIOR: 'Exterior',
  IDENTITY_DOCS: 'Documentos de Identidad',
  PROPERTY_DOCS: 'Documentos de Propiedad',
  CERTIFICATES: 'Certificados',
  CONTRACTS: 'Contratos',
  TECHNICAL_DOCS: 'Documentos Técnicos',
} as const;

/**
 * Identity document categories
 */
export const IDENTITY_DOCUMENT_CATEGORIES = [
  DOCUMENT_CATEGORIES.DNI,
  DOCUMENT_CATEGORIES.PASAPORTE,
  DOCUMENT_CATEGORIES.NIE,
];

/**
 * Property document categories
 */
export const PROPERTY_DOCUMENT_CATEGORIES = [
  DOCUMENT_CATEGORIES.ESCRITURAS,
  DOCUMENT_CATEGORIES.NOTA_SIMPLE,
  DOCUMENT_CATEGORIES.CONSULTA_CATASTRAL,
  DOCUMENT_CATEGORIES.RECIBO_IBI,
  DOCUMENT_CATEGORIES.RECIBO_LUZ,
  DOCUMENT_CATEGORIES.RECIBO_AGUA,
  DOCUMENT_CATEGORIES.RECIBO_GAS,
  DOCUMENT_CATEGORIES.RECIBO_COMUNIDAD,
];

/**
 * Certificate categories
 */
export const CERTIFICATE_CATEGORIES = [
  DOCUMENT_CATEGORIES.CERTIFICADO_ENERGETICO,
  DOCUMENT_CATEGORIES.CEDULA_HABITABILIDAD,
  DOCUMENT_CATEGORIES.ITE,
  DOCUMENT_CATEGORIES.LICENCIA_OCUPACION,
];

/**
 * Contract categories
 */
export const CONTRACT_CATEGORIES = [
  DOCUMENT_CATEGORIES.CONTRATO_COMPRAVENTA,
  DOCUMENT_CATEGORIES.CONTRATO_ARRAS,
  DOCUMENT_CATEGORIES.CONTRATO_ALQUILER,
];

/**
 * Technical document categories
 */
export const TECHNICAL_DOCUMENT_CATEGORIES = [
  DOCUMENT_CATEGORIES.PLANOS,
  DOCUMENT_CATEGORIES.PROYECTO_OBRA,
  DOCUMENT_CATEGORIES.LICENCIA_OBRA,
];

/**
 * Get subcategories for a main category
 */
export const getSubcategories = (mainCategory: string): string[] => {
  switch (mainCategory) {
    case MAIN_CATEGORIES.INTERIOR:
      return INTERIOR_ROOM_TYPES;
    case MAIN_CATEGORIES.EXTERIOR:
      return EXTERIOR_ROOM_TYPES;
    case MAIN_CATEGORIES.IDENTITY_DOCS:
      return IDENTITY_DOCUMENT_CATEGORIES;
    case MAIN_CATEGORIES.PROPERTY_DOCS:
      return PROPERTY_DOCUMENT_CATEGORIES;
    case MAIN_CATEGORIES.CERTIFICATES:
      return CERTIFICATE_CATEGORIES;
    case MAIN_CATEGORIES.CONTRACTS:
      return CONTRACT_CATEGORIES;
    case MAIN_CATEGORIES.TECHNICAL_DOCS:
      return TECHNICAL_DOCUMENT_CATEGORIES;
    default:
      return [];
  }
};

/**
 * Detect main category from subcategory
 * Used to pre-select the first dropdown based on AI classification
 */
export const getMainCategoryFromSubcategory = (subcategory: string): string | null => {
  if (INTERIOR_ROOM_TYPES.includes(subcategory)) {
    return MAIN_CATEGORIES.INTERIOR;
  }
  if (EXTERIOR_ROOM_TYPES.includes(subcategory)) {
    return MAIN_CATEGORIES.EXTERIOR;
  }
  if (IDENTITY_DOCUMENT_CATEGORIES.includes(subcategory)) {
    return MAIN_CATEGORIES.IDENTITY_DOCS;
  }
  if (PROPERTY_DOCUMENT_CATEGORIES.includes(subcategory)) {
    return MAIN_CATEGORIES.PROPERTY_DOCS;
  }
  if (CERTIFICATE_CATEGORIES.includes(subcategory)) {
    return MAIN_CATEGORIES.CERTIFICATES;
  }
  if (CONTRACT_CATEGORIES.includes(subcategory)) {
    return MAIN_CATEGORIES.CONTRACTS;
  }
  if (TECHNICAL_DOCUMENT_CATEGORIES.includes(subcategory)) {
    return MAIN_CATEGORIES.TECHNICAL_DOCS;
  }
  return null;
};

/**
 * Get grouped categories for select dropdown (legacy support)
 * Returns categories grouped by Interior/Exterior for property photos
 */
export const getGroupedCategories = () => {
  return {
    'Fotos de Propiedad - Interior': INTERIOR_ROOM_TYPES,
    'Fotos de Propiedad - Exterior': EXTERIOR_ROOM_TYPES,
    'Documentos': ALL_DOCUMENT_CATEGORIES,
  };
};
