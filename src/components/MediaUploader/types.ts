import type { UploadConfig, ClassificationResult } from '@/services/storageService';

export type MediaFileType = 'image' | 'video' | 'audio' | 'pdf';

export interface MediaFileMetadata {
  category?: string;
  title?: string;
  description?: string;
  tags?: string[];
  alt?: string;
  classification?: ClassificationResult;
}

export interface MediaFile {
  id: string;
  file: File;
  type: MediaFileType;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  metadata?: MediaFileMetadata;
  supabaseUrl?: string; // URL pública de Supabase Storage (original/4K)
  supabasePath?: string; // Path en Supabase Storage
  thumbUrl?: string; // URL del thumbnail (400px)
  aiUrl?: string; // URL de la versión AI (768px)
}

export interface MediaUploaderProps {
  /**
   * Tipos de archivos permitidos
   * @default ['image', 'video', 'audio']
   */
  acceptedTypes?: MediaFileType[];

  /**
   * Tamaño máximo de archivo en MB
   * @default 10
   */
  maxFileSizeMB?: number;

  /**
   * Número máximo de archivos
   * @default 5
   */
  maxFiles?: number;

  /**
   * Subir automáticamente a Supabase y clasificar
   * @default false
   */
  uploadToSupabase?: boolean;

  /**
   * Configuración para subida a Supabase
   * Incluye tenantId, entityType (properties/personas), entityId
   */
  uploadConfig?: UploadConfig;

  /**
   * Callback cuando se suben archivos
   */
  onUpload?: (files: File[]) => Promise<void> | void;

  /**
   * Callback cuando un archivo se sube exitosamente a Supabase
   * Incluye la clasificación y URLs generadas
   */
  onUploadSuccess?: (file: MediaFile) => void;

  /**
   * Callback cuando se remueven archivos
   */
  onRemove?: (fileId: string) => void;

  /**
   * Callback cuando se reordenan archivos
   */
  onReorder?: (files: MediaFile[]) => void;

  /**
   * Callback cuando se edita metadata de un archivo
   */
  onEdit?: (fileId: string, metadata: MediaFileMetadata) => void;

  /**
   * Categorías disponibles para seleccionar
   */
  categories?: string[];

  /**
   * Archivos iniciales
   */
  initialFiles?: MediaFile[];

  /**
   * Deshabilitar el componente
   */
  disabled?: boolean;

  /**
   * Texto personalizado para la zona de drop
   */
  dropzoneText?: string;

  /**
   * Mostrar lista de archivos
   * @default true
   */
  showFileList?: boolean;
}

export interface DragState {
  isDragging: boolean;
  isOver: boolean;
}
