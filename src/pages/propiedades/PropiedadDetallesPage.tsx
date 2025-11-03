import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MapaOL, GoogleMapsEmbed } from '@/components/maps';
import {
  Home,
  Edit,
  Trash2,
  MapPin,
  Ruler,
  Bed,
  Bath,
  Calendar,
  Euro,
  FileText,
  Image as ImageIcon,
  Users,
  ArrowLeft,
  Building2,
  Map,
  Download,
  Share2,
} from 'lucide-react';

// Mock data - esto vendría de la base de datos
const mockPropiedades = [
  {
    id: '1',
    referencia: 'PROP-001',
    tipo: 'Piso',
    direccion: 'Calle Mayor, 123',
    numero: '123',
    piso: '3º',
    puerta: 'B',
    ciudad: 'Madrid',
    provincia: 'Madrid',
    codigoPostal: '28001',
    pais: 'España',
    precio: 250000,
    precioAlquiler: 1200,
    habitaciones: 3,
    banos: 2,
    superficie: 100,
    superficieUtil: 85,
    anosConstruccion: 2010,
    estado: 'Disponible',
    disponibilidad: 'Venta',
    referenciaCatastral: '1234567AB1234B0001AA',
    valorCatastral: 150000,
    descripcion: 'Amplio piso en el centro de Madrid, completamente reformado y con excelentes acabados. Orientación sur, muy luminoso.',
    notasInternas: 'Propietario dispuesto a negociar. Contactar con María (666123456)',
    // Coordenadas UTM Zone 31N (EPSG:25831) - Centro de Madrid
    coordenadasUTM: { x: 440720, y: 4474650 },
    fotos: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
    ],
    documentos: [
      { nombre: 'Escritura.pdf', categoria: 'Escrituras', fecha: '2024-01-15' },
      { nombre: 'Nota_Simple.pdf', categoria: 'Nota Simple', fecha: '2024-01-20' },
      { nombre: 'IBI_2024.pdf', categoria: 'Recibo IBI', fecha: '2024-02-01' },
    ],
  },
  {
    id: '2',
    referencia: 'PROP-002',
    tipo: 'Casa',
    direccion: 'Avenida de la Constitución, 45',
    numero: '45',
    piso: '',
    puerta: '',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    codigoPostal: '08001',
    pais: 'España',
    precio: 450000,
    precioAlquiler: 2500,
    habitaciones: 4,
    banos: 3,
    superficie: 180,
    superficieUtil: 160,
    anosConstruccion: 2015,
    estado: 'Disponible',
    disponibilidad: 'Venta y Alquiler',
    referenciaCatastral: '7654321BA4321B0001BB',
    valorCatastral: 300000,
    descripcion: 'Casa unifamiliar en zona residencial tranquila, con jardín y piscina. Perfecta para familias.',
    notasInternas: 'Revisar instalación eléctrica antes de mostrar',
    // Coordenadas UTM Zone 31N (EPSG:25831) - Centro de Barcelona
    coordenadasUTM: { x: 430000, y: 4582000 },
    fotos: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
    ],
    documentos: [
      { nombre: 'Escritura.pdf', categoria: 'Escrituras', fecha: '2024-02-10' },
    ],
  },
];

