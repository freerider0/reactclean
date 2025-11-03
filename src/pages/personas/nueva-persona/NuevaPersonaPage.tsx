import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MediaUploader } from '@/components/MediaUploader';
import type { MediaFile } from '@/components/MediaUploader';
import { InlineEditField } from '@/components/MediaUploader/InlineEditField';
import { useTenant } from '@/providers/tenant-provider';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, User, Sparkles, IdCard, MapPin, Phone, CreditCard, FileText } from 'lucide-react';

interface PersonaData {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  nacionalidad: string;
  email: string;
  telefono: string;
  telefonoSecundario: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pais: string;
  iban: string;
  notas: string;
}

export const NuevaPersonaPage: React.FC = () => {
  const { tenant } = useTenant();
  const [documentos, setDocumentos] = useState<MediaFile[]>([]);
  const [hasAIData, setHasAIData] = useState(false);
  const [personaData, setPersonaData] = useState<PersonaData>({
    tipoDocumento: '',
    numeroDocumento: '',
    nombre: '',
    apellidos: '',
    fechaNacimiento: '',
    nacionalidad: '',
    email: '',
    telefono: '',
    telefonoSecundario: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    codigoPostal: '',
    pais: 'España',
    iban: '',
    notas: '',
  });

  const documentCategories = ['DNI', 'Pasaporte', 'NIE', 'Otros Documentos'];

  const handleFieldChange = (field: keyof PersonaData, value: string) => {
    setPersonaData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    console.log('Guardando persona:', personaData);
    console.log('Documentos:', documentos);
  };

  const handleFilesUploaded = (files: File[]) => {
    console.log('Documentos subidos:', files);
    if (files.length > 0) {
      setHasAIData(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Nueva Persona | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nueva Persona</h1>
              <p className="text-muted-foreground mt-1">
                Sube documentos y edita la información
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Uploader */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-base">Documentos</CardTitle>
                <CardDescription className="text-xs">
                  Sube DNI, pasaporte o NIE
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tenant ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>Cargando...</p>
                  </div>
                ) : (
                  <MediaUploader
                    uploadToSupabase={true}
                    uploadConfig={{
                      tenantId: tenant.bucket_name,
                      entityType: 'personas',
                      entityId: 'temp-' + Date.now(),
                    }}
                    categories={documentCategories}
                    maxFiles={10}
                    maxFileSizeMB={25}
                    acceptedTypes={['image', 'pdf']}
                    dropzoneText="Arrastra documentos aquí"
                    onUpload={handleFilesUploaded}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Cards Editables */}
          <div className="lg:col-span-2 space-y-6">
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
                  <IdCard className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Identificación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <InlineEditField
                  label="Tipo Documento"
                  value={personaData.tipoDocumento}
                  onSave={(value) => handleFieldChange('tipoDocumento', value)}
                  placeholder="DNI, Pasaporte..."
                  isAIFilled={hasAIData && !!personaData.tipoDocumento}
                />
                <InlineEditField
                  label="Número"
                  value={personaData.numeroDocumento}
                  onSave={(value) => handleFieldChange('numeroDocumento', value)}
                  placeholder="12345678A"
                  isAIFilled={hasAIData && !!personaData.numeroDocumento}
                />
                <InlineEditField
                  label="Nombre"
                  value={personaData.nombre}
                  onSave={(value) => handleFieldChange('nombre', value)}
                  placeholder="Juan"
                  isAIFilled={hasAIData && !!personaData.nombre}
                />
                <InlineEditField
                  label="Apellidos"
                  value={personaData.apellidos}
                  onSave={(value) => handleFieldChange('apellidos', value)}
                  placeholder="García Pérez"
                  isAIFilled={hasAIData && !!personaData.apellidos}
                />
                <InlineEditField
                  label="Fecha Nacimiento"
                  value={personaData.fechaNacimiento}
                  onSave={(value) => handleFieldChange('fechaNacimiento', value)}
                  placeholder="DD/MM/AAAA"
                  isAIFilled={hasAIData && !!personaData.fechaNacimiento}
                />
                <InlineEditField
                  label="Nacionalidad"
                  value={personaData.nacionalidad}
                  onSave={(value) => handleFieldChange('nacionalidad', value)}
                  placeholder="Española"
                  isAIFilled={hasAIData && !!personaData.nacionalidad}
                />
              </CardContent>
            </Card>

            {/* Card: Contacto */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Contacto</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <InlineEditField
                  label="Email"
                  value={personaData.email}
                  onSave={(value) => handleFieldChange('email', value)}
                  placeholder="email@ejemplo.com"
                />
                <InlineEditField
                  label="Teléfono"
                  value={personaData.telefono}
                  onSave={(value) => handleFieldChange('telefono', value)}
                  placeholder="+34 600 000 000"
                />
                <div className="col-span-2">
                  <InlineEditField
                    label="Teléfono Secundario"
                    value={personaData.telefonoSecundario}
                    onSave={(value) => handleFieldChange('telefonoSecundario', value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card: Dirección */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Dirección</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <InlineEditField
                    label="Dirección Completa"
                    value={personaData.direccion}
                    onSave={(value) => handleFieldChange('direccion', value)}
                    placeholder="Calle Principal, 123, 3º B"
                    isAIFilled={hasAIData && !!personaData.direccion}
                  />
                </div>
                <InlineEditField
                  label="Ciudad"
                  value={personaData.ciudad}
                  onSave={(value) => handleFieldChange('ciudad', value)}
                  placeholder="Madrid"
                  isAIFilled={hasAIData && !!personaData.ciudad}
                />
                <InlineEditField
                  label="Provincia"
                  value={personaData.provincia}
                  onSave={(value) => handleFieldChange('provincia', value)}
                  placeholder="Madrid"
                  isAIFilled={hasAIData && !!personaData.provincia}
                />
                <InlineEditField
                  label="Código Postal"
                  value={personaData.codigoPostal}
                  onSave={(value) => handleFieldChange('codigoPostal', value)}
                  placeholder="28001"
                  isAIFilled={hasAIData && !!personaData.codigoPostal}
                />
                <InlineEditField
                  label="País"
                  value={personaData.pais}
                  onSave={(value) => handleFieldChange('pais', value)}
                  placeholder="España"
                />
              </CardContent>
            </Card>

            {/* Card: Datos Bancarios */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Datos Bancarios</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <InlineEditField
                  label="IBAN"
                  value={personaData.iban}
                  onSave={(value) => handleFieldChange('iban', value)}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </CardContent>
            </Card>

            {/* Card: Notas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Notas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <InlineEditField
                  label="Información Adicional"
                  value={personaData.notas}
                  onSave={(value) => handleFieldChange('notas', value)}
                  placeholder="Notas sobre la persona..."
                  type="textarea"
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
};

export default NuevaPersonaPage;
