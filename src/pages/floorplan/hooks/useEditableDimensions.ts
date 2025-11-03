/**
 * Hook for managing editable dimension labels
 * Allows clicking dimension text to add/edit distance constraints
 */

import { useState, useCallback, useRef } from 'react';
import { Vertex } from '../types';

export interface DimensionLabel {
  roomId: string;
  edgeIndex: number;
  position: { x: number; y: number };  // Screen position
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  currentValue: number;  // Current length in cm
  wallVertices: [Vertex, Vertex];  // The two vertices of this wall
}

export interface EditingDimension {
  roomId: string;
  edgeIndex: number;
  position: { x: number; y: number };
  currentValue: number;
}

export function useEditableDimensions() {
  // Use ref for synchronous access during hit testing
  const dimensionLabelsRef = useRef<Map<string, DimensionLabel>>(new Map());
  const [editingDimension, setEditingDimension] = useState<EditingDimension | null>(null);

  /**
   * Register a dimension label for click detection
   */
  const registerDimensionLabel = useCallback((label: DimensionLabel) => {
    const key = `${label.roomId}_${label.edgeIndex}`;
    dimensionLabelsRef.current.set(key, label);
  }, []);

  /**
   * Clear all dimension labels (call at start of render)
   */
  const clearDimensionLabels = useCallback(() => {
    dimensionLabelsRef.current.clear();
  }, []);

  /**
   * Check if a screen point hits any dimension label
   */
  const hitTestDimensionLabel = useCallback((screenX: number, screenY: number): DimensionLabel | null => {
    console.log(`Hit testing at (${screenX}, ${screenY}), ${dimensionLabelsRef.current.size} labels registered`);
    for (const label of dimensionLabelsRef.current.values()) {
      const { bounds } = label;
      console.log(`  Checking label bounds: x=${bounds.x}, y=${bounds.y}, w=${bounds.width}, h=${bounds.height}`);
      if (
        screenX >= bounds.x &&
        screenX <= bounds.x + bounds.width &&
        screenY >= bounds.y &&
        screenY <= bounds.y + bounds.height
      ) {
        console.log('  HIT!');
        return label;
      }
    }
    console.log('  No hit');
    return null;
  }, []);

  /**
   * Start editing a dimension
   */
  const startEditingDimension = useCallback((label: DimensionLabel) => {
    console.log('startEditingDimension called with:', label);
    const newEditing = {
      roomId: label.roomId,
      edgeIndex: label.edgeIndex,
      position: label.position,
      currentValue: label.currentValue
    };
    console.log('Setting editingDimension to:', newEditing);
    setEditingDimension(newEditing);
  }, []);

  /**
   * Cancel editing
   */
  const cancelEditingDimension = useCallback(() => {
    setEditingDimension(null);
  }, []);

  return {
    editingDimension,
    registerDimensionLabel,
    clearDimensionLabels,
    hitTestDimensionLabel,
    startEditingDimension,
    cancelEditingDimension
  };
}
