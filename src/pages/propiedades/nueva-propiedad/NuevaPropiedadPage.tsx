import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { MediaUploader } from '@/components/MediaUploader';
import type { MediaFile } from '@/components/MediaUploader';
import { InlineEditField } from '@/components/MediaUploader/InlineEditField';
import { DocumentList } from '@/components/DocumentList';
import { MediaGallery } from '@/components/MediaGallery';
import { useTenant } from '@/providers/tenant-provider';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Home, Sparkles, Building2, MapPin, Ruler, FileText, Euro, Camera, Users, Image } from 'lucide-react';
import type { UploadResult } from '@/services/storageService';
import { generatePropertyId } from '@/utils/uuid';
import { getPropertyTypeOptions } from '@/config/required-documents.config';

interface PropiedadData {
  // Identificación
  referencia: string;
  tipoPropiedad: string;

  // Ubicación
  direccion: string;
  numero: string;
  piso: string;
  puerta: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pais: string;

  // Características
  superficieConstruida: string;
  superficieUtil: string;
  habitaciones: string;
  banos: string;
  anosConstruccion: string;

  // Catastro
  referenciaCatastral: string;
  valorCatastral: string;

  // Precios
  precioCompra: string;
  precioVenta: string;
  precioAlquiler: string;

  // Estado
  estado: string;
  disponibilidad: string;

  // Notas
  descripcion: string;
  notasInternas: string;
}

