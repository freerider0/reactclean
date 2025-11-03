import React, { useState, useEffect } from 'react';
import { MediaFile, MediaFileMetadata } from './types';
import { InlineEditField } from './InlineEditField';
import { CategoryBadges } from './CategoryBadges';
import { InlineEditTags } from './InlineEditTags';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MediaEditModalProps {
  file: MediaFile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: MediaFileMetadata) => void;
  categories?: string[];
}

export const MediaEditModal: React.FC<MediaEditModalProps> = ({
  file,
  isOpen,
  onClose,
  onSave,
  categories = [],
}) => {
  // Helper function to generate auto-tags from classification
  const generateAutoTags = (classification: any): string[] => {
    if (!classification) return [];

    const tags: string[] = [];

    // Add type tag
    if (classification.type === 'property_photo') {
      tags.push('Foto de propiedad');
    } else if (classification.type) {
      tags.push(classification.type.replace(/_/g, ' '));
    }

    // Add category tag
    if (classification.category) {
      tags.push(classification.category);
    }

    // Add room type tag
    if (classification.room_type) {
      tags.push(classification.room_type);
    }

    return tags;
  };

  // Initialize metadata state
  const [metadata, setMetadata] = useState<MediaFileMetadata>({
    // For property photos: use room_type, for documents: use classification.category
    category: file.metadata?.classification?.room_type
      || file.metadata?.classification?.category
      || file.metadata?.category
      || '',
    title: file.metadata?.title || file.file.name,
    description: file.metadata?.description || file.metadata?.classification?.reasoning || '',
    tags: file.metadata?.tags || generateAutoTags(file.metadata?.classification),
    alt: file.metadata?.classification?.alt || file.metadata?.alt || '',
  });

  // Update metadata when file changes
  useEffect(() => {
    setMetadata({
      // For property photos: use room_type, for documents: use classification.category
      category: file.metadata?.classification?.room_type
        || file.metadata?.classification?.category
        || file.metadata?.category
        || '',
      title: file.metadata?.title || file.file.name,
      description: file.metadata?.description || file.metadata?.classification?.reasoning || '',
      tags: file.metadata?.tags || generateAutoTags(file.metadata?.classification),
      alt: file.metadata?.classification?.alt || file.metadata?.alt || '',
    });
  }, [file]);

  const handleSaveAndClose = () => {
    onSave(metadata);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Cuando se cierra el modal (X o clic fuera), también guardamos
      onSave(metadata);
      onClose();
    }
  };

  const handleAddTag = (tag: string) => {
    setMetadata({
      ...metadata,
      tags: [...(metadata.tags || []), tag],
    });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata({
      ...metadata,
      tags: metadata.tags?.filter(tag => tag !== tagToRemove) || [],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar propiedades del archivo</DialogTitle>
        </DialogHeader>

        <DialogBody className="overflow-y-auto">
            {/* AI Classification Banner */}
            {file.metadata?.classification && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">
                      Campos rellenados automáticamente por IA
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confianza: {(file.metadata.classification.confidence * 100).toFixed(0)}% •
                      Tipo: {file.metadata.classification.type === 'property_photo' ? 'Foto de propiedad' : file.metadata.classification.type.replace(/_/g, ' ')}
                      {file.metadata.classification.room_type && ` • Estancia: ${file.metadata.classification.room_type}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preview */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5 px-2.5">
                  Vista previa
                </label>
                <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {file.type === 'image' && (
                    <img
                      src={file.previewUrl}
                      alt={metadata.title || file.file.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {file.type === 'video' && (
                    file.previewUrl.startsWith('data:') ||
                    file.previewUrl.startsWith('blob:') ? (
                      <img
                        src={file.previewUrl}
                        alt={metadata.title || file.file.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <svg
                        className="w-24 h-24 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )
                  )}
                  {file.type === 'audio' && (
                    <svg
                      className="w-24 h-24 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                  )}
                  {file.type === 'pdf' && (
                    file.previewUrl === 'pdf-placeholder' ? (
                      <svg
                        className="w-24 h-24 text-red-500 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
                      <img
                        src={file.previewUrl}
                        alt={metadata.title || file.file.name}
                        className="w-full h-full object-contain"
                      />
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate px-2.5">
                  {file.file.name}
                </p>
              </div>

              {/* Inline Edit Form */}
              <div className="space-y-4">
                {/* Category as badges */}
                <CategoryBadges
                  value={metadata.category || ''}
                  onSave={(newValue) => setMetadata({ ...metadata, category: newValue })}
                  isAIFilled={!!file.metadata?.classification}
                />

                {/* Title */}
                <InlineEditField
                  label="Título"
                  value={metadata.title || ''}
                  onSave={(newValue) => setMetadata({ ...metadata, title: newValue })}
                  placeholder="Click para agregar título..."
                  type="text"
                  isAIFilled={false}
                />

                {/* Alt text (for images and PDFs) */}
                {(file.type === 'image' || file.type === 'pdf') && (
                  <InlineEditField
                    label="Texto alternativo (Alt)"
                    value={metadata.alt || ''}
                    onSave={(newValue) => setMetadata({ ...metadata, alt: newValue })}
                    placeholder="Click para agregar texto alternativo..."
                    type="text"
                    isAIFilled={!!file.metadata?.classification?.alt}
                  />
                )}
              </div>
            </div>

            {/* Description (full width) */}
            <div className="mt-4">
              <InlineEditField
                label="Descripción"
                value={metadata.description || ''}
                onSave={(newValue) => setMetadata({ ...metadata, description: newValue })}
                placeholder="Click para agregar descripción..."
                type="textarea"
                rows={4}
                isAIFilled={!!file.metadata?.classification?.reasoning}
              />
            </div>

            {/* Tags */}
            <div className="mt-4">
              <InlineEditTags
                tags={metadata.tags || []}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                isAIGenerated={!!file.metadata?.classification}
              />
            </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={handleSaveAndClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaEditModal;
