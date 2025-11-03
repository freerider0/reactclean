import React, { useMemo } from 'react';
import { convertirCoordenadas } from '@/utils/catastro/coordenadas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Camera } from 'lucide-react';

interface GoogleMapsEmbedProps {
  coordenadas: { x: number; y: number };
  direccion?: string;
  refcat?: string;
  className?: string;
}

/**
 * Componente que muestra un mapa embebido de Google Maps
 * Convierte automáticamente coordenadas UTM (EPSG:25831) a WGS84 (lat/lng)
 */
export const GoogleMapsEmbed: React.FC<GoogleMapsEmbedProps> = ({
  coordenadas,
  direccion,
  refcat,
  className = '',
}) => {
  // Convertir coordenadas UTM (EPSG:25831) a WGS84 (lat/lng)
  const coordsWGS84 = useMemo(() => convertirCoordenadas(coordenadas), [coordenadas]);
  const lat = coordsWGS84.lat;
  const lng = coordsWGS84.lng;

  // Google Maps API Key (reemplazar con tu propia key en producción)
  const apiKey = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <CardTitle>Google Maps</CardTitle>
            <CardDescription>
              Ubicación interactiva de la propiedad
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mapa Embebido */}
        <div className="aspect-video rounded-lg overflow-hidden border-2 border-border">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=18&maptype=satellite`}
          />
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full gap-2">
              <MapPin className="w-4 h-4" />
              Abrir en Google Maps
            </Button>
          </a>

          <a
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full gap-2">
              <Camera className="w-4 h-4" />
              Ver Street View
            </Button>
          </a>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full gap-2">
              <Navigation className="w-4 h-4" />
              Cómo llegar
            </Button>
          </a>
        </div>

        {/* Info adicional */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="text-xs text-muted-foreground mb-2 font-semibold">
            Coordenadas GPS (WGS84)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background p-2 rounded border">
              <div className="text-xs text-muted-foreground">Latitud</div>
              <div className="text-sm font-mono font-bold">{lat.toFixed(6)}</div>
            </div>
            <div className="bg-background p-2 rounded border">
              <div className="text-xs text-muted-foreground">Longitud</div>
              <div className="text-sm font-mono font-bold">{lng.toFixed(6)}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <div>
              <span className="font-semibold">Catastro (UTM 31N):</span>{' '}
              {coordenadas.x.toFixed(2)}, {coordenadas.y.toFixed(2)}
            </div>
            <div>
              Convertido automáticamente de EPSG:25831 a WGS84 para visualización en mapas.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleMapsEmbed;
