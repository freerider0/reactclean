import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Euro, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

const mockIngresos = {
  mesActual: { total: 12500, facturado: 15000, cobrado: 10000, pendiente: 5000 },
  mesAnterior: { total: 11200, facturado: 13000, cobrado: 11200, pendiente: 1800 },
  porMes: [
    { mes: 'Enero', ingresos: 11200, gastos: 4500 },
    { mes: 'Febrero', ingresos: 12500, gastos: 4800 },
    { mes: 'Marzo', ingresos: 0, gastos: 0 },
  ],
};

export const IngresosPage: React.FC = () => {
  const crecimiento = ((mockIngresos.mesActual.total - mockIngresos.mesAnterior.total) / mockIngresos.mesAnterior.total * 100).toFixed(1);
  const beneficio = mockIngresos.porMes.reduce((sum, m) => sum + (m.ingresos - m.gastos), 0);

  return (
    <>
      <Helmet>
        <title>Ingresos | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Euro className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ingresos</h1>
            <p className="text-muted-foreground mt-1">Análisis financiero y seguimiento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-500" />
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">€{mockIngresos.mesActual.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Ingresos este mes</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+{crecimiento}% vs mes anterior</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">€{mockIngresos.mesActual.facturado.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Facturado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                €{mockIngresos.mesActual.cobrado.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Cobrado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                €{mockIngresos.mesActual.pendiente.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolución Mensual</CardTitle>
              <CardDescription>Ingresos y gastos por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockIngresos.porMes.map((mes, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{mes.mes}</span>
                      <span className="text-muted-foreground">€{(mes.ingresos - mes.gastos).toLocaleString()} beneficio</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(mes.ingresos / 15000) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen Anual</CardTitle>
              <CardDescription>Proyección y totales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">€{beneficio.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Beneficio total (YTD)</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingresos totales</span>
                  <span className="font-semibold">€{mockIngresos.porMes.reduce((s, m) => s + m.ingresos, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gastos totales</span>
                  <span className="font-semibold">€{mockIngresos.porMes.reduce((s, m) => s + m.gastos, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Margen</span>
                  <span className="font-semibold">{((beneficio / mockIngresos.porMes.reduce((s, m) => s + m.ingresos, 0)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </>
  );
};

export default IngresosPage;
