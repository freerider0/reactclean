/**
 * GeoRefCanvas - OpenLayers map for geo-referencing floorplan
 * Displays floorplan rooms as features on a map with cadastral context
 */

import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { ScaleLine, defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import WKT from 'ol/format/WKT';
import { transform } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import { Feature } from 'ol';
import { Point, Circle as CircleGeom, LineString } from 'ol/geom';
import type { Room } from '../types';
import type { GeoReference } from '../types/geo';
import { defineAllUTMZones, getEPSGCode } from '@/utils/utm';
import { floorplanToFeatures, getFloorplanCentroidUTM } from '@/utils/geo/floorplanGeoTransform';

interface GeoRefCanvasProps {
  /** Floorplan rooms */
  rooms: Room[];
  /** Current geo reference */
  geoRef: GeoReference;
  /** Cadastral parcel WKT (optional - for reference) */
  parcelWKT?: string;
  /** Cadastral parcel SRID */
  parcelSRID?: number;
  /** Building geometries WKT for context (optional) */
  buildingsWKT?: string[];
  buildingsSRID?: number;
  /** Drag start handler */
  onDragStart?: (utmStart: [number, number]) => void;
  /** Drag move handler - passes current UTM position */
  onDragMove?: (utmCurrent: [number, number]) => void;
  /** Drag end handler */
  onDragEnd?: () => void;
  /** Rotate start handler */
  onRotateStart?: (utmPoint: [number, number]) => void;
  /** Rotate move handler */
  onRotateMove?: (utmPoint: [number, number], snapToIncrements: boolean) => void;
  /** Rotate end handler */
  onRotateEnd?: () => void;
  /** Interaction mode */
  interactionMode: 'translate' | 'rotate' | 'none';
  /** CSS class name */
  className?: string;
}

/**
 * GeoRefCanvas component - OpenLayers map for floorplan geo-referencing
 */
export const GeoRefCanvas: React.FC<GeoRefCanvasProps> = ({
  rooms,
  geoRef,
  parcelWKT,
  parcelSRID,
  buildingsWKT = [],
  buildingsSRID,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRotateStart,
  onRotateMove,
  onRotateEnd,
  interactionMode,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const floorplanSourceRef = useRef<VectorSource | null>(null);
  const parcelSourceRef = useRef<VectorSource | null>(null);
  const buildingsSourceRef = useRef<VectorSource | null>(null);
  const rotationHandleSourceRef = useRef<VectorSource | null>(null);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const currentMouseUTMRef = useRef<[number, number] | null>(null); // Track mouse position during rotation
  const [rotationDragCounter, setRotationDragCounter] = useState(0); // Force re-render during rotation
  const hasInitialCenteredRef = useRef(false);
  const hasInitialFloorplanFitRef = useRef(false);

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

    // Create vector source and layer for cadastral parcel (yellow)
    const parcelSource = new VectorSource();
    parcelSourceRef.current = parcelSource;

    const parcelLayer = new VectorLayer({
      source: parcelSource,
      style: new Style({
        stroke: new Stroke({
          color: '#ffcc00',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(255, 204, 0, 0.1)',
        }),
      }),
      zIndex: 5,
    });

    // Create vector source and layer for surrounding buildings (gray)
    const buildingsSource = new VectorSource();
    buildingsSourceRef.current = buildingsSource;

    const buildingsLayer = new VectorLayer({
      source: buildingsSource,
      style: new Style({
        stroke: new Stroke({
          color: '#666666',
          width: 1,
        }),
        fill: new Fill({
          color: 'rgba(100, 100, 100, 0.15)',
        }),
      }),
      zIndex: 6,
    });

    // Create vector source and layer for floorplan (blue with transparency)
    const floorplanSource = new VectorSource();
    floorplanSourceRef.current = floorplanSource;

    const floorplanLayer = new VectorLayer({
      source: floorplanSource,
      style: new Style({
        stroke: new Stroke({
          color: '#0066ff',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(0, 102, 255, 0.3)',
        }),
      }),
      zIndex: 10,
    });

    // Create vector source and layer for rotation handle (red circle)
    const rotationHandleSource = new VectorSource();
    rotationHandleSourceRef.current = rotationHandleSource;

    const rotationHandleLayer = new VectorLayer({
      source: rotationHandleSource,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.5)',
        }),
      }),
      zIndex: 15, // Above floorplan
    });

    // Default center at anchor point (or Barcelona if anchor is 0,0)
    const utmEPSG = `EPSG:${geoRef.srid}`;
    let defaultCenter;

    // If anchor is (0,0), use Barcelona as default center
    if (geoRef.anchor.x === 0 && geoRef.anchor.y === 0) {
      // Barcelona center in UTM Zone 31N: 430000, 4580000
      defaultCenter = transform([430000, 4580000], utmEPSG, 'EPSG:3857');
    } else {
      defaultCenter = transform([geoRef.anchor.x, geoRef.anchor.y], utmEPSG, 'EPSG:3857');
    }

    // Create map
    const map = new Map({
      target: mapContainer.current,
      layers: [pnoaLayer, parcelLayer, buildingsLayer, floorplanLayer, rotationHandleLayer],
      view: new View({
        projection: 'EPSG:3857', // Web Mercator for tiles
        center: defaultCenter,
        zoom: 18,
        maxZoom: 21,
        minZoom: 2,
        constrainResolution: false,
      }),
      controls: defaultControls().extend([
        new ScaleLine({
          units: 'metric',
        }),
      ]),
      interactions: defaultInteractions({
        doubleClickZoom: false, // Disable to avoid conflicts
        dragPan: true, // Always allow pan - we'll control it programmatically
        mouseWheelZoom: true,
        shiftDragZoom: false,
        pinchRotate: false,
        pinchZoom: true,
      }),
    });

    // Get reference to drag pan interaction for dynamic control
    const interactions = map.getInteractions();
    const dragPanInteraction = interactions.getArray().find((i) => i.constructor.name === 'DragPan');

    // Handle pointer down (start drag/rotate)
    map.on('pointerdown', (evt) => {
      // Check if we clicked on the rotation handle
      const clickedHandleFeatures = map.getFeaturesAtPixel(evt.pixel, {
        layerFilter: (layer) => layer === rotationHandleLayer,
      });

      const clickedOnRotationHandle = clickedHandleFeatures && clickedHandleFeatures.length > 0;

      // Check if we clicked on a floorplan feature
      const clickedFeatures = map.getFeaturesAtPixel(evt.pixel, {
        layerFilter: (layer) => layer === floorplanLayer,
      });

      const clickedOnFloorplan = clickedFeatures && clickedFeatures.length > 0;

      // Priority 1: If clicked on rotation handle, start rotation
      if (clickedOnRotationHandle) {
        isDraggingRef.current = true;
        isRotatingRef.current = true; // Mark that we're rotating from handle
        if (dragPanInteraction) dragPanInteraction.setActive(false);
        console.log('🔴 Clicked on rotation handle, starting rotation');

        // Get UTM coordinates and start rotation
        const coordinate = evt.coordinate as Coordinate;
        const utmEPSG = `EPSG:${geoRef.srid}`;
        const utmCoord = transform(coordinate, 'EPSG:3857', utmEPSG) as [number, number];
        if (onRotateStart) {
          onRotateStart(utmCoord);
        }
        return;
      }

      // Priority 2: If in translate/rotate mode, always handle interaction
      // If in none mode, check if we clicked on floorplan to auto-enable translate
      if (interactionMode === 'translate' || interactionMode === 'rotate') {
        isDraggingRef.current = true;
        // Disable map panning when in explicit interaction modes
        if (dragPanInteraction) dragPanInteraction.setActive(false);
      } else if (interactionMode === 'none' && clickedOnFloorplan) {
        // Auto-enable translate mode when dragging floorplan
        isDraggingRef.current = true;
        // Disable map panning when dragging floorplan
        if (dragPanInteraction) dragPanInteraction.setActive(false);
        console.log('🎯 Clicked on floorplan, auto-enabling translate mode');
      } else {
        // Clicked on empty map in 'none' mode - allow map panning
        if (dragPanInteraction) dragPanInteraction.setActive(true);
        return;
      }

      // Get UTM coordinates from click position
      const coordinate = evt.coordinate as Coordinate;
      const utmEPSG = `EPSG:${geoRef.srid}`;
      const utmCoord = transform(coordinate, 'EPSG:3857', utmEPSG) as [number, number];

      if (interactionMode === 'translate' || (interactionMode === 'none' && clickedOnFloorplan)) {
        if (onDragStart) {
          onDragStart(utmCoord);
        }
      } else if (interactionMode === 'rotate') {
        if (onRotateStart) {
          onRotateStart(utmCoord);
        }
      }
    });

    // Handle pointer move (drag/rotate)
    map.on('pointermove', (evt) => {
      if (!isDraggingRef.current) return;

      // Get current UTM coordinates
      const coordinate = evt.coordinate as Coordinate;
      const utmEPSG = `EPSG:${geoRef.srid}`;
      const utmCoord = transform(coordinate, 'EPSG:3857', utmEPSG) as [number, number];

      // Priority 1: If we're rotating from the handle, always rotate
      if (isRotatingRef.current && onRotateMove) {
        // Store current mouse position for handle rendering
        currentMouseUTMRef.current = utmCoord;
        // Force re-render to update handle position
        setRotationDragCounter(prev => prev + 1);

        const snapToIncrements = evt.originalEvent.shiftKey; // Snap with Shift key
        onRotateMove(utmCoord, snapToIncrements);
        return;
      }

      // Priority 2: Allow translate in both explicit translate mode and auto-translate mode (none with floorplan drag)
      if ((interactionMode === 'translate' || interactionMode === 'none') && onDragMove) {
        onDragMove(utmCoord);
      } else if (interactionMode === 'rotate' && onRotateMove) {
        const snapToIncrements = evt.originalEvent.shiftKey; // Snap with Shift key
        onRotateMove(utmCoord, snapToIncrements);
      }
    });

    // Handle pointer up (end drag/rotate)
    map.on('pointerup', () => {
      if (!isDraggingRef.current) return;

      // Check if we were rotating from the handle
      const wasRotating = isRotatingRef.current;

      isDraggingRef.current = false;
      isRotatingRef.current = false;
      currentMouseUTMRef.current = null; // Clear mouse position
      setRotationDragCounter(0); // Reset counter

      // Re-enable map panning after drag ends (if in 'none' mode)
      if (interactionMode === 'none' && dragPanInteraction) {
        dragPanInteraction.setActive(true);
      }

      // Call appropriate end handler
      if (wasRotating && onRotateEnd) {
        onRotateEnd();
      } else if ((interactionMode === 'translate' || interactionMode === 'none') && onDragEnd) {
        onDragEnd();
      } else if (interactionMode === 'rotate' && onRotateEnd) {
        onRotateEnd();
      }
    });

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
  }, []); // Only initialize once

  // Update cadastral parcel layer
  useEffect(() => {
    if (!parcelSourceRef.current || !parcelWKT || !parcelSRID) return;

    parcelSourceRef.current.clear();

    try {
      const format = new WKT();
      const sourceEPSG = `EPSG:${parcelSRID}`;

      const feature = format.readFeature(parcelWKT, {
        dataProjection: sourceEPSG,
        featureProjection: sourceEPSG,
      });

      feature.getGeometry()?.transform(sourceEPSG, 'EPSG:3857');
      parcelSourceRef.current.addFeature(feature);
    } catch (error) {
      console.error('Error parsing parcel WKT:', error);
    }
  }, [parcelWKT, parcelSRID]);

  // Update buildings layer
  useEffect(() => {
    if (!buildingsSourceRef.current || !buildingsWKT || !buildingsSRID) return;

    buildingsSourceRef.current.clear();

    try {
      const format = new WKT();
      const sourceEPSG = `EPSG:${buildingsSRID}`;

      buildingsWKT.forEach((wkt) => {
        const feature = format.readFeature(wkt, {
          dataProjection: sourceEPSG,
          featureProjection: sourceEPSG,
        });

        feature.getGeometry()?.transform(sourceEPSG, 'EPSG:3857');
        buildingsSourceRef.current?.addFeature(feature);
      });
    } catch (error) {
      console.error('Error parsing buildings WKT:', error);
    }
  }, [buildingsWKT, buildingsSRID]);

  // Update floorplan layer when rooms or geoRef changes
  useEffect(() => {
    if (!floorplanSourceRef.current) return;

    floorplanSourceRef.current.clear();

    if (rooms.length === 0) return;

    try {
      // Convert rooms to OpenLayers features
      const features = floorplanToFeatures(rooms, geoRef);

      // Transform features to Web Mercator for display
      const utmEPSG = `EPSG:${geoRef.srid}`;
      features.forEach((feature) => {
        feature.getGeometry()?.transform(utmEPSG, 'EPSG:3857');
        floorplanSourceRef.current?.addFeature(feature);
      });

      // Center on floorplan ONLY on first load, not during drag operations
      if (mapRef.current && floorplanSourceRef.current.getFeatures().length > 0 && !hasInitialFloorplanFitRef.current) {
        const extent = floorplanSourceRef.current.getExtent();
        mapRef.current.getView().fit(extent, {
          padding: [100, 100, 100, 100],
          maxZoom: 20,
        });
        hasInitialFloorplanFitRef.current = true;
        console.log('📍 Fitted view to floorplan extent (initial load only)');
      }
    } catch (error) {
      console.error('Error converting floorplan to features:', error);
    }
  }, [rooms, geoRef]);

  // Update rotation handle position
  useEffect(() => {
    if (!rotationHandleSourceRef.current || rooms.length === 0) return;

    rotationHandleSourceRef.current.clear();

    // Only show rotation handle in rotate or none mode
    if (interactionMode !== 'rotate' && interactionMode !== 'none') {
      return;
    }

    try {
      const utmEPSG = `EPSG:${geoRef.srid}`;

      // Calculate floorplan centroid in UTM coordinates
      const [centroidX, centroidY] = getFloorplanCentroidUTM(rooms, geoRef);

      // Determine handle position:
      // - During drag: use actual mouse position for precise following
      // - When idle: use calculated position 50m from centroid
      let handleX: number;
      let handleY: number;

      if (currentMouseUTMRef.current && isRotatingRef.current) {
        // Use mouse position during drag for precise following
        [handleX, handleY] = currentMouseUTMRef.current;
      } else {
        // Use calculated position at 50m distance when idle
        const handleDistance = 50; // meters
        handleX = centroidX + handleDistance * Math.cos(geoRef.rotation);
        handleY = centroidY + handleDistance * Math.sin(geoRef.rotation);
      }

      // Create circle geometry for the handle
      const handleGeometry = new Point([handleX, handleY]);
      handleGeometry.transform(utmEPSG, 'EPSG:3857');

      const handleFeature = new Feature({
        geometry: handleGeometry,
        type: 'rotation-handle',
      });

      // Style with circle
      handleFeature.setStyle(new Style({
        image: new CircleStyle({
          radius: 12,
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.7)',
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 3,
          }),
        }),
      }));

      rotationHandleSourceRef.current.addFeature(handleFeature);

      // Create a line from centroid to handle (showing rotation axis)
      const lineGeometry = new LineString([
        [centroidX, centroidY],
        [handleX, handleY]
      ]);
      lineGeometry.transform(utmEPSG, 'EPSG:3857');

      const lineFeature = new Feature({
        geometry: lineGeometry,
        type: 'rotation-line',
      });

      lineFeature.setStyle(new Style({
        stroke: new Stroke({
          color: 'rgba(255, 0, 0, 0.5)',
          width: 2,
          lineDash: [5, 5], // Dashed line
        }),
      }));

      rotationHandleSourceRef.current.addFeature(lineFeature);

      console.log('🔴 Rotation handle positioned at:', { centroidX, centroidY, handleX, handleY, rotation: geoRef.rotation, isDragging: isRotatingRef.current });
    } catch (error) {
      console.error('Error creating rotation handle:', error);
    }
  }, [rooms, geoRef, interactionMode, rotationDragCounter]);

  // Re-center map when anchor coordinates change (e.g., when cadastral data loads)
  // Only do this ONCE on initial load, not during drag operations
  useEffect(() => {
    if (!mapRef.current) return;

    // Only re-center if:
    // 1. We have real coordinates (not 0,0)
    // 2. We haven't already centered on initial load
    if ((geoRef.anchor.x !== 0 || geoRef.anchor.y !== 0) && !hasInitialCenteredRef.current) {
      const utmEPSG = `EPSG:${geoRef.srid}`;
      const newCenter = transform([geoRef.anchor.x, geoRef.anchor.y], utmEPSG, 'EPSG:3857');

      console.log('🗺️ Re-centering map to initial coordinates:', geoRef.anchor);
      console.log('   Web Mercator:', newCenter);

      mapRef.current.getView().animate({
        center: newCenter,
        zoom: 20,
        duration: 1000,
      });

      // Mark that we've done the initial centering
      hasInitialCenteredRef.current = true;
    }
  }, [geoRef.anchor.x, geoRef.anchor.y, geoRef.srid]);

  // Update map interactions when mode changes
  useEffect(() => {
    if (!mapRef.current) return;

    const interactions = mapRef.current.getInteractions();
    const dragPan = interactions.getArray().find((i) => i.constructor.name === 'DragPan');

    if (dragPan) {
      // Enable panning in 'none' mode (for background drag), disable in translate/rotate modes
      const shouldEnablePan = interactionMode === 'none';
      dragPan.setActive(shouldEnablePan);
      console.log(`📍 Mode changed to '${interactionMode}', drag pan ${shouldEnablePan ? 'enabled' : 'disabled'}`);
    }
  }, [interactionMode]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: '500px' }}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Mode indicator */}
      <div className="absolute top-3 right-3 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg text-sm font-semibold pointer-events-none z-10">
        {interactionMode === 'translate' && '🔄 Translate Mode (Drag to move)'}
        {interactionMode === 'rotate' && '🔁 Rotate Mode (Drag to rotate, Shift to snap)'}
        {interactionMode === 'none' && '🎯 Smart Mode (Drag floorplan to move • Drag map to pan)'}
      </div>

      {/* Geo reference info */}
      <div className="absolute bottom-3 left-3 bg-white/90 px-4 py-2 rounded-md shadow-lg text-xs font-mono space-y-1 pointer-events-none z-10">
        <div>
          <span className="font-semibold">Anchor:</span> {geoRef.anchor.x.toFixed(2)}, {geoRef.anchor.y.toFixed(2)}
        </div>
        <div>
          <span className="font-semibold">Rotation:</span> {((geoRef.rotation * 180) / Math.PI).toFixed(1)}°
        </div>
        <div>
          <span className="font-semibold">Scale:</span> {geoRef.scale.toFixed(3)}
        </div>
        <div>
          <span className="font-semibold">SRID:</span> {geoRef.srid}
        </div>
      </div>
    </div>
  );
};

export default GeoRefCanvas;
