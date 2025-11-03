import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Plus, Search, Calendar, Euro, Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data - esto vendría de la base de datos
const mockFacturas = [
  {
    id: 1,
    numero: 'FAC-2024-001',
    cliente: 'Juan García Pérez',
    fecha: '2024-01-15',
    vencimiento: '2024-02-15',
    total: 1500,
    estado: 'Pagada',
    concepto: 'Alquiler Enero 2024 - Calle Mayor 123',
  },
  {
    id: 2,
    numero: 'FAC-2024-002',
    cliente: 'María López Silva',
    fecha: '2024-01-20',
    vencimiento: '2024-02-20',
    total: 2300,
    estado: 'Pendiente',
    concepto: 'Comisión venta - Avenida Constitución 45',
  },
  {
    id: 3,
    numero: 'FAC-2024-003',
    cliente: 'Inmobiliaria Central S.L.',
    fecha: '2024-01-25',
    vencimiento: '2024-02-25',
    total: 5000,
    estado: 'Pendiente',
    concepto: 'Servicios gestión inmobiliaria Enero',
  },
  {
    id: 4,
    numero: 'FAC-2024-004',
    cliente: 'Pedro Martínez Ruiz',
    fecha: '2024-02-01',
    vencimiento: '2024-01-15',
    total: 800,
    estado: 'Vencida',
    concepto: 'Alquiler Diciembre 2023 - Gran Vía 78',
  },
];

export const FacturasPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFacturas = mockFacturas.filter(
    (factura) =>
      factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pagada':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Vencida':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const totalFacturado = mockFacturas.reduce((sum, f) => sum + f.total, 0);
  const totalPagado = mockFacturas.filter(f => f.estado === 'Pagada').reduce((sum, f) => sum + f.total, 0);
  const totalPendiente = mockFacturas.filter(f => f.estado === 'Pendiente').reduce((sum, f) => sum + f.total, 0);
  const totalVencido = mockFacturas.filter(f => f.estado === 'Vencida').reduce((sum, f) => sum + f.total, 0);

  return (
    <>
      <Helmet>
        <title>Facturas | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Facturas</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona tus facturas y pagos
              </p>
            </div>
          </div>
          <Link to="/facturas/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Factura
            </Button>
          </Link>
        </div>

        {/* Filtros y búsqueda */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Buscar Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente o concepto..."
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
              <div className="text-2xl font-bold text-foreground">€{totalFacturado.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Facturado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                €{totalPagado.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Cobrado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                €{totalPendiente.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Pendiente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                €{totalVencido.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Vencido</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de facturas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturas Recientes</CardTitle>
            <CardDescription>
              {filteredFacturas.length} facturas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredFacturas.map((factura) => (
                <div
                  key={factura.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-foreground">
                        {factura.numero}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getEstadoColor(factura.estado)}`}>
                        {factura.estado}
                      </span>
                    </div>
                    <div className="text-sm text-foreground mb-1">
                      {factura.cliente}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {factura.concepto}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Emitida: {new Date(factura.fecha).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Vence: {new Date(factura.vencimiento).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        €{factura.total.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="w-3 h-3" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredFacturas.length === 0 && (
              <div className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron facturas</h3>
                <p className="text-muted-foreground mb-4">
                  Intenta con otros términos de búsqueda
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default FacturasPage;
