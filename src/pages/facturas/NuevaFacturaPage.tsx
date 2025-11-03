import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Plus, Save, Trash2, User, Calendar } from 'lucide-react';
import { InlineEditField } from '@/components/MediaUploader/InlineEditField';

interface LineaFactura {
  id: number;
  concepto: string;
  cantidad: number;
  precio: number;
  total: number;
}

export const NuevaFacturaPage: React.FC = () => {
  const [numeroFactura, setNumeroFactura] = useState('FAC-2024-005');
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [vencimiento, setVencimiento] = useState('');
  const [lineas, setLineas] = useState<LineaFactura[]>([
    { id: 1, concepto: '', cantidad: 1, precio: 0, total: 0 },
  ]);

  const agregarLinea = () => {
    const newId = Math.max(...lineas.map(l => l.id), 0) + 1;
    setLineas([...lineas, { id: newId, concepto: '', cantidad: 1, precio: 0, total: 0 }]);
  };

  const eliminarLinea = (id: number) => {
    if (lineas.length > 1) {
      setLineas(lineas.filter(l => l.id !== id));
    }
  };

  const actualizarLinea = (id: number, campo: keyof LineaFactura, valor: any) => {
    setLineas(lineas.map(linea => {
      if (linea.id === id) {
        const updated = { ...linea, [campo]: valor };
        if (campo === 'cantidad' || campo === 'precio') {
          updated.total = updated.cantidad * updated.precio;
        }
        return updated;
      }
      return linea;
    }));
  };

  const subtotal = lineas.reduce((sum, linea) => sum + linea.total, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const handleGuardar = () => {
    console.log({
      numeroFactura,
      cliente,
      fecha,
      vencimiento,
      lineas,
      subtotal,
      iva,
      total,
    });
  };

  return (
    <>
      <Helmet>
        <title>Nueva Factura | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nueva Factura</h1>
              <p className="text-muted-foreground mt-1">
                Crea una nueva factura para un cliente
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Factura
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal: Detalles */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos básicos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Número de Factura</Label>
                  <Input
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <Input
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Emisión</Label>
                  <Input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                  <Input
                    type="date"
                    value={vencimiento}
                    onChange={(e) => setVencimiento(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Líneas de factura */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Conceptos</CardTitle>
                  <CardDescription className="text-xs">Agrega los servicios o productos</CardDescription>
                </div>
                <Button onClick={agregarLinea} size="sm" variant="outline" className="gap-1">
                  <Plus className="w-3 h-3" />
                  Añadir línea
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lineas.map((linea) => (
                    <div key={linea.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs text-muted-foreground">Concepto</Label>
                        <Input
                          value={linea.concepto}
                          onChange={(e) => actualizarLinea(linea.id, 'concepto', e.target.value)}
                          placeholder="Descripción del servicio"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Cantidad</Label>
                        <Input
                          type="number"
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(linea.id, 'cantidad', parseFloat(e.target.value) || 0)}
                          min="1"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Precio</Label>
                        <Input
                          type="number"
                          value={linea.precio}
                          onChange={(e) => actualizarLinea(linea.id, 'precio', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <Input
                          value={linea.total.toFixed(2)}
                          disabled
                          className="mt-1 bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => eliminarLinea(linea.id)}
                          disabled={lineas.length === 1}
                          className="w-full text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notas y Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[100px] p-3 text-sm border border-border rounded-md bg-background"
                  placeholder="Añade notas adicionales o condiciones de pago..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral: Resumen */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA (21%)</span>
                    <span className="font-medium">€{iva.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-border my-3" />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">€{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3 h-3" />
                      <span>Cliente: {cliente || 'Sin especificar'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>Vence: {vencimiento ? new Date(vencimiento).toLocaleDateString('es-ES') : 'Sin especificar'}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleGuardar} className="w-full gap-2 mt-4">
                  <Save className="w-4 h-4" />
                  Guardar Factura
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
};

export default NuevaFacturaPage;
