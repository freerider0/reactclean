/**
 * useGeoRefMode hook - manages geo-referencing mode functionality
 * Drag and rotate entire floorplan to position it on the map
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Vertex, Room } from '../types';
import type { GeoReference } from '../types/geo';
import { getFloorplanCentroidUTM } from '@/utils/geo/floorplanGeoTransform';

const DRAG_THRESHOLD = 3; // pixels before starting drag

interface GeoRefDragState {
  isDragging: boolean;
  isRotating: boolean;
  dragStart: Vertex | null;
  originalAnchor?: { x: number; y: number };
  originalRotation?: number;
}

export interface UseGeoRefModeOptions {
  /** Initial geo reference (from cadastral parcel data) */
  initialGeoRef: GeoReference;
  /** Callback when geo reference is updated */
  onGeoRefChange: (geoRef: GeoReference) => void;
  /** Rooms array for calculating centroid */
  rooms: Room[];
  /** Enable snapping to cadastral geometries */
  snapEnabled?: boolean;
}

export function useGeoRefMode({
  initialGeoRef,
  onGeoRefChange,
  rooms,
  snapEnabled = false,
}: UseGeoRefModeOptions) {
  // Store current geoRef in a ref to always have fresh value
  const geoRefRef = useRef(initialGeoRef);

  // Update ref whenever prop changes
  useEffect(() => {
    geoRefRef.current = initialGeoRef;
  }, [initialGeoRef]);

  // Use ref for drag state to avoid stale closures
  const dragStateRef = useRef<GeoRefDragState>({
    isDragging: false,
    isRotating: false,
    dragStart: null,
  });

  const originalRotationRef = useRef<number>(0);

  /**
   * Update geo reference and notify parent
   */
  const updateGeoRef = useCallback(
    (updates: Partial<GeoReference>) => {
      const currentGeoRef = geoRefRef.current;
      const newGeoRef = { ...currentGeoRef, ...updates };
      // console.log('📍 updateGeoRef:', { oldGeoRef: currentGeoRef, updates, newGeoRef });
      onGeoRefChange(newGeoRef);
    },
    [onGeoRefChange]
  );

  /**
   * Start dragging the floorplan (translate operation)
   * Updates the anchor point in UTM coordinates
   */
  const startDrag = useCallback((utmStart: [number, number]) => {
    // Read fresh geoRef from ref
    const currentGeoRef = geoRefRef.current;
    // console.log('🎬 startDrag called:', {
    //   utmStart,
    //   currentAnchor: currentGeoRef.anchor,
    //   geoRefFull: currentGeoRef
    // });

    dragStateRef.current = {
      isDragging: false,
      isRotating: false,
      dragStart: { x: utmStart[0], y: utmStart[1] },
      originalAnchor: { ...currentGeoRef.anchor },
    };

    // console.log('   Stored drag state:', dragStateRef.current);
  }, []);

  /**
   * Update drag - move the floorplan by updating anchor point
   * @param utmCurrent - Current mouse position in UTM coordinates
   */
  const updateDrag = useCallback(
    (utmCurrent: [number, number]) => {
      const dragState = dragStateRef.current;

      if (!dragState.dragStart || !dragState.originalAnchor) {
        // console.log('⚠️ updateDrag: No drag start or original anchor', { dragState });
        return;
      }

      // Calculate delta in UTM coordinates
      const deltaX = utmCurrent[0] - dragState.dragStart.x;
      const deltaY = utmCurrent[1] - dragState.dragStart.y;

      // Check drag threshold (in meters)
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (!dragState.isDragging) {
        if (dist < 0.1) { // 10cm threshold in meters
          return;
        }
        // console.log('✅ Drag threshold passed, starting drag');
        dragStateRef.current = { ...dragState, isDragging: true };
      }

      // Update anchor point directly with UTM delta
      let newAnchor = {
        x: dragState.originalAnchor.x + deltaX,
        y: dragState.originalAnchor.y + deltaY,
      };

      // TODO: Apply snap to cadastral geometries if enabled
      // if (snapEnabled) {
      //   const snapResult = snapToParcel(newAnchor, cadastralData);
      //   if (snapResult.snapped) {
      //     newAnchor = snapResult.position;
      //   }
      // }

      updateGeoRef({ anchor: newAnchor });
    },
    [updateGeoRef, snapEnabled]
  );

  /**
   * End drag operation
   */
  const endDrag = useCallback(() => {
    // console.log('🏁 endDrag called, final anchor:', geoRefRef.current.anchor);
    dragStateRef.current = {
      isDragging: false,
      isRotating: false,
      dragStart: null,
      originalAnchor: undefined,
    };
  }, []);

  /**
   * Start rotation - rotate entire floorplan around anchor point
   */
  const startRotate = useCallback((utmPoint: [number, number]) => {
    const currentGeoRef = geoRefRef.current;
    originalRotationRef.current = currentGeoRef.rotation;

    dragStateRef.current = {
      isDragging: false,
      isRotating: true,
      dragStart: { x: utmPoint[0], y: utmPoint[1] },
      originalRotation: currentGeoRef.rotation,
    };
  }, []);

  /**
   * Update rotation
   * Calculates angle from floorplan centroid to mouse position
   */
  const updateRotate = useCallback(
    (utmPoint: [number, number], snapToIncrements: boolean = false) => {
      const dragState = dragStateRef.current;

      if (!dragState.isRotating) return;

      // Read fresh geoRef from ref
      const currentGeoRef = geoRefRef.current;

      // Calculate centroid of floorplan
      const [centroidX, centroidY] = getFloorplanCentroidUTM(rooms, currentGeoRef);

      // Calculate angle from centroid to mouse
      const dx = utmPoint[0] - centroidX;
      const dy = utmPoint[1] - centroidY;

      let angle = Math.atan2(dy, dx);

      // Apply angle snapping if requested (15-degree increments)
      if (snapToIncrements) {
        const increment = (15 * Math.PI) / 180;
        angle = Math.round(angle / increment) * increment;
      }

      // Normalize angle to [-π, π]
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;

      updateGeoRef({ rotation: angle });
    },
    [updateGeoRef, rooms]
  );

  /**
   * End rotation operation
   */
  const endRotate = useCallback(() => {
    dragStateRef.current = {
      isDragging: false,
      isRotating: false,
      dragStart: null,
      originalRotation: undefined,
    };
    originalRotationRef.current = 0;
  }, []);

  /**
   * Handle wheel event for zooming (scale adjustment)
   */
  const handleWheel = useCallback(
    (deltaY: number) => {
      // Read fresh scale from ref
      const currentGeoRef = geoRefRef.current;
      // Scale factor adjustment
      const scaleDelta = deltaY > 0 ? 0.95 : 1.05;
      const newScale = Math.max(0.1, Math.min(10, currentGeoRef.scale * scaleDelta));

      updateGeoRef({ scale: newScale });
    },
    [updateGeoRef]
  );

  /**
   * Reset geo reference to initial values
   */
  const reset = useCallback(() => {
    // Read fresh initial ref
    const currentInitial = geoRefRef.current;
    onGeoRefChange(currentInitial);
  }, [onGeoRefChange]);

  /**
   * Set rotation to a specific value (in radians)
   */
  const setRotation = useCallback(
    (rotation: number) => {
      updateGeoRef({ rotation });
    },
    [updateGeoRef]
  );

  /**
   * Set scale to a specific value
   */
  const setScale = useCallback(
    (scale: number) => {
      updateGeoRef({ scale: Math.max(0.1, Math.min(10, scale)) });
    },
    [updateGeoRef]
  );

  return {
    startDrag,
    updateDrag,
    endDrag,
    startRotate,
    updateRotate,
    endRotate,
    handleWheel,
    reset,
    setRotation,
    setScale,
  };
}
