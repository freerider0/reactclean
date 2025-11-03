# Implementación de Mapas con OpenLayers

## Resumen

Se ha implementado un sistema completo de visualización de mapas para propiedades inmobiliarias usando:
- **OpenLayers** con tiles del **IGN** (Instituto Geográfico Nacional de España)
- **Google Maps Embed** para visualización alternativa
- Conversión automática de coordenadas **UTM Zone 31N (EPSG:25831)** ↔ **WGS84**

## Componentes Creados

### 1. Utilidades de Coordenadas (`src/utils/catastro/coordenadas.ts`)

Funciones para conversión de coordenadas:
- `utm31nToWGS84()` - Convierte coordenadas UTM a WGS84 (lat/lng)
- `wgs84ToUTM31n()` - Convierte WGS84 a UTM
- `convertirCoordenadas()` - Wrapper de conversión
- `formatearCoordenadas()` - Formatea coordenadas para mostrar
- `utm31nToWebMercator()` / `webMercatorToUTM31n()` - Para Web Mercator (EPSG:3857)

### 2. MapaOL Component (`src/components/maps/MapaOL.tsx`)

Componente de mapa con OpenLayers:

**Props:**
```typescript
interface MapaOLProps {
  geometriaWKT?: string;          // Geometría WKT para mostrar polígonos
  center?: { x: number; y: number }; // Centro en coordenadas UTM
  zoom?: number;                   // Nivel de zoom (default: 18)
  showLayerControl?: boolean;      // Mostrar controles adicionales
  className?: string;
}
```

**Características:**
- Trabaja directamente con coordenadas UTM 31N (EPSG:25831)
- Usa ortofotos PNOA del IGN
- Soporta geometrías WKT
- Control de escala en metros
- Zoom levels: 2-20

**Ejemplo de uso:**
```tsx
<MapaOL
  center={{ x: 440720, y: 4474650 }} // Madrid centro
  zoom={18}
  showLayerControl={true}
/>
```

### 3. GoogleMapsEmbed Component (`src/components/maps/GoogleMapsEmbed.tsx`)

Mapa embebido de Google Maps con conversión automática de coordenadas:

**Props:**
```typescript
interface GoogleMapsEmbedProps {
  coordenadas: { x: number; y: number }; // UTM coordinates
  direccion?: string;
  refcat?: string;
  className?: string;
}
```

**Características:**
- Conversión automática UTM → WGS84
- Iframe de Google Maps (vista satélite)
- Botones para: Abrir en Google Maps, Street View, Cómo llegar
- Muestra coordenadas GPS y UTM

**Ejemplo de uso:**
```tsx
<GoogleMapsEmbed
  coordenadas={{ x: 440720, y: 4474650 }}
  direccion="Calle Mayor, Madrid"
  refcat="1234567AB1234B0001AA"
/>
```

## Tiles del IGN

El componente MapaOL usa las ortofotos del PNOA (Plan Nacional de Ortofotografía Aérea):

**URL del servicio WMTS:**
```
https://www.ign.es/wmts/pnoa-ma?
  layer=OI.OrthoimageCoverage&
  style=default&
  tilematrixset=GoogleMapsCompatible&
  Service=WMTS&
  Request=GetTile&
  Version=1.0.0&
  Format=image/jpeg&
  TileMatrix={z}&
  TileCol={x}&
  TileRow={y}
```

**Características:**
- Ortofotos aéreas de alta resolución de España
- Actualizadas periódicamente
- Formato JPEG
- Zoom levels: 4-20
- Cobertura: Todo el territorio español

## Proyecciones Cartográficas

### EPSG:25831 (UTM Zone 31N)
- Sistema de coordenadas del catastro español
- Coordenadas en metros
- Zona UTM 31 (meridiano central: 3°E)
- Usado para: España peninsular (centro y este)

### WGS84 (EPSG:4326)
- Sistema de coordenadas geográficas global
- Latitud y longitud en grados decimales
- Usado para: GPS, Google Maps, aplicaciones web

## Dependencias Instaladas

```bash
npm install ol proj4 --legacy-peer-deps
```

- **ol** (OpenLayers): v10.3.1 - Librería de mapas
- **proj4**: v2.12.1 - Conversiones de proyecciones cartográficas

## Integración en PropiedadDetallesPage

El tab "Ubicación" ahora muestra:

1. **Información de dirección** (Card con datos estructurados)
2. **Ortofoto IGN** (MapaOL component)
3. **Google Maps** (GoogleMapsEmbed component)

## Coordenadas de Ejemplo

```typescript
// Madrid centro
const madrid = { x: 440720, y: 4474650 };

// Barcelona centro
const barcelona = { x: 430000, y: 4582000 };
```

## Notas Importantes

1. **Proyección UTM 31N**: Las coordenadas deben estar en EPSG:25831 (UTM Zone 31N)
2. **Google Maps API Key**: Reemplazar la API key en producción
3. **Geometrías WKT**: Se pueden pasar polígonos en formato WKT para visualizar límites de parcelas
4. **Performance**: Los mapas se inicializan solo cuando el tab de ubicación está activo

## Próximas Mejoras

- [ ] Añadir soporte para múltiples zonas UTM (España tiene 3 zonas)
- [ ] Integrar geometrías de catastro (WKT de parcelas)
- [ ] Añadir marcadores personalizados
- [ ] Calcular distancias a puntos de interés
- [ ] Añadir capas adicionales (callejero, relieve, etc.)
- [ ] Implementar búsqueda de direcciones (geocoding)
- [ ] Añadir herramientas de medición
- [ ] Exportar capturas del mapa

## Referencias

- [OpenLayers Documentation](https://openlayers.org/en/latest/apidoc/)
- [IGN WMTS Services](https://www.ign.es/web/ign/portal/ide-area-nodo-ide-ign)
- [Proj4js Documentation](http://proj4js.org/)
- [EPSG:25831 Definition](https://epsg.io/25831)