export const NuevaPropiedadPage: React.FC = () => {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  // Generate a unique property ID that persists for this session
  const propertyId = useMemo(() => generatePropertyId(), []);

  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const [hasAIData, setHasAIData] = useState(false);
  const [propiedadData, setPropiedadData] = useState<PropiedadData>({
    referencia: '',
    tipoPropiedad: '',
    direccion: '',
    numero: '',
    piso: '',
    puerta: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    pais: 'España',
    superficieConstruida: '',
    superficieUtil: '',
    habitaciones: '',
    banos: '',
    anosConstruccion: '',
    referenciaCatastral: '',
    valorCatastral: '',
    precioCompra: '',
    precioVenta: '',
    precioAlquiler: '',
    estado: '',
    disponibilidad: '',
    descripcion: '',
    notasInternas: '',
  });

  // Categorías de documentos para propiedades
  const documentCategories = [
    'Escrituras',
    'Nota Simple',
    'Consulta Catastral',
    'Recibo IBI',
    'Certificado Energético',
    'Cédula de Habitabilidad',
    'Planos',
    'Contrato',
    'Otros',
  ];

  const handleFieldChange = (field: keyof PropiedadData, value: string) => {
    setPropiedadData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    console.log('🏠 Guardando propiedad con ID:', propertyId);
    console.log('📋 Datos de propiedad:', propiedadData);
    console.log('📁 Archivos subidos:', uploadedFiles.length);
    // TODO: Implementar guardado en base de datos con propertyId
  };

  const handleFileUploaded = (mediaFile: MediaFile) => {
    console.log('📤 File uploaded:', mediaFile);
    console.log('🎯 Classification:', mediaFile.metadata?.classification);

    // Convert MediaFile to UploadResult format
    const uploadResult: UploadResult = {
      success: true,
      url: mediaFile.supabaseUrl,
      path: mediaFile.supabasePath,
      thumbUrl: mediaFile.thumbUrl,
      aiUrl: mediaFile.aiUrl,
      aiPath: undefined, // Not needed for display
      thumbPath: undefined, // Not needed for display
      classification: mediaFile.metadata?.classification,
      category: mediaFile.metadata?.category,
    };

    console.log('📋 Upload result:', uploadResult);

    // Add the uploaded file to our list
    setUploadedFiles(prev => {
      const updated = [...prev, uploadResult];
      console.log('📚 Total uploaded files:', updated.length);
      console.log('📁 Files by type:', {
        documents: updated.filter(f =>
          ['identity_document', 'property_document', 'certificate', 'contract', 'technical_document']
          .includes(f.classification?.type || '')
        ).length,
        media: updated.filter(f => f.classification?.type === 'property_photo').length,
      });
      return updated;
    });

    // If we have classification data, mark that we have AI data
    if (uploadResult.classification) {
      setHasAIData(true);
      console.log('✅ AI data detected:', uploadResult.classification.type);
    }
  };

  const handleFileDeleted = (fileToDelete: UploadResult) => {
    // Remove the file from our list
    setUploadedFiles(prev => prev.filter(file => file.path !== fileToDelete.path));
    // TODO: Actually delete from storage
    console.log('Deleting file:', fileToDelete.path);
  };

  const handleFileView = (file: UploadResult) => {
    // Open the file in a new window/modal
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const handleFileDownload = (file: UploadResult) => {
    // Download the file
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.path?.split('/').pop() || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSearchOnline = async (document: any) => {
    console.log('🔍 Searching online for:', document.name);
    // TODO: Implement API call to search for document
    // This will call the endpoint specified in document.apiSearchEndpoint
    // with property data (referenciaCatastral, etc.)
    alert(`Buscando ${document.name} en registros oficiales...\n\nEsta funcionalidad se implementará con las APIs correspondientes.`);
  };

  const handleCreateDocument = (document: any) => {
    console.log('📄 Creating document:', document.name, document.id);

    // Si es el Certificado Energético, ir a la página de plano
    if (document.id === 'certificado_energetico') {
      console.log('🏗️ Navegando a la página de plano para crear certificado energético');
      console.log('🆔 Property ID:', propertyId);

      // Navigate to floorplan with property ID and data
      navigate('/floorplan', {
        state: {
          propertyId,
          propertyData: {
            direccion: propiedadData.direccion,
            numero: propiedadData.numero,
            piso: propiedadData.piso,
            ciudad: propiedadData.ciudad,
            referenciaCatastral: propiedadData.referenciaCatastral,
          },
          returnTo: '/propiedades/nueva',
        },
      });
      return;
    }

    // Para otros documentos, mostrar modal/formulario
    // TODO: Implement modals for other document types
    alert(`Crear/solicitar ${document.name}\n\nEsta funcionalidad abrirá un formulario para generar o solicitar el documento.`);
  };

  return (
    <>
      <Helmet>
        <title>Nueva Propiedad | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nueva Propiedad</h1>
              <p className="text-muted-foreground mt-1">
                Sube documentos y fotos. Los datos se extraerán automáticamente.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                ID: {propertyId}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </div>

        {/* File Upload - Ocupa todo el ancho */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Documentos y Fotos</CardTitle>
                <CardDescription>
                  Sube escrituras, notas simples, catastro, fotos... Los datos se extraerán automáticamente.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!tenant ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Cargando...</p>
              </div>
            ) : (
              <MediaUploader
                uploadToSupabase={true}
                uploadConfig={{
                  tenantId: tenant.bucket_name,
                  entityType: 'properties',
                  entityId: propertyId, // Use persistent property ID
                }}
                categories={documentCategories}
                maxFiles={50}
                maxFileSizeMB={25}
                acceptedTypes={['image', 'pdf']}
                dropzoneText="Arrastra documentos y fotos aquí"
                onUploadSuccess={handleFileUploaded}
              />
            )}
          </CardContent>
        </Card>

        {/* Tabs: Propiedad, Personas, Documentos, Multimedia */}
        <Tabs defaultValue="propiedad" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="propiedad" className="gap-2">
              <Building2 className="w-4 h-4" />
              Propiedad
            </TabsTrigger>
            <TabsTrigger value="personas" className="gap-2">
              <Users className="w-4 h-4" />
              Personas
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2">
              <FileText className="w-4 h-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="multimedia" className="gap-2">
              <Image className="w-4 h-4" />
              Multimedia
            </TabsTrigger>
          </TabsList>

          {/* Tab: Propiedad */}
          <TabsContent value="propiedad" className="space-y-6">
            {hasAIData && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-4 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span>Datos extraídos automáticamente por IA</span>
              </div>
            )}

            {/* Card: Identificación */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Identificación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <InlineEditField
                  label="Referencia Interna"
                  value={propiedadData.referencia}
                  onSave={(value) => handleFieldChange('referencia', value)}
                  placeholder="REF-001"
                />
                <InlineEditField
                  label="Tipo de Propiedad"
                  value={propiedadData.tipoPropiedad}
                  onSave={(value) => handleFieldChange('tipoPropiedad', value)}
                  placeholder="Selecciona tipo..."
                  type="select"
                  options={getPropertyTypeOptions()}
                  isAIFilled={hasAIData && !!propiedadData.tipoPropiedad}
                />
                <InlineEditField
                  label="Estado"
                  value={propiedadData.estado}
                  onSave={(value) => handleFieldChange('estado', value)}
                  placeholder="Nueva, Segunda mano..."
                />
                <InlineEditField
                  label="Disponibilidad"
                  value={propiedadData.disponibilidad}
                  onSave={(value) => handleFieldChange('disponibilidad', value)}
                  placeholder="Disponible, Reservada..."
                />
              </CardContent>
            </Card>

            {/* Card: Ubicación */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Ubicación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <InlineEditField
                    label="Calle"
                    value={propiedadData.direccion}
                    onSave={(value) => handleFieldChange('direccion', value)}
                    placeholder="Calle Mayor"
                    isAIFilled={hasAIData && !!propiedadData.direccion}
                  />
                </div>
                <InlineEditField
                  label="Número"
                  value={propiedadData.numero}
                  onSave={(value) => handleFieldChange('numero', value)}
                  placeholder="123"
                  isAIFilled={hasAIData && !!propiedadData.numero}
                />
                <InlineEditField
                  label="Piso"
                  value={propiedadData.piso}
                  onSave={(value) => handleFieldChange('piso', value)}
                  placeholder="3º"
                  isAIFilled={hasAIData && !!propiedadData.piso}
                />
                <InlineEditField
                  label="Puerta"
                  value={propiedadData.puerta}
                  onSave={(value) => handleFieldChange('puerta', value)}
                  placeholder="B"
                  isAIFilled={hasAIData && !!propiedadData.puerta}
                />
                <InlineEditField
                  label="Ciudad"
                  value={propiedadData.ciudad}
                  onSave={(value) => handleFieldChange('ciudad', value)}
                  placeholder="Madrid"
                  isAIFilled={hasAIData && !!propiedadData.ciudad}
                />
                <InlineEditField
                  label="Provincia"
                  value={propiedadData.provincia}
                  onSave={(value) => handleFieldChange('provincia', value)}
                  placeholder="Madrid"
                  isAIFilled={hasAIData && !!propiedadData.provincia}
                />
                <InlineEditField
                  label="Código Postal"
                  value={propiedadData.codigoPostal}
                  onSave={(value) => handleFieldChange('codigoPostal', value)}
                  placeholder="28001"
                  isAIFilled={hasAIData && !!propiedadData.codigoPostal}
                />
                <InlineEditField
                  label="País"
                  value={propiedadData.pais}
                  onSave={(value) => handleFieldChange('pais', value)}
                  placeholder="España"
                />
              </CardContent>
            </Card>

            {/* Card: Características */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Características</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <InlineEditField
                  label="Sup. Construida (m²)"
                  value={propiedadData.superficieConstruida}
                  onSave={(value) => handleFieldChange('superficieConstruida', value)}
                  placeholder="100"
                  isAIFilled={hasAIData && !!propiedadData.superficieConstruida}
                />
                <InlineEditField
                  label="Sup. Útil (m²)"
                  value={propiedadData.superficieUtil}
                  onSave={(value) => handleFieldChange('superficieUtil', value)}
                  placeholder="85"
                  isAIFilled={hasAIData && !!propiedadData.superficieUtil}
                />
                <InlineEditField
                  label="Habitaciones"
                  value={propiedadData.habitaciones}
                  onSave={(value) => handleFieldChange('habitaciones', value)}
                  placeholder="3"
                  isAIFilled={hasAIData && !!propiedadData.habitaciones}
                />
                <InlineEditField
                  label="Baños"
                  value={propiedadData.banos}
                  onSave={(value) => handleFieldChange('banos', value)}
                  placeholder="2"
                  isAIFilled={hasAIData && !!propiedadData.banos}
                />
                <div className="col-span-2">
                  <InlineEditField
                    label="Año de Construcción"
                    value={propiedadData.anosConstruccion}
                    onSave={(value) => handleFieldChange('anosConstruccion', value)}
                    placeholder="2010"
                    isAIFilled={hasAIData && !!propiedadData.anosConstruccion}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card: Datos Catastrales */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Datos Catastrales</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <InlineEditField
                    label="Referencia Catastral"
                    value={propiedadData.referenciaCatastral}
                    onSave={(value) => handleFieldChange('referenciaCatastral', value)}
                    placeholder="1234567AB1234B0001AA"
                    isAIFilled={hasAIData && !!propiedadData.referenciaCatastral}
                  />
                </div>
                <InlineEditField
                  label="Valor Catastral (€)"
                  value={propiedadData.valorCatastral}
                  onSave={(value) => handleFieldChange('valorCatastral', value)}
                  placeholder="150000"
                  isAIFilled={hasAIData && !!propiedadData.valorCatastral}
                />
              </CardContent>
            </Card>

            {/* Card: Precios */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Precios</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <InlineEditField
                  label="Precio de Compra (€)"
                  value={propiedadData.precioCompra}
                  onSave={(value) => handleFieldChange('precioCompra', value)}
                  placeholder="200000"
                />
                <InlineEditField
                  label="Precio de Venta (€)"
                  value={propiedadData.precioVenta}
                  onSave={(value) => handleFieldChange('precioVenta', value)}
                  placeholder="250000"
                />
                <div className="col-span-2">
                  <InlineEditField
                    label="Precio Alquiler Mensual (€)"
                    value={propiedadData.precioAlquiler}
                    onSave={(value) => handleFieldChange('precioAlquiler', value)}
                    placeholder="1200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card: Descripción y Notas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Descripción y Notas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <InlineEditField
                  label="Descripción Pública"
                  value={propiedadData.descripcion}
                  onSave={(value) => handleFieldChange('descripcion', value)}
                  placeholder="Descripción detallada de la propiedad para anuncios..."
                  type="textarea"
                  rows={3}
                />
                <InlineEditField
                  label="Notas Internas"
                  value={propiedadData.notasInternas}
                  onSave={(value) => handleFieldChange('notasInternas', value)}
                  placeholder="Notas privadas sobre la propiedad, contactos, observaciones..."
                  type="textarea"
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Personas */}
          <TabsContent value="personas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personas Relacionadas</CardTitle>
                <CardDescription>
                  Propietarios, inquilinos, contactos relacionados con esta propiedad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Próximamente</p>
                  <p className="text-sm">Aquí podrás gestionar las personas relacionadas con la propiedad</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Documentos */}
          <TabsContent value="documentos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>
                  Documentos de identidad, propiedad, certificados, contratos y documentos técnicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentList
                  documents={uploadedFiles}
                  propertyType={propiedadData.tipoPropiedad}
                  propertyData={{
                    referenciaCatastral: propiedadData.referenciaCatastral,
                    direccion: propiedadData.direccion,
                    ciudad: propiedadData.ciudad,
                  }}
                  onDelete={handleFileDeleted}
                  onDownload={handleFileDownload}
                  onSearchOnline={handleSearchOnline}
                  onCreateDocument={handleCreateDocument}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Multimedia */}
          <TabsContent value="multimedia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Multimedia</CardTitle>
                <CardDescription>
                  Fotos, videos, tours virtuales y planos del inmueble
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MediaGallery
                  media={uploadedFiles}
                  onDelete={handleFileDeleted}
                  onView={handleFileView}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Container>
    </>
  );
};

export default NuevaPropiedadPage;
