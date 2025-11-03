import { useState, useCallback, useRef } from 'react';
import { MediaFile, MediaFileType, MediaFileMetadata, DragState } from './types';
import {
  createPreviewUrl,
  generateFileId,
  validateFiles,
  getMediaType,
} from './utils';
import { uploadAndClassifyImage, UploadConfig } from '@/services/storageService';

interface UseMediaUploaderProps {
  acceptedTypes: MediaFileType[];
  maxFileSizeMB: number;
  maxFiles: number;
  uploadToSupabase?: boolean;
  uploadConfig?: UploadConfig; // Tenant/entity config (tenantId, entityType, entityId)
  onUpload?: (files: File[]) => Promise<void> | void;
  onUploadSuccess?: (file: MediaFile) => void;
  onRemove?: (fileId: string) => void;
  onReorder?: (files: MediaFile[]) => void;
  onEdit?: (fileId: string, metadata: MediaFileMetadata) => void;
  initialFiles?: MediaFile[];
}

export const useMediaUploader = ({
  acceptedTypes,
  maxFileSizeMB,
  maxFiles,
  uploadToSupabase = false,
  uploadConfig,
  onUpload,
  onUploadSuccess,
  onRemove,
  onReorder,
  onEdit,
  initialFiles = [],
}: UseMediaUploaderProps) => {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isOver: false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Procesa archivos y crea previews
   */
  const processFiles = useCallback(
    async (filesToProcess: File[]) => {
      // Validar archivos
      const { valid, errors: validationErrors } = validateFiles(
        filesToProcess,
        acceptedTypes,
        maxFileSizeMB
      );

      // Agregar errores de validación
      if (validationErrors.length > 0) {
        setErrors(prev => [
          ...prev,
          ...validationErrors.map(e => `${e.file.name}: ${e.error}`),
        ]);
      }

      // Verificar límite de archivos
      const availableSlots = maxFiles - files.length;
      const filesToAdd = valid.slice(0, availableSlots);

      if (valid.length > availableSlots) {
        setErrors(prev => [
          ...prev,
          `Solo se pueden agregar ${availableSlots} archivos más. Límite: ${maxFiles}`,
        ]);
      }

      // Crear MediaFiles con previews
      const newMediaFiles: MediaFile[] = [];

      for (const file of filesToAdd) {
        try {
          const previewUrl = await createPreviewUrl(file);
          const mediaType = getMediaType(file);

          if (!mediaType) {
            throw new Error('Tipo de archivo no soportado');
          }

          // Debug: Log preview URL for PDFs
          if (file.type === 'application/pdf') {
            console.log('📄 PDF Preview URL:', previewUrl.substring(0, 100) + '...');
            console.log('📄 PDF Media Type:', mediaType);
          }

          newMediaFiles.push({
            id: generateFileId(),
            file,
            type: mediaType,
            previewUrl,
            status: 'pending',
            progress: 0,
          });
        } catch (error) {
          setErrors(prev => [
            ...prev,
            `Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          ]);
        }
      }

      // Actualizar estado de archivos
      setFiles(prev => [...prev, ...newMediaFiles]);

      // Si uploadToSupabase está activado, subir a Supabase y clasificar
      if (uploadToSupabase && uploadConfig && newMediaFiles.length > 0) {
        // Subir cada archivo individualmente y actualizar progreso
        for (const mediaFile of newMediaFiles) {
          try {
            // Marcar como uploading
            setFiles(prev =>
              prev.map(mf =>
                mf.id === mediaFile.id
                  ? { ...mf, status: 'uploading' as const, progress: 50 }
                  : mf
              )
            );

            // Subir y clasificar
            const result = await uploadAndClassifyImage(mediaFile.file, uploadConfig);

            if (result.success && result.url) {
              // Log clasificación completa
              console.log('🎯 Clasificación:', result.classification);
              console.log('📁 URLs:', {
                original: result.url,
                ai: result.aiUrl,
                thumb: result.thumbUrl,
              });

              // Actualizar con éxito y categoría
              const updatedFile = {
                ...mediaFile,
                status: 'success' as const,
                progress: 100,
                supabaseUrl: result.url,
                supabasePath: result.path,
                thumbUrl: result.thumbUrl,
                aiUrl: result.aiUrl,
                metadata: {
                  ...mediaFile.metadata,
                  category: result.category || 'Otros',
                  classification: result.classification, // Guardar clasificación completa
                },
              };

              setFiles(prev =>
                prev.map(mf =>
                  mf.id === mediaFile.id ? updatedFile : mf
                )
              );

              // Llamar callback de onUploadSuccess
              if (onUploadSuccess) {
                onUploadSuccess(updatedFile);
              }
            } else {
              // Marcar como error
              setFiles(prev =>
                prev.map(mf =>
                  mf.id === mediaFile.id
                    ? {
                        ...mf,
                        status: 'error' as const,
                        error: result.error || 'Error al subir',
                      }
                    : mf
                )
              );

              setErrors(prev => [
                ...prev,
                `${mediaFile.file.name}: ${result.error || 'Error al subir'}`,
              ]);
            }
          } catch (error) {
            // Marcar como error
            setFiles(prev =>
              prev.map(mf =>
                mf.id === mediaFile.id
                  ? {
                      ...mf,
                      status: 'error' as const,
                      error: error instanceof Error ? error.message : 'Error al subir',
                    }
                  : mf
              )
            );

            setErrors(prev => [
              ...prev,
              `${mediaFile.file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            ]);
          }
        }

        // Llamar onUpload con los archivos subidos exitosamente
        if (onUpload) {
          const successfulFiles = newMediaFiles
            .map(mf => {
              const updatedFile = files.find(f => f.id === mf.id);
              return updatedFile?.status === 'success' ? mf.file : null;
            })
            .filter(Boolean) as File[];

          if (successfulFiles.length > 0) {
            await onUpload(successfulFiles);
          }
        }
      } else if (onUpload && newMediaFiles.length > 0) {
        // Flujo original: solo llamar onUpload sin Supabase
        try {
          await onUpload(newMediaFiles.map(mf => mf.file));

          // Marcar archivos como exitosos
          setFiles(prev =>
            prev.map(mf =>
              newMediaFiles.find(nmf => nmf.id === mf.id)
                ? { ...mf, status: 'success' as const, progress: 100 }
                : mf
            )
          );
        } catch (error) {
          // Marcar archivos como error
          setFiles(prev =>
            prev.map(mf =>
              newMediaFiles.find(nmf => nmf.id === mf.id)
                ? {
                    ...mf,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Error al subir',
                  }
                : mf
            )
          );

          setErrors(prev => [
            ...prev,
            `Error al subir archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          ]);
        }
      }
    },
    [files.length, maxFiles, acceptedTypes, maxFileSizeMB, uploadToSupabase, uploadConfig, onUpload, onUploadSuccess]
  );

  /**
   * Maneja la selección de archivos desde el input
   */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        processFiles(selectedFiles);
      }
      // Reset input value para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  /**
   * Maneja el drop de archivos
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      setDragState({ isDragging: false, isOver: false });

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  /**
   * Maneja el drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragging: true, isOver: true });
  }, []);

  /**
   * Maneja el drag enter
   */
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragging: true, isOver: true });
  }, []);

  /**
   * Maneja el drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ isDragging: false, isOver: false });
  }, []);

  /**
   * Remueve un archivo
   */
  const removeFile = useCallback(
    (fileId: string) => {
      setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === fileId);

        // Revocar URL de preview si no es placeholder
        if (fileToRemove && fileToRemove.previewUrl !== 'audio-placeholder') {
          URL.revokeObjectURL(fileToRemove.previewUrl);
        }

        return prev.filter(f => f.id !== fileId);
      });

      // Llamar callback de remove si existe
      if (onRemove) {
        onRemove(fileId);
      }
    },
    [onRemove]
  );

  /**
   * Abre el selector de archivos
   */
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Limpia un error específico
   */
  const clearError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Limpia todos los errores
   */
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Reordena los archivos
   */
  const reorderFiles = useCallback(
    (newFiles: MediaFile[]) => {
      setFiles(newFiles);

      // Llamar callback de reorder si existe
      if (onReorder) {
        onReorder(newFiles);
      }
    },
    [onReorder]
  );

  /**
   * Edita la metadata de un archivo
   * IMPORTANTE: Preservar classification para mantener los datos de IA
   */
  const editFileMetadata = useCallback(
    (fileId: string, metadata: MediaFileMetadata) => {
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? {
                ...file,
                metadata: {
                  ...metadata,
                  classification: file.metadata?.classification, // Preservar clasificación de IA
                }
              }
            : file
        )
      );

      // Llamar callback de edit si existe
      if (onEdit) {
        onEdit(fileId, metadata);
      }
    },
    [onEdit]
  );

  return {
    files,
    dragState,
    errors,
    editingFile,
    setEditingFile,
    fileInputRef,
    handleFileInput,
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    removeFile,
    openFileDialog,
    clearError,
    clearAllErrors,
    reorderFiles,
    editFileMetadata,
  };
};
