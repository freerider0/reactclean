import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, CheckCircle, Clock, Euro, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const mockFacturasPendientes = [
  {
    id: 1,
    numero: 'FAC-2024-002',
    cliente: 'María López Silva',
    fecha: '2024-01-20',
    vencimiento: '2024-02-20',
    total: 2300,
    diasRestantes: 15,
    estado: 'Pendiente',
  },
  {
    id: 2,
    numero: 'FAC-2024-003',
    cliente: 'Inmobiliaria Central S.L.',
    fecha: '2024-01-25',
    vencimiento: '2024-02-25',
    total: 5000,
    diasRestantes: 20,
    estado: 'Pendiente',
  },
  {
    id: 3,
    numero: 'FAC-2024-004',
    cliente: 'Pedro Martínez Ruiz',
    fecha: '2024-02-01',
    vencimiento: '2024-01-15',
    total: 800,
    diasRestantes: -20,
    estado: 'Vencida',
  },
  {
    id: 4,
    numero: 'FAC-2024-006',
    cliente: 'Ana Fernández Gómez',
    fecha: '2024-02-05',
    vencimiento: '2024-02-10',
    total: 1500,
    diasRestantes: 3,
    estado: 'Próxima a vencer',
  },
];

export const PendientesPage: React.FC = () => {
  const [facturas, setFacturas] = useState(mockFacturasPendientes);

  const getEstadoBadge = (diasRestantes: number) => {
    if (diasRestantes < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Vencida
        </Badge>
      );
    } else if (diasRestantes <= 7) {
      return (
        <Badge variant="default" className="gap-1 bg-yellow-500">
          <Clock className="w-3 h-3" />
          Próxima a vencer
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Pendiente
        </Badge>
      );
    }
  };

  const getUrgenciaColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return 'border-l-4 border-l-red-500';
    if (diasRestantes <= 7) return 'border-l-4 border-l-yellow-500';
    return 'border-l-4 border-l-blue-500';
  };

  const marcarComoPagada = (id: number) => {
    console.log(`Marcar factura ${id} como pagada`);
  };

  const enviarRecordatorio = (id: number) => {
    console.log(`Enviar recordatorio para factura ${id}`);
  };

  const totalPendiente = facturas.reduce((sum, f) => sum + f.total, 0);
  const vencidas = facturas.filter(f => f.diasRestantes < 0);
  const proximasVencer = facturas.filter(f => f.diasRestantes >= 0 && f.diasRestantes <= 7);

  return (
    <>
      <Helmet>
        <title>Facturas Pendientes | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Facturas Pendientes</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona los cobros pendientes
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas de alertas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">€{totalPendiente.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Pendiente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{vencidas.length}</div>
              <p className="text-xs text-muted-foreground">Facturas Vencidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{proximasVencer.length}</div>
              <p className="text-xs text-muted-foreground">Próximas a Vencer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{facturas.length}</div>
              <p className="text-xs text-muted-foreground">Total Pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Facturas vencidas (prioridad alta) */}
        {vencidas.length > 0 && (
          <Card className="mb-6 border-red-200 dark:border-red-900">
            <CardHeader className="bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <CardTitle className="text-base text-red-900 dark:text-red-100">Facturas Vencidas - Acción Inmediata Requerida</CardTitle>
              </div>
              <CardDescription className="text-red-700 dark:text-red-300">
                {vencidas.length} facturas requieren atención urgente
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {vencidas.map((factura) => (
                  <div
                    key={factura.id}
                    className={`p-4 border rounded-lg ${getUrgenciaColor(factura.diasRestantes)} bg-red-50 dark:bg-red-950/10`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">{factura.numero}</span>
                          {getEstadoBadge(factura.diasRestantes)}
                        </div>
                        <div className="text-sm text-foreground mb-1">{factura.cliente}</div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Vencida hace {Math.abs(factura.diasRestantes)} días</span>
                          <span>•</span>
                          <span>Vencimiento: {new Date(factura.vencimiento).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-red-600 dark:text-red-400">
                            €{factura.total.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => enviarRecordatorio(factura.id)}>
                            <Send className="w-3 h-3" />
                            Recordar
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => marcarComoPagada(factura.id)}>
                            <CheckCircle className="w-3 h-3" />
                            Marcar Pagada
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resto de facturas pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Todas las Facturas Pendientes</CardTitle>
            <CardDescription>Ordenadas por fecha de vencimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {facturas
                .sort((a, b) => a.diasRestantes - b.diasRestantes)
                .map((factura) => (
                  <div
                    key={factura.id}
                    className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${getUrgenciaColor(factura.diasRestantes)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">{factura.numero}</span>
                          {getEstadoBadge(factura.diasRestantes)}
                        </div>
                        <div className="text-sm text-foreground mb-1">{factura.cliente}</div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Vence: {new Date(factura.vencimiento).toLocaleDateString('es-ES')}</span>
                          </div>
                          <span>•</span>
                          <span>
                            {factura.diasRestantes >= 0
                              ? `Faltan ${factura.diasRestantes} días`
                              : `Vencida hace ${Math.abs(factura.diasRestantes)} días`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">
                            €{factura.total.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => enviarRecordatorio(factura.id)}>
                            <Send className="w-3 h-3" />
                            Recordar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => marcarComoPagada(factura.id)}>
                            <CheckCircle className="w-3 h-3" />
                            Pagada
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default PendientesPage;
