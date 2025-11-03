import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Map, Search, Loader2, MapPin, X } from 'lucide-react';
import { MapaOLEnhanced } from '@/components/maps/MapaOLEnhanced';
import { catastroApi } from '@/services/catastroApiService';
import type { ParcelaResponse } from '@/types/catastro';
import { toast } from 'sonner';

export const MapaCatastroPage: React.FC = () => {
  const [clickedParcela, setClickedParcela] = useState<ParcelaResponse | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle map click event
   * Converts clicked coordinates to parcel query
   */
  async function handleMapClick(x: number, y: number, srid: number) {
    setLoading(true);
    try {
      console.log(`🔍 Searching parcel at (${Math.round(x)}, ${Math.round(y)}) SRID:${srid}`);

      const data = await catastroApi.buscarParcelaPorCoordenadas(x, y, srid);

      if (data) {
        console.log(`✅ Parcel found: ${data.refcat}`);
        setClickedParcela(data);
        toast.success(`Parcela encontrada: ${data.refcat}`);
      } else {
        console.log('⚠️  No parcel found at this location');
        setClickedParcela(null);
        toast.info('No se encontró ninguna parcela en esta ubicación');
      }
    } catch (error) {
      console.error('Error searching parcel:', error);
      toast.error('Error al buscar parcela');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle search by cadastral reference
   */
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const refcat = searchValue.trim().toUpperCase();

    if (refcat.length !== 14) {
      toast.error('La referencia catastral debe tener 14 caracteres');
      return;
    }

    setLoading(true);
    try {
      const data = await catastroApi.getParcela(refcat);

      if (data && data.parcela?.geometria) {
        // Convert to ParcelaResponse format
        const parcelaResponse: ParcelaResponse = {
          refcat: data.refcat,
          area: data.parcela.geometria.area,
          coordenadas: data.parcela.geometria.coordenadas,
          wkt: data.parcela.geometria.wkt,
          srid: data.parcela.geometria.srid,
          epsg: data.parcela.geometria.epsg,
          datos_finca: data.parcela.datos_finca,
          estadisticas: data.estadisticas,
        };

        setClickedParcela(parcelaResponse);
        toast.success(`Parcela encontrada: ${refcat}`);
      }
    } catch (error: any) {
      console.error('Error searching by reference:', error);
      toast.error(error.message || 'Error al buscar parcela');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clear selected parcel
   */
  function handleClear() {
    setClickedParcela(null);
    setSearchValue('');
  }

  return (
    <>
      <Helmet>
        <title>Mapa Catastral | Sistema Inmobiliario</title>
      </Helmet>

      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Map className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mapa Catastral</h1>
                <p className="text-sm text-muted-foreground">
                  Haz clic en el mapa o busca por referencia catastral
                </p>
              </div>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Referencia catastral (14 caracteres)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                className="w-80"
                maxLength={14}
              />
              <Button type="submit" disabled={loading || searchValue.length !== 14}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-96 border-r bg-background overflow-y-auto">
            <div className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {!loading && !clickedParcela && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Instrucciones</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        <strong>Haz clic</strong> en cualquier punto del mapa para consultar la
                        parcela catastral
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Search className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p>
                        <strong>Busca</strong> por referencia catastral de 14 caracteres en el campo
                        superior
                      </p>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-xs">
                        Las coordenadas UTM se detectan automáticamente según la ubicación (zonas 28-31)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!loading && clickedParcela && (
                <div className="space-y-4">
                  {/* Header with clear button */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Información de la Parcela</h2>
                    <Button variant="ghost" size="sm" onClick={handleClear}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Cadastral reference */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Referencia Catastral
                          </div>
                          <Badge variant="default" className="text-base font-mono">
                            {clickedParcela.refcat}
                          </Badge>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">EPSG</div>
                          <Badge variant="outline">{clickedParcela.epsg}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location */}
                  {clickedParcela.datos_finca && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Ubicación</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Municipio:</span>{' '}
                          {clickedParcela.datos_finca.nombre_municipio || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Provincia:</span>{' '}
                          {clickedParcela.datos_finca.nombre_provincia || 'N/A'}
                        </div>
                        {clickedParcela.datos_finca.codigo_postal && (
                          <div>
                            <span className="font-medium">C.P.:</span>{' '}
                            {clickedParcela.datos_finca.codigo_postal}
                          </div>
                        )}
                        {clickedParcela.datos_finca.nombre_via && (
                          <div>
                            <span className="font-medium">Vía:</span>{' '}
                            {clickedParcela.datos_finca.tipo_via}{' '}
                            {clickedParcela.datos_finca.nombre_via}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Area and coordinates */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Datos Geométricos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Superficie:</span>{' '}
                        <span className="text-base font-bold">
                          {clickedParcela.area?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{' '}
                          m²
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">X (centroide):</span>{' '}
                        {clickedParcela.coordenadas.x.toLocaleString('es-ES', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        m
                      </div>
                      <div>
                        <span className="font-medium">Y (centroide):</span>{' '}
                        {clickedParcela.coordenadas.y.toLocaleString('es-ES', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        m
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statistics */}
                  {clickedParcela.estadisticas && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Estadísticas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Total Inmuebles:</span>{' '}
                          {clickedParcela.estadisticas.total_inmuebles}
                        </div>
                        <div>
                          <span className="font-medium">Superficie Construida:</span>{' '}
                          {clickedParcela.estadisticas.superficie_total?.toLocaleString('es-ES', {
                            maximumFractionDigits: 2,
                          })}{' '}
                          m²
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* JSON viewer (collapsible) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Datos Completos (JSON)</CardTitle>
                      <CardDescription className="text-xs">
                        Información completa devuelta por la API
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-96">
                        {JSON.stringify(clickedParcela, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <MapaOLEnhanced
              onMapClick={handleMapClick}
              clickedGeometryWKT={clickedParcela?.wkt}
              clickedGeometrySRID={clickedParcela?.srid}
              showCoordinateDisplay={true}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default MapaCatastroPage;
