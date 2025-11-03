import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { MediaUploaderProps, MediaFile } from './types';
import { useMediaUploader } from './useMediaUploader';
import { formatFileSize, getAcceptString } from './utils';
import { MediaEditModal } from './MediaEditModal';

/**
 * Componente para cada item sortable
 */
interface SortableFileCardProps {
  file: MediaFile;
  onRemove: (fileId: string) => void;
  onEdit: (file: MediaFile) => void;
}

const SortableFileCard: React.FC<SortableFileCardProps> = ({ file, onRemove, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  // Wrapper style (como en el ejemplo oficial)
  const wrapperStyle = {
    transform: `translate3d(${transform ? Math.round(transform.x) : 0}px, ${transform ? Math.round(transform.y) : 0}px, 0) scaleX(${transform?.scaleX ?? 1}) scaleY(${transform?.scaleY ?? 1})`,
    transformOrigin: '0 0',
    transition,
  } as React.CSSProperties;

  // Inner style (como en el ejemplo oficial)
  const innerStyle = {
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 0 : undefined,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={wrapperStyle}
      className="touch-manipulation"
    >
      <div
        style={innerStyle}
        className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all"
      >
      {/* Preview Image/Icon */}
      <div
        {...attributes}
        {...listeners}
        onDoubleClick={() => onEdit(file)}
        className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative cursor-move"
      >
        {file.type === 'image' && (
          <img
            src={file.previewUrl}
            alt={file.metadata?.classification?.alt || file.file.name}
            className="w-full h-full object-cover"
          />
        )}
        {file.type === 'video' && (
          file.previewUrl.startsWith('data:') ||
          file.previewUrl.startsWith('blob:') ? (
            <img
              src={file.previewUrl}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-500"
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
            className="w-12 h-12 text-gray-400 dark:text-gray-500"
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
              className="w-12 h-12 text-red-500 dark:text-red-400"
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
              alt={file.file.name}
              className="w-full h-full object-contain"
            />
          )
        )}

        {/* Status Badge */}
        {file.status === 'success' && (
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {file.status === 'error' && (
          <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(file.id);
          }}
          disabled={file.status === 'uploading'}
          className={`
            absolute top-2 left-2 w-6 h-6 rounded-full z-10
            bg-red-500 text-white opacity-0 group-hover:opacity-100
            flex items-center justify-center
            transition-opacity hover:bg-red-600
            ${file.status === 'uploading' ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Progress Bar */}
        {file.status === 'uploading' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="p-2">
        {/* Show classification if available, otherwise show filename */}
        {file.metadata?.classification ? (
          <>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
              {file.metadata.classification.room_type || file.metadata.classification.category}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {file.metadata.classification.type === 'property_photo'
                ? file.metadata.classification.category
                : file.metadata.classification.type.replace('_', ' ')}
            </p>
          </>
        ) : (
          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={file.file.name}>
            {file.file.name}
          </p>
        )}
        <div className="flex items-center justify-between mt-1">
          {!file.metadata?.classification && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(file.file.size)}
            </p>
          )}
          {file.status === 'uploading' && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {file.progress}%
            </p>
          )}
        </div>
        {file.status === 'error' && file.error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate" title={file.error}>
            {file.error}
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

// Configuración de la animación de drop (igual que el ejemplo oficial)
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  acceptedTypes = ['image', 'video', 'audio'],
  maxFileSizeMB = 10,
  maxFiles = 5,
  uploadToSupabase = false,
  uploadConfig,
  onUpload,
  onUploadSuccess,
  onRemove,
  onReorder,
  onEdit,
  categories = [],
  initialFiles = [],
  disabled = false,
  dropzoneText = 'Arrastra archivos aquí o haz clic para seleccionar',
  showFileList = true,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
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
    reorderFiles,
    editFileMetadata,
  } = useMediaUploader({
    acceptedTypes,
    maxFileSizeMB,
    maxFiles,
    uploadToSupabase,
    uploadConfig,
    onUpload,
    onUploadSuccess,
    onRemove,
    onReorder,
    onEdit,
    initialFiles,
  });

  const activeFile = activeId ? files.find(f => f.id === activeId) : null;

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere mover 8px antes de activar el drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Manejar el inicio del drag
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Manejar el final del drag
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((file) => file.id === active.id);
      const newIndex = files.findIndex((file) => file.id === over.id);

      const newFiles = arrayMove(files, oldIndex, newIndex);
      reorderFiles(newFiles);
    }

    setActiveId(null);
  };

  return (
    <div className="w-full">
      {/* Dropzone con contenido integrado */}
      <div
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6
          transition-all duration-200 min-h-[320px]
          ${
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed'
              : dragState.isOver
              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }
        `}
      >
        {/* Input oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptString(acceptedTypes)}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {/* Overlay de drag */}
        {dragState.isOver && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg flex items-center justify-center pointer-events-none z-20">
            <div className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
              <p className="text-lg font-medium">Suelta los archivos aquí</p>
            </div>
          </div>
        )}

        {/* Contenido cuando NO hay archivos */}
        {files.length === 0 && (
          <div
            onClick={disabled ? undefined : openFileDialog}
            className="h-full min-h-[280px] flex flex-col items-center justify-center gap-4 cursor-pointer"
          >
            {/* Icono */}
            <div
              className={`
                w-20 h-20 rounded-full flex items-center justify-center
                transition-colors
                ${
                  disabled
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : dragState.isOver
                    ? 'bg-blue-500 dark:bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
            >
              <svg
                className={`w-10 h-10 ${
                  disabled
                    ? 'text-gray-400 dark:text-gray-500'
                    : dragState.isOver
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {/* Texto */}
            <div className="text-center">
              <p
                className={`text-base font-medium ${
                  disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {dropzoneText}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {acceptedTypes.join(', ')} - Máx. {maxFileSizeMB}MB por archivo
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Hasta {maxFiles} archivos
              </p>
            </div>
          </div>
        )}

        {/* Contenido cuando HAY archivos */}
        {showFileList && files.length > 0 && (
          <div className="space-y-4">
            {/* Header con contador */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Archivos seleccionados ({files.length}/{maxFiles})
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  Arrastra para reordenar
                </div>
              </div>
              {files.length < maxFiles && !disabled && (
                <button
                  onClick={openFileDialog}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Añadir más
                </button>
              )}
            </div>

            {/* Grid de archivos con DnD */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={files.map(f => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {files.map(file => (
                    <SortableFileCard
                      key={file.id}
                      file={file}
                      onRemove={removeFile}
                      onEdit={setEditingFile}
                    />
                  ))}

                  {/* Add More Card */}
                  {files.length < maxFiles && !disabled && (
                    <button
                      onClick={openFileDialog}
                      className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 dark:group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                        <svg
                          className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Añadir más
                      </p>
                    </button>
                  )}
                </div>
              </SortableContext>

              <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
                {activeFile ? (
                  <div
                    className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl"
                    style={{
                      opacity: 1,
                      cursor: 'grabbing'
                    }}
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
                      {activeFile.type === 'image' && (
                        <img
                          src={activeFile.previewUrl}
                          alt={activeFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {activeFile.type === 'video' && (
                        activeFile.previewUrl.startsWith('data:') ||
                        activeFile.previewUrl.startsWith('blob:') ? (
                          <img
                            src={activeFile.previewUrl}
                            alt={activeFile.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-12 h-12 text-gray-400 dark:text-gray-500"
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
                      {activeFile.type === 'audio' && (
                        <svg
                          className="w-12 h-12 text-gray-400 dark:text-gray-500"
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
                      {activeFile.type === 'pdf' && (
                        activeFile.previewUrl === 'pdf-placeholder' ? (
                          <svg
                            className="w-12 h-12 text-red-500 dark:text-red-400"
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
                            src={activeFile.previewUrl}
                            alt={activeFile.file.name}
                            className="w-full h-full object-contain"
                          />
                        )
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {activeFile.file.name}
                      </p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {/* Errores */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2"
            >
              <svg
                className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
              <button
                onClick={() => clearError(index)}
                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      {editingFile && (
        <MediaEditModal
          file={editingFile}
          isOpen={!!editingFile}
          onClose={() => setEditingFile(null)}
          onSave={(metadata) => {
            editFileMetadata(editingFile.id, metadata);
          }}
          categories={categories}
        />
      )}
    </div>
  );
};

export default MediaUploader;
