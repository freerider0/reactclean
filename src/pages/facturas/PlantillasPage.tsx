import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Edit, Eye, Layers, Star, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const plantillas = [
  { id: 1, nombre: 'Factura Estándar', descripcion: 'Plantilla básica para servicios generales', usos: 45, predeterminada: true },
  { id: 2, nombre: 'Alquiler Mensual', descripcion: 'Específica para cobros de alquiler', usos: 28, predeterminada: false },
  { id: 3, nombre: 'Comisión Venta', descripcion: 'Para comisiones de compraventa', usos: 12, predeterminada: false },
  { id: 4, nombre: 'Servicios Profesionales', descripcion: 'Asesoría y gestión inmobiliaria', usos: 8, predeterminada: false },
];

const estadisticas = {
  totalPlantillas: plantillas.length,
  masUsada: plantillas.reduce((prev, current) => (prev.usos > current.usos ? prev : current)).nombre,
  usosTotal: plantillas.reduce((sum, p) => sum + p.usos, 0),
  activas: plantillas.length,
};

export const PlantillasPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Plantillas de Facturas | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Plantillas de Facturas</h1>
              <p className="text-muted-foreground mt-1">Crea y gestiona tus plantillas</p>
            </div>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Layers className="w-8 h-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.totalPlantillas}</div>
              <p className="text-xs text-muted-foreground">Plantillas totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="text-sm font-bold text-foreground">{estadisticas.masUsada}</div>
              <p className="text-xs text-muted-foreground">Más usada</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.usosTotal}</div>
              <p className="text-xs text-muted-foreground">Usos totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.activas}</div>
              <p className="text-xs text-muted-foreground">Activas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plantillas.map((plantilla) => (
            <Card key={plantilla.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{plantilla.nombre}</CardTitle>
                  {plantilla.predeterminada && (
                    <Badge variant="default" className="text-xs">Predeterminada</Badge>
                  )}
                </div>
                <CardDescription>{plantilla.descripcion}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Usada {plantilla.usos} veces
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Eye className="w-3 h-3" />
                    Vista Previa
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Edit className="w-3 h-3" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
};

export default PlantillasPage;
