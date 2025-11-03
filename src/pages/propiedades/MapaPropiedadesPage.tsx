import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, MapPin, Home, Euro, Bed, Bath, Ruler, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock de propiedades con coordenadas
const mockPropiedades = [
  {
    id: 1,
    referencia: 'PROP-001',
    tipo: 'Piso',
    direccion: 'Calle Mayor, 123, 3º B',
    ciudad: 'Madrid',
    precio: 250000,
    habitaciones: 3,
    banos: 2,
    superficie: 100,
    estado: 'Disponible',
    lat: 40.4168,
    lng: -3.7038,
  },
  {
    id: 2,
    referencia: 'PROP-002',
    tipo: 'Casa',
    direccion: 'Avenida de la Constitución, 45',
    ciudad: 'Barcelona',
    precio: 450000,
    habitaciones: 4,
    banos: 3,
    superficie: 180,
    estado: 'Disponible',
    lat: 41.3851,
    lng: 2.1734,
  },
  {
    id: 3,
    referencia: 'PROP-003',
    tipo: 'Local Comercial',
    direccion: 'Gran Vía, 78',
    ciudad: 'Madrid',
    precio: 320000,
    habitaciones: 0,
    banos: 2,
    superficie: 150,
    estado: 'Reservado',
    lat: 40.4200,
    lng: -3.7050,
  },
];

export const MapaPropiedadesPage: React.FC = () => {
  const [selectedPropiedad, setSelectedPropiedad] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');

  const propiedadesFiltradas = filtroEstado === 'Todos'
    ? mockPropiedades
    : mockPropiedades.filter(p => p.estado === filtroEstado);

  return (
    <>
      <Helmet>
        <title>Mapa de Propiedades | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mapa de Propiedades</h1>
              <p className="text-muted-foreground mt-1">
                Visualiza tus propiedades geográficamente
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={filtroEstado === 'Todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroEstado('Todos')}>
              Todos
            </Button>
            <Button variant={filtroEstado === 'Disponible' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroEstado('Disponible')}>
              Disponibles
            </Button>
            <Button variant={filtroEstado === 'Reservado' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroEstado('Reservado')}>
              Reservadas
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapa */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full relative">
                {/* Placeholder del mapa */}
                <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Map className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Integración de Mapa</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Aquí se integraría Google Maps, Mapbox o Leaflet para mostrar las propiedades
                    </p>
                    <div className="mt-6 space-y-2">
                      {propiedadesFiltradas.map((prop) => (
                        <div
                          key={prop.id}
                          className="flex items-center gap-2 justify-center"
                        >
                          <MapPin className={`w-4 h-4 ${prop.estado === 'Disponible' ? 'text-green-500' : 'text-yellow-500'}`} />
                          <span className="text-sm">{prop.direccion} - {prop.ciudad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista lateral */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Propiedades en el mapa</CardTitle>
                <CardDescription>{propiedadesFiltradas.length} propiedades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {propiedadesFiltradas.map((propiedad) => (
                  <div
                    key={propiedad.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPropiedad === propiedad.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPropiedad(propiedad.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${propiedad.estado === 'Disponible' ? 'text-green-500' : 'text-yellow-500'}`} />
                        <span className="font-semibold text-sm">{propiedad.referencia}</span>
                      </div>
                      <Badge variant={propiedad.estado === 'Disponible' ? 'default' : 'secondary'} className="text-xs">
                        {propiedad.estado}
                      </Badge>
                    </div>
                    <div className="text-sm text-foreground mb-1">{propiedad.tipo}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {propiedad.direccion}, {propiedad.ciudad}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">€{propiedad.precio.toLocaleString()}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {propiedad.habitaciones > 0 && (
                          <div className="flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {propiedad.habitaciones}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {propiedad.banos}
                        </div>
                        <div className="flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          {propiedad.superficie}m²
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
};

export default MapaPropiedadesPage;
