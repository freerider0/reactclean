/**
 * Configuration for required documents by property type
 * Maps property types to their mandatory documents
 */

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  apiSearchEndpoint?: string; // Endpoint to search for document online
  type: 'certificate' | 'cedula' | 'nota_simple' | 'escritura' | 'ibi' | 'other';
}

export interface PropertyTypeConfig {
  propertyType: string;
  displayName: string;
  requiredDocuments: RequiredDocument[];
}

/**
 * Required documents definitions
 */
export const REQUIRED_DOCUMENTS: Record<string, RequiredDocument> = {
  CERTIFICADO_ENERGETICO: {
    id: 'certificado_energetico',
    name: 'Certificado Energético',
    description: 'Certificado de Eficiencia Energética (CEE)',
    apiSearchEndpoint: '/api/documents/certificado-energetico',
    type: 'certificate',
  },
  CEDULA_HABITABILIDAD: {
    id: 'cedula_habitabilidad',
    name: 'Cédula de Habitabilidad',
    description: 'Documento que certifica que la vivienda cumple condiciones mínimas',
    apiSearchEndpoint: '/api/documents/cedula-habitabilidad',
    type: 'cedula',
  },
  NOTA_SIMPLE: {
    id: 'nota_simple',
    name: 'Nota Simple',
    description: 'Nota simple registral del inmueble',
    apiSearchEndpoint: '/api/documents/nota-simple',
    type: 'nota_simple',
  },
  ESCRITURA: {
    id: 'escritura',
    name: 'Escritura',
    description: 'Escritura de propiedad del inmueble',
    type: 'escritura',
  },
  RECIBO_IBI: {
    id: 'recibo_ibi',
    name: 'Recibo IBI',
    description: 'Último recibo del Impuesto sobre Bienes Inmuebles',
    apiSearchEndpoint: '/api/documents/recibo-ibi',
    type: 'ibi',
  },
};

/**
 * Property types and their required documents
 */
export const PROPERTY_TYPES_CONFIG: PropertyTypeConfig[] = [
  {
    propertyType: 'piso',
    displayName: 'Piso',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'casa',
    displayName: 'Casa',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'chalet',
    displayName: 'Chalet',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'apartamento',
    displayName: 'Apartamento',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'duplex',
    displayName: 'Dúplex',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'atico',
    displayName: 'Ático',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'estudio',
    displayName: 'Estudio',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.CEDULA_HABITABILIDAD,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'local',
    displayName: 'Local Comercial',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'oficina',
    displayName: 'Oficina',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.CERTIFICADO_ENERGETICO,
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'garaje',
    displayName: 'Garaje',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'trastero',
    displayName: 'Trastero',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
  {
    propertyType: 'terreno',
    displayName: 'Terreno',
    requiredDocuments: [
      REQUIRED_DOCUMENTS.NOTA_SIMPLE,
    ],
  },
];

/**
 * Get property type options for select inputs
 */
export function getPropertyTypeOptions(): Array<{ value: string; label: string }> {
  return PROPERTY_TYPES_CONFIG.map((config) => ({
    value: config.propertyType,
    label: config.displayName,
  }));
}

/**
 * Get required documents for a property type
 */
export function getRequiredDocuments(propertyType: string): RequiredDocument[] {
  const config = PROPERTY_TYPES_CONFIG.find(
    (config) => config.propertyType.toLowerCase() === propertyType.toLowerCase()
  );

  return config?.requiredDocuments || [];
}

/**
 * Get all property types
 */
export function getPropertyTypes(): PropertyTypeConfig[] {
  return PROPERTY_TYPES_CONFIG;
}

/**
 * Check if a document is uploaded
 */
export function isDocumentUploaded(
  requiredDoc: RequiredDocument,
  uploadedDocuments: any[]
): boolean {
  return uploadedDocuments.some(
    (doc) =>
      doc.classification?.category?.toLowerCase().includes(requiredDoc.name.toLowerCase()) ||
      doc.classification?.type === requiredDoc.type
  );
}
