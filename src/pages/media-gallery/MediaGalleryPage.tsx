import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MediaUploader } from '@/components/MediaUploader';
import type { MediaFile } from '@/components/MediaUploader';
import { useTenant } from '@/providers/tenant-provider';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const MediaGalleryPage: React.FC = () => {
  const { tenant } = useTenant();
  const [galleryItems, setGalleryItems] = useState<MediaFile[]>([]);

  // Categorías disponibles (documentos inmobiliarios)
  const categories = [
    'DNI',
    'Pasaporte',
    'NIE',
    'Foto Propiedad',
    'Certificado Energético',
    'Cédula de Habitabilidad',
    'Escrituras',
    'Nota Simple',
    'Consulta Catastral',
    'IBI',
    'Contrato',
    'Planos',
    'Otros',
  ];

  return (
    <>
      <Helmet>
        <title>Galería Multimedia | Media Manager</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Galería Multimedia
              </h1>
              <p className="text-muted-foreground mt-2">
                Sube y gestiona tus archivos multimedia
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 items-center">
              <Card className="px-6 py-3">
                <div className="text-2xl font-bold text-primary">
                  {galleryItems.length}
                </div>
                <div className="text-xs text-muted-foreground">Archivos</div>
              </Card>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Uploader Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Subir Archivos</CardTitle>
                <CardDescription>
                  Arrastra archivos o haz clic para seleccionar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tenant ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Cargando información de la organización...</p>
                  </div>
                ) : (
                  <MediaUploader
                    uploadToSupabase={true}
                    uploadConfig={{
                      tenantId: tenant.bucket_name,
                      entityType: 'personas',
                      entityId: 'default',
                    }}
                    categories={categories}
                    maxFiles={10}
                    maxFileSizeMB={25}
                    acceptedTypes={['image', 'pdf']}
                    dropzoneText="Arrastra imágenes o PDFs de documentos aquí (se clasificarán automáticamente)"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-primary mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Formatos soportados
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Imágenes (JPG, PNG, GIF, WebP)
                        <br />
                        Documentos PDF
                        <br />
                        Videos (MP4, WebM, MOV)
                        <br />
                        Audio (MP3, WAV, OGG)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-500 dark:text-green-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Tamaño máximo
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        25MB por archivo
                        <br />
                        Hasta 10 archivos simultáneos
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-purple-500 dark:text-purple-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Vista previa instantánea
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visualiza tus archivos antes de subirlos
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Edición de metadatos
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Haz doble clic en una imagen para editar categoría, título y más
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">Próximamente</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Vista de galería
                </li>
                <li className="flex items-center gap-2">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Organización por álbumes
                </li>
                <li className="flex items-center gap-2">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Edición de imágenes
                </li>
                <li className="flex items-center gap-2">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Compartir archivos
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Cómo usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Selecciona archivos
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Arrastra archivos a la zona de carga o haz clic para
                    seleccionarlos
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 dark:bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Vista previa
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Revisa las miniaturas y verifica que todo esté correcto
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 dark:bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Listo</h4>
                  <p className="text-sm text-muted-foreground">
                    Los archivos se subirán automáticamente a tu galería
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default MediaGalleryPage;
