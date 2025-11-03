// Componente principal
export { MediaUploader, default } from './MediaUploader';

// Modal de edición
export { MediaEditModal } from './MediaEditModal';

// Componentes inline de edición
export { InlineEditField } from './InlineEditField';
export { CategoryBadges } from './CategoryBadges';
export { InlineEditTags } from './InlineEditTags';

// Hook personalizado (por si se quiere usar standalone)
export { useMediaUploader } from './useMediaUploader';

// Tipos
export type {
  MediaFile,
  MediaFileType,
  MediaFileMetadata,
  MediaUploaderProps,
  DragState,
} from './types';

// Utilidades (por si se necesitan externamente)
export {
  getMediaType,
  isFileTypeAccepted,
  isFileSizeValid,
  createPreviewUrl,
  formatFileSize,
  generateFileId,
  getAcceptString,
  validateFiles,
} from './utils';

// Constantes de clasificación
export {
  DOCUMENT_TYPES,
  PHOTO_CATEGORIES,
  ROOM_TYPES,
  DOCUMENT_CATEGORIES,
  MAIN_CATEGORIES,
  ALL_ROOM_TYPES,
  INTERIOR_ROOM_TYPES,
  EXTERIOR_ROOM_TYPES,
  ALL_DOCUMENT_CATEGORIES,
  IDENTITY_DOCUMENT_CATEGORIES,
  PROPERTY_DOCUMENT_CATEGORIES,
  CERTIFICATE_CATEGORIES,
  CONTRACT_CATEGORIES,
  TECHNICAL_DOCUMENT_CATEGORIES,
  getGroupedCategories,
  getSubcategories,
  getMainCategoryFromSubcategory,
} from './classificationConstants';
