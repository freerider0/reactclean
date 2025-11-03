import React, { useState } from 'react';
import { MediaUploader } from './MediaUploader';
import type { MediaFile } from './types';

/**
 * Componente de ejemplo que muestra cómo usar MediaUploader
 * Este archivo es solo para demostración y puede ser eliminado en producción
 */
export const MediaUploaderExample: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Simula la subida de archivos a un servidor
   * En producción, reemplaza esto con tu lógica real de subida
   */
  const handleUpload = async (files: File[]) => {
    setIsUploading(true);

    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Ejemplo 1: Subida simple con fetch
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // Descomentar cuando tengas un endpoint real
      /*
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir archivos');
      }

      const data = await response.json();
      */

      // Por ahora, solo guardamos los nombres de los archivos
      const fileNames = files.map(f => f.name);
      setUploadedFiles(prev => [...prev, ...fileNames]);

      console.log('Archivos subidos:', files);
    } catch (error) {
      console.error('Error en la subida:', error);
      throw error; // El componente mostrará el error
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (fileId: string) => {
    console.log('Archivo removido:', fileId);
    // Aquí puedes agregar lógica para eliminar del servidor
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          MediaUploader - Ejemplo de Uso
        </h1>
        <p className="text-gray-600">
          Componente para subir archivos multimedia con drag & drop y vista previa
        </p>
      </div>

      {/* Ejemplo 1: Uso básico */}
      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ejemplo 1: Uso Básico
        </h2>
        <p className="text-gray-600 mb-4">
          Todos los tipos de archivos multimedia, máximo 5 archivos de 10MB cada uno.
        </p>

        <MediaUploader
          onUpload={handleUpload}
          onRemove={handleRemove}
          maxFiles={5}
          maxFileSizeMB={10}
        />

        {isUploading && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">Subiendo archivos...</p>
          </div>
        )}
      </section>

      {/* Ejemplo 2: Solo imágenes */}
      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ejemplo 2: Solo Imágenes
        </h2>
        <p className="text-gray-600 mb-4">
          Máximo 3 imágenes de 5MB cada una.
        </p>

        <MediaUploader
          acceptedTypes={['image']}
          maxFiles={3}
          maxFileSizeMB={5}
          dropzoneText="Arrastra tus imágenes aquí o haz clic para seleccionar"
          onUpload={handleUpload}
        />
      </section>

      {/* Ejemplo 3: Videos */}
      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ejemplo 3: Solo Videos
        </h2>
        <p className="text-gray-600 mb-4">
          Máximo 2 videos de 50MB cada uno.
        </p>

        <MediaUploader
          acceptedTypes={['video']}
          maxFiles={2}
          maxFileSizeMB={50}
          dropzoneText="Arrastra tus videos aquí"
          onUpload={handleUpload}
        />
      </section>

      {/* Ejemplo 4: Compacto sin lista */}
      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ejemplo 4: Modo Compacto
        </h2>
        <p className="text-gray-600 mb-4">
          Sin lista de archivos, solo la zona de drop.
        </p>

        <MediaUploader
          showFileList={false}
          maxFiles={10}
          onUpload={async (files) => {
            console.log('Archivos seleccionados:', files);
            await handleUpload(files);
          }}
        />
      </section>

      {/* Ejemplo 5: Deshabilitado */}
      <section className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ejemplo 5: Estado Deshabilitado
        </h2>
        <p className="text-gray-600 mb-4">
          Componente deshabilitado.
        </p>

        <MediaUploader
          disabled={true}
          dropzoneText="Componente deshabilitado"
        />
      </section>

      {/* Resumen de archivos subidos */}
      {uploadedFiles.length > 0 && (
        <section className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Archivos Subidos Exitosamente
          </h3>
          <ul className="space-y-2">
            {uploadedFiles.map((fileName, index) => (
              <li key={index} className="flex items-center gap-2 text-green-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {fileName}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Código de ejemplo */}
      <section className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Código de Ejemplo
        </h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
          {`import { MediaUploader } from '@/components/MediaUploader';

function MyComponent() {
  const handleUpload = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Error al subir');
  };

  return (
    <MediaUploader
      onUpload={handleUpload}
      maxFiles={5}
      maxFileSizeMB={10}
    />
  );
}`}
        </pre>
      </section>
    </div>
  );
};

export default MediaUploaderExample;
