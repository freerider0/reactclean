/**
 * useViewport hook - manages pan and zoom state
 * Replaces ViewportController service
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Viewport, Vertex } from '../types';

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1.0
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_SPEED = 0.001;
const ZOOM_SMOOTHNESS = 0.15; // Smooth zoom interpolation
const PAN_SMOOTHNESS = 0.2; // Smooth pan interpolation
const MOMENTUM_DECAY = 0.92; // Pan momentum decay

export function useViewport(initialViewport: Viewport = DEFAULT_VIEWPORT) {
  const [viewport, setViewport] = useState<Viewport>(initialViewport);

  // Target viewport for smooth interpolation
  const targetViewportRef = useRef<Viewport>(initialViewport);

  // Pan state
  const panStateRef = useRef<{
    isPanning: boolean;
    startPoint: Vertex | null;
    startViewport: Viewport | null;
    lastPoint: Vertex | null;
    velocity: Vertex;
  }>({
    isPanning: false,
    startPoint: null,
    startViewport: null,
    lastPoint: null,
    velocity: { x: 0, y: 0 }
  });

  // Smooth interpolation animation
  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      setViewport(current => {
        const target = targetViewportRef.current;

        // Smooth interpolation towards target
        const newViewport = {
          x: current.x + (target.x - current.x) * PAN_SMOOTHNESS,
          y: current.y + (target.y - current.y) * PAN_SMOOTHNESS,
          zoom: current.zoom + (target.zoom - current.zoom) * ZOOM_SMOOTHNESS
        };

        // Apply momentum if not panning
        if (!panStateRef.current.isPanning && (Math.abs(panStateRef.current.velocity.x) > 0.1 || Math.abs(panStateRef.current.velocity.y) > 0.1)) {
          targetViewportRef.current = {
            ...target,
            x: target.x + panStateRef.current.velocity.x,
            y: target.y + panStateRef.current.velocity.y
          };
          panStateRef.current.velocity = {
            x: panStateRef.current.velocity.x * MOMENTUM_DECAY,
            y: panStateRef.current.velocity.y * MOMENTUM_DECAY
          };
        }

        return newViewport;
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  /**
   * Start panning
   */
  const startPan = useCallback((screenPoint: Vertex) => {
    panStateRef.current = {
      isPanning: true,
      startPoint: screenPoint,
      startViewport: { ...targetViewportRef.current },
      lastPoint: screenPoint,
      velocity: { x: 0, y: 0 }
    };
  }, []);

  /**
   * Update pan position
   * Returns true if panning is active
   */
  const updatePan = useCallback((screenPoint: Vertex): boolean => {
    const state = panStateRef.current;
    if (!state.isPanning || !state.startPoint || !state.startViewport) {
      return false;
    }

    const dx = screenPoint.x - state.startPoint.x;
    const dy = screenPoint.y - state.startPoint.y;

    // Calculate velocity for momentum
    if (state.lastPoint) {
      state.velocity = {
        x: screenPoint.x - state.lastPoint.x,
        y: screenPoint.y - state.lastPoint.y
      };
    }
    state.lastPoint = screenPoint;

    // Update target viewport for smooth interpolation
    targetViewportRef.current = {
      ...state.startViewport,
      x: state.startViewport.x + dx,
      y: state.startViewport.y + dy
    };

    return true;
  }, []);

  /**
   * End panning - apply momentum
   */
  const endPan = useCallback(() => {
    // Keep velocity for momentum, will decay automatically
    panStateRef.current.isPanning = false;
    panStateRef.current.startPoint = null;
    panStateRef.current.startViewport = null;
  }, []);

  /**
   * Handle wheel zoom - instant under cursor
   */
  const handleWheel = useCallback((deltaY: number, mousePosition: Vertex) => {
    // Stop momentum when zooming
    panStateRef.current.velocity = { x: 0, y: 0 };

    const currentTarget = targetViewportRef.current;
    const zoomFactor = 1 - deltaY * ZOOM_SPEED;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentTarget.zoom * zoomFactor));

    if (newZoom === currentTarget.zoom) return;

    // Zoom towards mouse position
    const scaleChange = newZoom / currentTarget.zoom;
    const newX = mousePosition.x - (mousePosition.x - currentTarget.x) * scaleChange;
    const newY = mousePosition.y - (mousePosition.y - currentTarget.y) * scaleChange;

    const newViewport = {
      x: newX,
      y: newY,
      zoom: newZoom
    };

    // Set both target and viewport immediately for instant zoom under cursor
    targetViewportRef.current = newViewport;
    setViewport(newViewport);
  }, []);

  /**
   * Set zoom level directly - smooth
   */
  const setZoom = useCallback((zoom: number, center?: Vertex) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const currentTarget = targetViewportRef.current;

    if (center) {
      // Zoom towards center point
      const scaleChange = newZoom / currentTarget.zoom;
      const newX = center.x - (center.x - currentTarget.x) * scaleChange;
      const newY = center.y - (center.y - currentTarget.y) * scaleChange;

      targetViewportRef.current = {
        x: newX,
        y: newY,
        zoom: newZoom
      };
    } else {
      targetViewportRef.current = {
        ...currentTarget,
        zoom: newZoom
      };
    }
  }, []);

  /**
   * Reset viewport to default - smooth
   */
  const resetViewport = useCallback(() => {
    targetViewportRef.current = DEFAULT_VIEWPORT;
    // Reset momentum
    panStateRef.current.velocity = { x: 0, y: 0 };
  }, []);

  /**
   * Pan to specific position - smooth
   */
  const panTo = useCallback((x: number, y: number) => {
    targetViewportRef.current = {
      ...targetViewportRef.current,
      x,
      y
    };
  }, []);

  /**
   * Fit content to viewport - smooth
   */
  const fitToContent = useCallback((
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasWidth: number,
    canvasHeight: number,
    padding: number = 50
  ) => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    if (contentWidth === 0 || contentHeight === 0) return;

    const zoomX = (canvasWidth - padding * 2) / contentWidth;
    const zoomY = (canvasHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, MAX_ZOOM);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    targetViewportRef.current = {
      x: canvasWidth / 2 - centerX * newZoom,
      y: canvasHeight / 2 - centerY * newZoom,
      zoom: newZoom
    };
  }, []);

  return {
    viewport,
    startPan,
    updatePan,
    endPan,
    handleWheel,
    setZoom,
    resetViewport,
    panTo,
    fitToContent,
    isPanning: panStateRef.current.isPanning
  };
}
