import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Home, Building, Store, Warehouse, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const mockTipos = [
  {
    id: 1,
    nombre: 'Piso',
    icon: 'Building',
    descripcion: 'Vivienda en edificio de varias plantas',
    cantidad: 15,
    color: 'blue',
  },
  {
    id: 2,
    nombre: 'Casa',
    icon: 'Home',
    descripcion: 'Vivienda unifamiliar independiente',
    cantidad: 8,
    color: 'green',
  },
  {
    id: 3,
    nombre: 'Local Comercial',
    icon: 'Store',
    descripcion: 'Espacio destinado a actividad comercial',
    cantidad: 12,
    color: 'purple',
  },
  {
    id: 4,
    nombre: 'Oficina',
    icon: 'Building2',
    descripcion: 'Espacio para uso profesional o empresarial',
    cantidad: 6,
    color: 'orange',
  },
  {
    id: 5,
    nombre: 'Nave Industrial',
    icon: 'Warehouse',
    descripcion: 'Espacio para uso industrial o almacenaje',
    cantidad: 4,
    color: 'gray',
  },
  {
    id: 6,
    nombre: 'Terreno',
    icon: 'Home',
    descripcion: 'Parcela sin edificar',
    cantidad: 3,
    color: 'brown',
  },
];

const getIconComponent = (iconName: string) => {
  const icons: any = {
    Building,
    Home,
    Store,
    Building2,
    Warehouse,
  };
  return icons[iconName] || Home;
};

export const TiposPropiedadPage: React.FC = () => {
  const [tipos, setTipos] = useState(mockTipos);

  return (
    <>
      <Helmet>
        <title>Tipos de Propiedad | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tipos de Propiedad</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona las categorías de propiedades
              </p>
            </div>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Tipo
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{tipos.length}</div>
              <p className="text-xs text-muted-foreground">Tipos Configurados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {tipos.reduce((sum, t) => sum + t.cantidad, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Propiedades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {tipos.sort((a, b) => b.cantidad - a.cantidad)[0]?.nombre || '-'}
              </div>
              <p className="text-xs text-muted-foreground">Tipo Más Común</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {(tipos.reduce((sum, t) => sum + t.cantidad, 0) / tipos.length).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Promedio por Tipo</p>
            </CardContent>
          </Card>
        </div>

        {/* Grid de tipos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tipos.map((tipo) => {
            const IconComponent = getIconComponent(tipo.icon);
            return (
              <Card key={tipo.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-${tipo.color}-100 dark:bg-${tipo.color}-900/20`}>
                        <IconComponent className={`w-6 h-6 text-${tipo.color}-600 dark:text-${tipo.color}-400`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{tipo.nombre}</CardTitle>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {tipo.cantidad} propiedades
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{tipo.descripcion}</p>

                  {/* Barra de progreso visual */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Uso</span>
                      <span>{((tipo.cantidad / tipos.reduce((sum, t) => sum + t.cantidad, 0)) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`bg-${tipo.color}-500 h-2 rounded-full transition-all`}
                        style={{ width: `${(tipo.cantidad / tipos.reduce((sum, t) => sum + t.cantidad, 0)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1">
                      <Edit className="w-3 h-3" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Card informativa */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">¿Qué son los tipos de propiedad?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Los tipos de propiedad te permiten clasificar y organizar tu inventario inmobiliario.
              Cada tipo puede tener características específicas y ayuda a filtrar y buscar propiedades más fácilmente.
              Puedes crear tipos personalizados según las necesidades de tu negocio.
            </p>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default TiposPropiedadPage;
