import React, { useEffect, useRef, useState } from 'react';
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
import { transform } from 'ol/proj';
import { getCenter } from 'ol/extent';
import { defineAllUTMZones, detectUTMZoneFromLng, getEPSGCode, formatUTMCoordinates } from '@/utils/utm';
import type { UTMZone } from '@/types/catastro';

interface MapaOLEnhancedProps {
  geometriaWKT?: string;
  geometriaSRID?: number;
  center?: { x: number; y: number };
  zoom?: number;
  onMapClick?: (x: number, y: number, srid: number) => void;
  clickedGeometryWKT?: string;
  clickedGeometrySRID?: number;
  className?: string;
  showCoordinateDisplay?: boolean;
}

/**
 * Enhanced OpenLayers map component with:
 * - IGN PNOA orthophotos
 * - Click-to-query functionality
 * - Dynamic UTM zone detection
 * - Coordinate display overlay
 * - Support for multiple geometries
 */
export const MapaOLEnhanced: React.FC<MapaOLEnhancedProps> = ({
  geometriaWKT,
  geometriaSRID = 25831,
  center,
  zoom = 18,
  onMapClick,
  clickedGeometryWKT,
  clickedGeometrySRID,
  className = '',
  showCoordinateDisplay = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const clickedVectorSourceRef = useRef<VectorSource | null>(null);
  const [currentCoords, setCurrentCoords] = useState<string>('');

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Register all UTM zones
    defineAllUTMZones();

    // Create IGN PNOA orthophoto layer
    const pnoaLayer = new TileLayer({
      source: new XYZ({
        url: 'https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}',
        crossOrigin: 'anonymous',
        maxZoom: 20,
        minZoom: 2,
      }),
    });

    // Create vector source and layer for main geometry (red)
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

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
      zIndex: 10,
    });

    // Create vector source and layer for clicked geometry (green)
    const clickedVectorSource = new VectorSource();
    clickedVectorSourceRef.current = clickedVectorSource;

    const clickedVectorLayer = new VectorLayer({
      source: clickedVectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#00ff00',
          width: 4,
        }),
        fill: new Fill({
          color: 'rgba(0, 255, 0, 0.2)',
        }),
      }),
      zIndex: 20,
    });

    // Default center (Madrid)
    const defaultCenter = transform([-3.7, 40.4], 'EPSG:4326', 'EPSG:3857');

    // Create map with Web Mercator projection
    const map = new Map({
      target: mapContainer.current,
      layers: [pnoaLayer, vectorLayer, clickedVectorLayer],
      view: new View({
        projection: 'EPSG:3857', // Web Mercator for tiles
        center: defaultCenter,
        zoom: zoom,
        maxZoom: 20,
        minZoom: 2,
        constrainResolution: false,
      }),
      controls: defaultControls().extend([
        new ScaleLine({
          units: 'metric',
        }),
      ]),
      interactions: defaultInteractions({
        doubleClickZoom: true,
        dragPan: true,
        mouseWheelZoom: true,
        shiftDragZoom: true,
        pinchRotate: true,
        pinchZoom: true,
      }),
    });

    // Handle click events
    map.on('singleclick', (evt) => {
      if (!onMapClick) return;

      // Get click coordinates in Web Mercator
      const webMercatorCoord = evt.coordinate;

      // Transform to WGS84 to detect UTM zone
      const wgs84 = transform(webMercatorCoord, 'EPSG:3857', 'EPSG:4326');
      const lng = wgs84[0];

      // Detect correct UTM zone
      const utmZone = detectUTMZoneFromLng(lng);
      const utmEPSG = getEPSGCode(utmZone);

      // Transform to UTM zone
      const utmCoord = transform(wgs84, 'EPSG:4326', utmEPSG);

      // Call parent callback
      const srid = parseInt(utmEPSG.replace('EPSG:', ''));
      onMapClick(utmCoord[0], utmCoord[1], srid);
    });

    // Handle pointer move for coordinate display
    if (showCoordinateDisplay) {
      map.on('pointermove', (evt) => {
        if (evt.dragging) return;

        const webMercatorCoord = evt.coordinate;
        const wgs84 = transform(webMercatorCoord, 'EPSG:3857', 'EPSG:4326');
        const lng = wgs84[0];

        const utmZone = detectUTMZoneFromLng(lng);
        const utmEPSG = getEPSGCode(utmZone);
        const utmCoord = transform(wgs84, 'EPSG:4326', utmEPSG);

        const coordText = formatUTMCoordinates(utmCoord[0], utmCoord[1], utmZone);
        setCurrentCoords(coordText);
      });
    }

    mapRef.current = map;

    // Force size update
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
  }, []);

  // Handle main geometry changes
  useEffect(() => {
    if (!vectorSourceRef.current || !mapRef.current) return;

    vectorSourceRef.current.clear();

    if (geometriaWKT && geometriaSRID) {
      try {
        const format = new WKT();
        const sourceEPSG = `EPSG:${geometriaSRID}`;

        // Parse WKT in original SRID
        const feature = format.readFeature(geometriaWKT, {
          dataProjection: sourceEPSG,
          featureProjection: sourceEPSG,
        });

        // Transform to Web Mercator for display
        feature.getGeometry()?.transform(sourceEPSG, 'EPSG:3857');
        vectorSourceRef.current.addFeature(feature);

        // Center on geometry
        const extent = vectorSourceRef.current.getExtent();
        mapRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 19,
        });
      } catch (error) {
        console.error('Error parsing main geometry WKT:', error);
      }
    } else if (center) {
      // Center on provided coordinates
      const utmEPSG = `EPSG:${geometriaSRID}`;
      const webMercatorCenter = transform([center.x, center.y], utmEPSG, 'EPSG:3857');
      mapRef.current.getView().setCenter(webMercatorCenter);
      mapRef.current.getView().setZoom(zoom);
    }
  }, [geometriaWKT, geometriaSRID, center, zoom]);

  // Handle clicked geometry changes
  useEffect(() => {
    if (!clickedVectorSourceRef.current) return;

    clickedVectorSourceRef.current.clear();

    if (clickedGeometryWKT && clickedGeometrySRID) {
      try {
        const format = new WKT();
        const sourceEPSG = `EPSG:${clickedGeometrySRID}`;

        // Parse WKT in original SRID
        const feature = format.readFeature(clickedGeometryWKT, {
          dataProjection: sourceEPSG,
          featureProjection: sourceEPSG,
        });

        // Transform to Web Mercator for display
        feature.getGeometry()?.transform(sourceEPSG, 'EPSG:3857');
        clickedVectorSourceRef.current.addFeature(feature);

        console.log('✅ Clicked parcel drawn in green');
      } catch (error) {
        console.error('Error parsing clicked geometry WKT:', error);
      }
    }
  }, [clickedGeometryWKT, clickedGeometrySRID]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: '400px' }}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Coordinate display overlay */}
      {showCoordinateDisplay && currentCoords && (
        <div className="absolute top-3 left-3 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg text-sm font-mono pointer-events-none z-10">
          {currentCoords}
        </div>
      )}
    </div>
  );
};

export default MapaOLEnhanced;
