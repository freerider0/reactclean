import React, { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill } from 'ol/style';
import { ScaleLine, defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import WKT from 'ol/format/WKT';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { getCenter } from 'ol/extent';

interface MapaOLProps {
  geometriaWKT?: string;
  center?: { x: number; y: number };
  zoom?: number;
  showLayerControl?: boolean;
  className?: string;
}

/**
 * Componente de mapa usando OpenLayers con soporte UTM nativo
 * - Trabaja directamente con coordenadas EPSG:25831 (UTM Zone 31N)
 * - Sin conversiones UTM ↔ WGS84
 * - Coordenadas en metros
 * - Usa ortofotos del IGN (Instituto Geográfico Nacional de España)
 */
export const MapaOL: React.FC<MapaOLProps> = ({
  geometriaWKT,
  center,
  zoom = 18,
  showLayerControl = false,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // ========================================
    // 1. CONFIGURAR PROYECCIÓN UTM 31N
    // ========================================

    // Definir EPSG:25831 (UTM Zone 31N - España peninsular)
    proj4.defs(
      'EPSG:25831',
      '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
    );

    // Registrar en OpenLayers
    register(proj4);

    // ========================================
    // 2. CREAR CAPA DE ORTOFOTOS (IGN PNOA)
    // ========================================

    const pnoaLayer = new TileLayer({
      source: new XYZ({
        url: 'https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}',
        crossOrigin: 'anonymous',
        maxZoom: 20,
        minZoom: 4,
      }),
    });

    // ========================================
    // 3. CREAR CAPA VECTORIAL PARA GEOMETRÍAS
    // ========================================

    const vectorSource = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.1)',
        }),
      }),
    });

    // ========================================
    // 4. PARSEAR GEOMETRÍA WKT (si existe)
    // ========================================

    if (geometriaWKT) {
      try {
        const format = new WKT();

        // Parsear WKT - las coordenadas están en UTM 31N
        const feature = format.readFeature(geometriaWKT, {
          dataProjection: 'EPSG:25831',
          featureProjection: 'EPSG:25831',
        });

        vectorSource.addFeature(feature);
      } catch (error) {
        console.error('Error al parsear WKT:', error);
      }
    }

    // ========================================
    // 5. CONFIGURAR CENTRO DEL MAPA
    // ========================================

    // Coordenadas por defecto (centro de España en UTM)
    let mapCenter: [number, number] = [500000, 4500000];

    // Si se proporciona centro, usar esas coordenadas UTM directamente
    if (center && center.x && center.y) {
      mapCenter = [center.x, center.y];
    }

    // Si hay geometría, centrar en ella
    if (vectorSource.getFeatures().length > 0) {
      const extent = vectorSource.getExtent();
      mapCenter = getCenter(extent) as [number, number];
    }

    // ========================================
    // 6. CREAR MAPA
    // ========================================

    const map = new Map({
      target: mapContainer.current,
      layers: [pnoaLayer, vectorLayer],
      view: new View({
        projection: 'EPSG:25831', // ← Proyección UTM 31N
        center: mapCenter, // ← Coordenadas UTM en metros
        zoom: zoom,
        maxZoom: 20,
        minZoom: 2, // ← Permite más zoom out para ver toda España
        constrainResolution: false,
      }),
      controls: defaultControls().extend([
        // Control de escala en metros
        new ScaleLine({
          units: 'metric',
        }),
      ]),
      // Habilitar interacciones por defecto (pan, zoom, rotate, etc.)
      interactions: defaultInteractions({
        doubleClickZoom: true,
        dragPan: true,
        mouseWheelZoom: true,
        shiftDragZoom: true,
        pinchRotate: true,
        pinchZoom: true,
      }),
    });

    mapRef.current = map;

    // ========================================
    // 7. AJUSTAR VISTA A GEOMETRÍA
    // ========================================

    if (vectorSource.getFeatures().length > 0) {
      const extent = vectorSource.getExtent();
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 19,
      });
    }

    // ========================================
    // 8. AGREGAR CONTROLES ADICIONALES
    // ========================================

    if (showLayerControl) {
      // Mostrar coordenadas al hacer clic
      map.on('singleclick', (evt) => {
        const coordinate = evt.coordinate;
        console.log('Coordenadas UTM:', {
          x: coordinate[0].toFixed(2),
          y: coordinate[1].toFixed(2),
        });
      });
    }

    // Forzar actualización de tamaño
    setTimeout(() => {
      map.updateSize();
    }, 100);

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
    };
  }, [geometriaWKT, center, zoom, showLayerControl]);

  return (
    <div
      ref={mapContainer}
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};

export default MapaOL;
