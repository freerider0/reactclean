import React from 'react';
import { Image, Trash2, Eye, Video, Camera, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import type { UploadResult } from '@/services/storageService';

interface MediaGalleryProps {
  media: UploadResult[];
  onDelete?: (item: UploadResult) => void;
  onView?: (item: UploadResult) => void;
  className?: string;
}

interface MediaSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: UploadResult[];
}

/**
 * Get room type label in Spanish
 */
const getRoomTypeLabel = (roomType: string | null | undefined): string => {
  if (!roomType) return '';

  const labels: Record<string, string> = {
    'salon': 'Salón',
    'cocina': 'Cocina',
    'dormitorio': 'Dormitorio',
    'bano': 'Baño',
    'exterior': 'Exterior',
    'terraza': 'Terraza',
    'jardin': 'Jardín',
    'piscina': 'Piscina',
    'garaje': 'Garaje',
    'entrada': 'Entrada',
    'pasillo': 'Pasillo',
    'despacho': 'Despacho',
    'trastero': 'Trastero',
    'balcon': 'Balcón',
    'azotea': 'Azotea',
    'plano': 'Plano',
    'fachada': 'Fachada',
  };

  return labels[roomType.toLowerCase()] || roomType;
};

/**
 * Categorize media into sections
 */
const categorizeMedia = (mediaItems: UploadResult[]): MediaSection[] => {
  const photos: UploadResult[] = [];
  const videos: UploadResult[] = [];
  const virtualTours: UploadResult[] = [];
  const floorplans: UploadResult[] = [];

  mediaItems.forEach((item) => {
    // Check if it's a property photo
    if (item.classification?.type === 'property_photo') {
      const roomType = item.classification.room_type?.toLowerCase() || '';
      const category = item.classification.category?.toLowerCase() || '';

      // Categorize as floorplan/drawing
      if (roomType.includes('plano') || category.includes('plano') || category.includes('drawing')) {
        floorplans.push(item);
      }
      // Categorize as video
      else if (category.includes('video') || roomType.includes('video')) {
        videos.push(item);
      }
      // Categorize as virtual tour
      else if (category.includes('tour') || category.includes('360') || roomType.includes('tour')) {
        virtualTours.push(item);
      }
      // Default: regular photo
      else {
        photos.push(item);
      }
    }
    // Fallback for unknown types with thumbnails (likely images)
    else if (item.classification?.type === 'unknown' && item.thumbUrl) {
      photos.push(item);
    }
  });

  return [
    { title: 'Fotos', icon: Camera, items: photos },
    { title: 'Videos', icon: Video, items: videos },
    { title: 'Tours Virtuales', icon: MapPin, items: virtualTours },
    { title: 'Planos', icon: Image, items: floorplans },
  ].filter(section => section.items.length > 0); // Only show sections with content
};

/**
 * MediaGallery component for displaying photos and media files
 */
export const MediaGallery: React.FC<MediaGalleryProps> = ({
  media,
  onDelete,
  onView,
  className,
}) => {
  // Filter to show only media (photos, videos, virtual tours, floorplans)
  const filteredMedia = media.filter(
    (item) => item.classification?.type === 'property_photo' ||
              (item.classification?.type === 'unknown' && item.thumbUrl)
  );

  // Show empty state if no media
  if (filteredMedia.length === 0) {
    return (
      <EmptyState
        icon={Image}
        message="No hay multimedia"
        description="Las fotos, videos, tours virtuales y planos del inmueble aparecerán aquí."
        className={className}
      />
    );
  }

  // Organize media into sections
  const sections = categorizeMedia(filteredMedia);

  // Render a single media item
  const renderMediaItem = (item: UploadResult, index: number) => {
    const roomLabel = getRoomTypeLabel(item.classification?.room_type);
    const category = item.classification?.category || item.category;

    return (
      <div
        key={item.path || index}
        className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
      >
        {/* Thumbnail */}
        <img
          src={item.thumbUrl || item.url}
          alt={item.classification?.alt || category || 'Imagen de propiedad'}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {/* View button */}
          {onView && (
            <button
              onClick={() => onView(item)}
              className="p-2 rounded-md bg-white/90 hover:bg-white text-foreground transition-colors"
              title="Ver imagen"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="p-2 rounded-md bg-destructive/90 hover:bg-destructive text-destructive-foreground transition-colors"
              title="Eliminar imagen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Label */}
        {(roomLabel || category) && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-xs font-medium text-white truncate">
              {roomLabel || category}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-8', className)}>
      {sections.map((section, sectionIndex) => {
        const IconComponent = section.icon;
        return (
          <div key={sectionIndex}>
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
              <IconComponent className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                {section.title}
              </h3>
              <span className="text-sm text-muted-foreground">
                ({section.items.length})
              </span>
            </div>

            {/* Section Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {section.items.map((item, index) => renderMediaItem(item, index))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MediaGallery;
