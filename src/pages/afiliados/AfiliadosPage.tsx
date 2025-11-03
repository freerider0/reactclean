import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Users, DollarSign, TrendingUp, Copy, Eye, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const estadisticas = {
  referidosActivos: 12,
  comisionesTotales: 2450,
  comisionesMes: 480,
  tasaConversion: 8.5,
};

const referidosRecientes = [
  { id: 1, nombre: 'María González', email: 'maria@example.com', fecha: '2024-02-28', estado: 'Activo', comision: 150 },
  { id: 2, nombre: 'Juan Pérez', email: 'juan@example.com', fecha: '2024-02-25', estado: 'Activo', comision: 200 },
  { id: 3, nombre: 'Ana López', email: 'ana@example.com', fecha: '2024-02-20', estado: 'Pendiente', comision: 0 },
];

export const AfiliadosPage: React.FC = () => {
  const enlaceAfiliado = 'https://tuapp.com/ref/ABC123';

  const copiarEnlace = () => {
    navigator.clipboard.writeText(enlaceAfiliado);
  };

  return (
    <>
      <Helmet>
        <title>Programa de Afiliados | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Programa de Afiliados</h1>
            <p className="text-muted-foreground mt-1">Gana comisiones recomendando nuestros servicios</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.referidosActivos}</div>
              <p className="text-xs text-muted-foreground">Referidos activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">€{estadisticas.comisionesTotales}</div>
              <p className="text-xs text-muted-foreground">Comisiones totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">€{estadisticas.comisionesMes}</div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-foreground">{estadisticas.tasaConversion}%</div>
              <p className="text-xs text-muted-foreground">Tasa de conversión</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enlace de afiliado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tu Enlace de Afiliado</CardTitle>
              <CardDescription>Comparte este enlace para ganar comisiones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm flex-1 truncate">{enlaceAfiliado}</code>
                  <Button variant="outline" size="sm" onClick={copiarEnlace} className="gap-1">
                    <Copy className="w-3 h-3" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Gana hasta un 20% de comisión</h3>
                    <p className="text-xs text-muted-foreground">
                      Por cada cliente que se registre usando tu enlace, ganarás un porcentaje de sus pagos durante el primer año.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referidos recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referidos Recientes</CardTitle>
              <CardDescription>Últimos usuarios registrados con tu enlace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referidosRecientes.map((referido) => (
                  <div
                    key={referido.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{referido.nombre}</span>
                        <Badge variant={referido.estado === 'Activo' ? 'default' : 'outline'} className="text-xs">
                          {referido.estado}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{referido.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Registrado: {new Date(referido.fecha).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {referido.comision > 0 ? `€${referido.comision}` : '-'}
                      </div>
                      <p className="text-xs text-muted-foreground">Comisión</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cómo funciona */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">¿Cómo Funciona el Programa?</CardTitle>
            <CardDescription>Tres pasos simples para empezar a ganar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Comparte tu enlace</h3>
                <p className="text-sm text-muted-foreground">
                  Comparte tu enlace único con amigos, familiares o en tus redes sociales.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Ellos se registran</h3>
                <p className="text-sm text-muted-foreground">
                  Cuando alguien usa tu enlace y se registra, automáticamente queda vinculado a ti.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Ganas comisiones</h3>
                <p className="text-sm text-muted-foreground">
                  Cada vez que tus referidos pagan, tú ganas un porcentaje automáticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default AfiliadosPage;
