import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Download, FileText, BarChart3, PieChart, Activity, Clock, Calendar, Eye, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const reportes = [
  { id: 1, nombre: 'Informe Mensual', descripcion: 'Resumen de facturación del mes', icono: 'BarChart3', periodo: 'Mensual' },
  { id: 2, nombre: 'Estado de Cuentas', descripcion: 'Cobros y pendientes por cliente', icono: 'PieChart', periodo: 'Actual' },
  { id: 3, nombre: 'Análisis Trimestral', descripcion: 'Evolución de ingresos trimestral', icono: 'TrendingUp', periodo: 'Trimestral' },
  { id: 4, nombre: 'Libro de Facturas', descripcion: 'Registro completo de facturas emitidas', icono: 'FileText', periodo: 'Anual' },
];

const historialReportes = [
  { id: 1, nombre: 'Informe Mensual', periodo: 'Febrero 2024', fecha: '2024-02-28T10:30:00', generadoPor: 'Admin', tamano: '245 KB' },
  { id: 2, nombre: 'Estado de Cuentas', periodo: 'Q1 2024', fecha: '2024-02-25T15:45:00', generadoPor: 'Admin', tamano: '186 KB' },
  { id: 3, nombre: 'Informe Mensual', periodo: 'Enero 2024', fecha: '2024-01-31T09:15:00', generadoPor: 'Admin', tamano: '238 KB' },
  { id: 4, nombre: 'Libro de Facturas', periodo: '2023', fecha: '2024-01-05T11:00:00', generadoPor: 'Admin', tamano: '1.2 MB' },
];

const estadisticas = {
  totalReportes: historialReportes.length,
  ultimoGenerado: 'Hace 2 días',
  masPopular: 'Informe Mensual',
  programados: 3,
};

export const ReportesPage: React.FC = () => {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  const tiposReporte = ['todos', ...Array.from(new Set(historialReportes.map(r => r.nombre)))];

  const reportesFiltrados = historialReportes.filter(reporte => {
    const coincideTipo = filtroTipo === 'todos' || reporte.nombre === filtroTipo;
    const coincideBusqueda = reporte.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                             reporte.periodo.toLowerCase().includes(busqueda.toLowerCase());
    return coincideTipo && coincideBusqueda;
  });

  const limpiarFiltros = () => {
    setFiltroTipo('todos');
    setBusqueda('');
  };

  return (
    <>
      <Helmet>
        <title>Reportes | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground mt-1">Genera informes y análisis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.totalReportes}</div>
              <p className="text-xs text-muted-foreground">Reportes generados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.ultimoGenerado}</div>
              <p className="text-xs text-muted-foreground">Último generado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-sm font-bold text-foreground">{estadisticas.masPopular}</div>
              <p className="text-xs text-muted-foreground">Más popular</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.programados}</div>
              <p className="text-xs text-muted-foreground">Programados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reportes Disponibles</CardTitle>
              <CardDescription>Selecciona un reporte para generar y descargar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportes.map((reporte) => (
                  <div
                    key={reporte.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground mb-1">{reporte.nombre}</div>
                        <div className="text-sm text-muted-foreground">{reporte.descripcion}</div>
                        <div className="text-xs text-muted-foreground mt-1">Periodo: {reporte.periodo}</div>
                      </div>
                    </div>
                    <Button className="gap-2 ml-4">
                      <Download className="w-4 h-4" />
                      Generar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de Reportes</CardTitle>
              <CardDescription>Reportes generados recientemente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar en historial..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="flex-1"
                  />
                  {(filtroTipo !== 'todos' || busqueda) && (
                    <Button variant="outline" size="sm" onClick={limpiarFiltros} className="gap-1">
                      <X className="w-4 h-4" />
                      Limpiar
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {tiposReporte.map((tipo) => (
                    <Button
                      key={tipo}
                      variant={filtroTipo === tipo ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroTipo(tipo)}
                      className="text-xs"
                    >
                      {tipo === 'todos' ? 'Todos' : tipo}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {reportesFiltrados.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No se encontraron reportes</p>
                  </div>
                ) : (
                  reportesFiltrados.map((reporte) => (
                  <div
                    key={reporte.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{reporte.nombre}</span>
                        <Badge variant="outline" className="text-xs">{reporte.periodo}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(reporte.fecha).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <span>•</span>
                        <span>{reporte.tamano}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </>
  );
};

export default ReportesPage;