export const PropiedadDetallesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

  // Buscar la propiedad por ID
  const propiedad = mockPropiedades.find((p) => p.id === id);

  if (!propiedad) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Propiedad no encontrada</h3>
            <p className="text-muted-foreground mb-4">
              La propiedad que buscas no existe o ha sido eliminada
            </p>
            <Button onClick={() => navigate('/propiedades')}>
              Volver al listado
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{propiedad.referencia} - {propiedad.tipo} | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header con navegación */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/propiedades')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al listado
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-sm">
                  {propiedad.referencia}
                </Badge>
                <Badge
                  variant={propiedad.estado === 'Disponible' ? 'default' : 'secondary'}
                >
                  {propiedad.estado}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {propiedad.tipo} en {propiedad.ciudad}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {propiedad.direccion}, {propiedad.piso && `${propiedad.piso} `}
                  {propiedad.puerta && propiedad.puerta}, {propiedad.ciudad}, {propiedad.codigoPostal}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
              <Link to={`/propiedades/${id}/edit`}>
                <Button size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Precio destacado */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Precio de Venta</p>
                <p className="text-4xl font-bold text-primary">
                  €{propiedad.precio.toLocaleString()}
                </p>
              </div>
              {propiedad.precioAlquiler && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Alquiler Mensual</p>
                  <p className="text-2xl font-semibold">
                    €{propiedad.precioAlquiler.toLocaleString()}/mes
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Características rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{propiedad.superficie}m²</p>
                  <p className="text-xs text-muted-foreground">Superficie</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {propiedad.habitaciones > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bed className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{propiedad.habitaciones}</p>
                    <p className="text-xs text-muted-foreground">Habitaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bath className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{propiedad.banos}</p>
                  <p className="text-xs text-muted-foreground">Baños</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{propiedad.anosConstruccion}</p>
                  <p className="text-xs text-muted-foreground">Año</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs con información detallada */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="ubicacion" className="gap-2">
              <Map className="w-4 h-4" />
              Ubicación
            </TabsTrigger>
            <TabsTrigger value="fotos" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Fotos ({propiedad.fotos.length})
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2">
              <FileText className="w-4 h-4" />
              Documentos ({propiedad.documentos.length})
            </TabsTrigger>
            <TabsTrigger value="personas" className="gap-2">
              <Users className="w-4 h-4" />
              Personas
            </TabsTrigger>
          </TabsList>

          {/* Tab: General */}
          <TabsContent value="general" className="space-y-6">
            {/* Descripción */}
            <Card>
              <CardHeader>
                <CardTitle>Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {propiedad.descripcion}
                </p>
              </CardContent>
            </Card>

            {/* Características */}
            <Card>
              <CardHeader>
                <CardTitle>Características</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                    <p className="font-semibold">{propiedad.tipo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sup. Construida</p>
                    <p className="font-semibold">{propiedad.superficie}m²</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sup. Útil</p>
                    <p className="font-semibold">{propiedad.superficieUtil}m²</p>
                  </div>
                  {propiedad.habitaciones > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Habitaciones</p>
                      <p className="font-semibold">{propiedad.habitaciones}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Baños</p>
                    <p className="font-semibold">{propiedad.banos}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Año Construcción</p>
                    <p className="font-semibold">{propiedad.anosConstruccion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datos Catastrales */}
            <Card>
              <CardHeader>
                <CardTitle>Datos Catastrales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Referencia Catastral</p>
                    <p className="font-mono text-sm">{propiedad.referenciaCatastral}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valor Catastral</p>
                    <p className="font-semibold">€{propiedad.valorCatastral.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notas Internas */}
            <Card>
              <CardHeader>
                <CardTitle>Notas Internas</CardTitle>
                <CardDescription>Solo visible para el equipo interno</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{propiedad.notasInternas}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Ubicación */}
          <TabsContent value="ubicacion" className="space-y-6">
            {/* Información de dirección */}
            <Card>
              <CardHeader>
                <CardTitle>Dirección</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Dirección</p>
                    <p className="font-semibold">{propiedad.direccion}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Número</p>
                    <p className="font-semibold">{propiedad.numero}</p>
                  </div>
                  {propiedad.piso && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Piso</p>
                      <p className="font-semibold">{propiedad.piso}</p>
                    </div>
                  )}
                  {propiedad.puerta && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Puerta</p>
                      <p className="font-semibold">{propiedad.puerta}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ciudad</p>
                    <p className="font-semibold">{propiedad.ciudad}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Provincia</p>
                    <p className="font-semibold">{propiedad.provincia}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Código Postal</p>
                    <p className="font-semibold">{propiedad.codigoPostal}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">País</p>
                    <p className="font-semibold">{propiedad.pais}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mapa OpenLayers con tiles del IGN (ortofotos españolas) */}
            <Card>
              <CardHeader>
                <CardTitle>Ortofoto (IGN)</CardTitle>
                <CardDescription>
                  Vista aérea de la propiedad con ortofotos del Instituto Geográfico Nacional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <MapaOL
                    center={propiedad.coordenadasUTM}
                    zoom={18}
                    showLayerControl={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Google Maps Embed */}
            <GoogleMapsEmbed
              coordenadas={propiedad.coordenadasUTM}
              direccion={`${propiedad.direccion}, ${propiedad.ciudad}`}
              refcat={propiedad.referenciaCatastral}
            />
          </TabsContent>

          {/* Tab: Fotos */}
          <TabsContent value="fotos">
            <Card>
              <CardHeader>
                <CardTitle>Galería de Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {propiedad.fotos.map((foto, index) => (
                    <div
                      key={index}
                      className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Documentos */}
          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {propiedad.documentos.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{doc.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.categoria} • {doc.fecha}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Personas */}
          <TabsContent value="personas">
            <Card>
              <CardHeader>
                <CardTitle>Personas Relacionadas</CardTitle>
                <CardDescription>
                  Propietarios, inquilinos y contactos asociados a esta propiedad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Próximamente</p>
                  <p className="text-sm">
                    Aquí podrás ver y gestionar las personas relacionadas con esta propiedad
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Container>
    </>
  );
};

export default PropiedadDetallesPage;
