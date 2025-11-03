import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MediaUploader } from '@/components/MediaUploader';
import type { MediaFile } from '@/components/MediaUploader';
import { useTenant } from '@/providers/tenant-provider';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Componente para mostrar un campo editable inline sin label redundante
interface CompactFieldProps {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  isAIFilled?: boolean;
  type?: 'text' | 'textarea';
  rows?: number;
  className?: string;
}

const CompactField: React.FC<CompactFieldProps> = ({
  value,
  placeholder,
  onSave,
  isAIFilled = false,
  type = 'text',
  rows = 1,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (type === 'text' && e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return type === 'textarea' ? (
      <textarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        rows={rows}
        autoFocus
        className={`w-full px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground ${className}`}
      />
    ) : (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`w-full px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer px-2 py-1 text-sm rounded hover:bg-muted/50 transition-colors min-h-[28px] flex items-center ${
        isAIFilled ? 'bg-primary/5 border border-primary/20' : ''
      } ${!value ? 'text-muted-foreground italic' : 'text-foreground'} ${className}`}
    >
      {value || placeholder}
    </div>
  );
};

export const NuevaPersonaCompactoPage: React.FC = () => {
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
      // Simular datos extraídos
      setPersonaData({
        tipoDocumento: 'DNI',
        numeroDocumento: '12345678A',
        nombre: 'Juan',
        apellidos: 'García Pérez',
        fechaNacimiento: '15/03/1985',
        nacionalidad: 'Española',
        email: 'juan.garcia@example.com',
        telefono: '+34 600 123 456',
        telefonoSecundario: '',
        direccion: 'Calle Mayor, 123, 3º B',
        ciudad: 'Madrid',
        provincia: 'Madrid',
        codigoPostal: '28001',
        pais: 'España',
        iban: 'ES00 0000 0000 0000 0000 0000',
        notas: '',
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Nueva Persona (Compacto) | Sistema Inmobiliario</title>
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
                Modo lectura compacto
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
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Documentos</CardTitle>
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

          {/* Columna Derecha: Cards Editables Compactas */}
          <div className="lg:col-span-2 space-y-4">
            {hasAIData && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-4 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span>Datos extraídos automáticamente por IA</span>
              </div>
            )}

            {/* Card: Identificación - Formato más visual */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Identificación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Nombre completo destacado */}
                <div className="border-b border-border pb-3">
                  <div className="flex items-baseline gap-2">
                    <CompactField
                      value={personaData.nombre}
                      placeholder="Nombre"
                      onSave={(value) => handleFieldChange('nombre', value)}
                      isAIFilled={hasAIData && !!personaData.nombre}
                      className="text-2xl font-bold flex-1"
                    />
                    <CompactField
                      value={personaData.apellidos}
                      placeholder="Apellidos"
                      onSave={(value) => handleFieldChange('apellidos', value)}
                      isAIFilled={hasAIData && !!personaData.apellidos}
                      className="text-2xl font-bold flex-1"
                    />
                  </div>
                </div>

                {/* Grid de datos de documento */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">Documento</div>
                    <CompactField
                      value={personaData.tipoDocumento}
                      placeholder="Tipo"
                      onSave={(value) => handleFieldChange('tipoDocumento', value)}
                      isAIFilled={hasAIData && !!personaData.tipoDocumento}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground mb-1">Número</div>
                    <CompactField
                      value={personaData.numeroDocumento}
                      placeholder="12345678A"
                      onSave={(value) => handleFieldChange('numeroDocumento', value)}
                      isAIFilled={hasAIData && !!personaData.numeroDocumento}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Nacimiento</div>
                    <CompactField
                      value={personaData.fechaNacimiento}
                      placeholder="DD/MM/AAAA"
                      onSave={(value) => handleFieldChange('fechaNacimiento', value)}
                      isAIFilled={hasAIData && !!personaData.fechaNacimiento}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground mb-1">Nacionalidad</div>
                    <CompactField
                      value={personaData.nacionalidad}
                      placeholder="Española"
                      onSave={(value) => handleFieldChange('nacionalidad', value)}
                      isAIFilled={hasAIData && !!personaData.nacionalidad}
                    />
                  </div>
                </div>
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
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="col-span-2">
                  <div className="text-muted-foreground mb-1">Email</div>
                  <CompactField
                    value={personaData.email}
                    placeholder="email@ejemplo.com"
                    onSave={(value) => handleFieldChange('email', value)}
                  />
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Teléfono principal</div>
                  <CompactField
                    value={personaData.telefono}
                    placeholder="+34 600 000 000"
                    onSave={(value) => handleFieldChange('telefono', value)}
                  />
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Teléfono secundario</div>
                  <CompactField
                    value={personaData.telefonoSecundario}
                    placeholder="+34 600 000 000"
                    onSave={(value) => handleFieldChange('telefonoSecundario', value)}
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
              <CardContent className="space-y-2 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1">Dirección completa</div>
                  <CompactField
                    value={personaData.direccion}
                    placeholder="Calle Principal, 123, 3º B"
                    onSave={(value) => handleFieldChange('direccion', value)}
                    isAIFilled={hasAIData && !!personaData.direccion}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <div className="text-muted-foreground mb-1">Ciudad</div>
                    <CompactField
                      value={personaData.ciudad}
                      placeholder="Madrid"
                      onSave={(value) => handleFieldChange('ciudad', value)}
                      isAIFilled={hasAIData && !!personaData.ciudad}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">C.P.</div>
                    <CompactField
                      value={personaData.codigoPostal}
                      placeholder="28001"
                      onSave={(value) => handleFieldChange('codigoPostal', value)}
                      isAIFilled={hasAIData && !!personaData.codigoPostal}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground mb-1">Provincia</div>
                    <CompactField
                      value={personaData.provincia}
                      placeholder="Madrid"
                      onSave={(value) => handleFieldChange('provincia', value)}
                      isAIFilled={hasAIData && !!personaData.provincia}
                    />
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">País</div>
                    <CompactField
                      value={personaData.pais}
                      placeholder="España"
                      onSave={(value) => handleFieldChange('pais', value)}
                    />
                  </div>
                </div>
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
              <CardContent className="text-xs">
                <div className="text-muted-foreground mb-1">IBAN</div>
                <CompactField
                  value={personaData.iban}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  onSave={(value) => handleFieldChange('iban', value)}
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
              <CardContent className="text-xs">
                <CompactField
                  value={personaData.notas}
                  placeholder="Información adicional sobre la persona..."
                  onSave={(value) => handleFieldChange('notas', value)}
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

export default NuevaPersonaCompactoPage;
