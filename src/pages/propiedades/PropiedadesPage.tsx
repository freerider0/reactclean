import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Plus, Search, MapPin, Euro, Bed, Bath, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data - esto vendría de la base de datos
const mockPropiedades = [
  {
    id: '1',
    referencia: 'PROP-001',
    tipo: 'Piso',
    direccion: 'Calle Mayor, 123, 3º B',
    ciudad: 'Madrid',
    codigoPostal: '28001',
    precio: 250000,
    habitaciones: 3,
    banos: 2,
    superficie: 100,
    estado: 'Disponible',
    imagen: '/api/placeholder/400/300',
  },
  {
    id: '2',
    referencia: 'PROP-002',
    tipo: 'Casa',
    direccion: 'Avenida de la Constitución, 45',
    ciudad: 'Barcelona',
    codigoPostal: '08001',
    precio: 450000,
    habitaciones: 4,
    banos: 3,
    superficie: 180,
    estado: 'Disponible',
    imagen: '/api/placeholder/400/300',
  },
  {
    id: '3',
    referencia: 'PROP-003',
    tipo: 'Local Comercial',
    direccion: 'Gran Vía, 78',
    ciudad: 'Madrid',
    codigoPostal: '28013',
    precio: 320000,
    habitaciones: 0,
    banos: 2,
    superficie: 150,
    estado: 'Reservado',
    imagen: '/api/placeholder/400/300',
  },
];

export const PropiedadesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPropiedades = mockPropiedades.filter(
    (prop) =>
      prop.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.ciudad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Propiedades | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Propiedades</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona tu cartera de propiedades
              </p>
            </div>
          </div>
          <Link to="/propiedades/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Propiedad
            </Button>
          </Link>
        </div>

        {/* Filtros y búsqueda */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Buscar Propiedades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por referencia, dirección o ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{mockPropiedades.length}</div>
              <p className="text-xs text-muted-foreground">Total Propiedades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {mockPropiedades.filter(p => p.estado === 'Disponible').length}
              </div>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {mockPropiedades.filter(p => p.estado === 'Reservado').length}
              </div>
              <p className="text-xs text-muted-foreground">Reservadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                €{(mockPropiedades.reduce((sum, p) => sum + p.precio, 0) / 1000).toFixed(0)}K
              </div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de propiedades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPropiedades.map((propiedad) => (
            <Card key={propiedad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/propiedades/${propiedad.id}`}>
                <div className="aspect-video bg-muted relative">
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      propiedad.estado === 'Disponible'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {propiedad.estado}
                    </span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-background/80 backdrop-blur-sm border border-border">
                      {propiedad.referencia}
                    </span>
                  </div>
                </div>
              </Link>
              <CardHeader className="pb-3">
                <Link to={`/propiedades/${propiedad.id}`}>
                  <CardTitle className="text-base hover:text-primary transition-colors">
                    {propiedad.tipo}
                  </CardTitle>
                </Link>
                <CardDescription className="flex items-start gap-1 text-xs">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{propiedad.direccion}, {propiedad.ciudad}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-2xl font-bold text-primary">
                    €{propiedad.precio.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {propiedad.habitaciones > 0 && (
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{propiedad.habitaciones}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    <span>{propiedad.banos}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    <span>{propiedad.superficie}m²</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link to={`/propiedades/${propiedad.id}`} className="block">
                    <Button variant="outline" className="w-full" size="sm">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPropiedades.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron propiedades</h3>
              <p className="text-muted-foreground mb-4">
                Intenta con otros términos de búsqueda
              </p>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  );
};

export default PropiedadesPage;
