/**
 * useHistory hook - Undo/Redo functionality
 * Simple hook-based command pattern
 */

import { useState, useCallback, useRef } from 'react';

export interface HistoryEntry<T> {
  state: T;
  description: string;
}

export function useHistory<T>(initialState: T, maxHistory: number = 50) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const historyRef = useRef<HistoryEntry<T>[]>([
    { state: initialState, description: 'Initial state' }
  ]);

  /**
   * Push new state to history
   */
  const pushState = useCallback((newState: T, description: string) => {
    // Remove any redo history
    historyRef.current = historyRef.current.slice(0, currentIndex + 1);

    // Add new entry
    historyRef.current.push({ state: newState, description });

    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, maxHistory]);

  /**
   * Undo to previous state
   */
  const undo = useCallback((): T | null => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return historyRef.current[currentIndex - 1].state;
    }
    return null;
  }, [currentIndex]);

  /**
   * Redo to next state
   */
  const redo = useCallback((): T | null => {
    if (currentIndex < historyRef.current.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return historyRef.current[currentIndex + 1].state;
    }
    return null;
  }, [currentIndex]);

  /**
   * Get current state
   */
  const getCurrentState = useCallback((): T => {
    return historyRef.current[currentIndex].state;
  }, [currentIndex]);

  /**
   * Check if can undo/redo
   */
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < historyRef.current.length - 1;

  /**
   * Get history info
   */
  const getHistoryInfo = useCallback(() => {
    return {
      currentIndex,
      totalEntries: historyRef.current.length,
      currentDescription: historyRef.current[currentIndex]?.description || '',
      canUndo,
      canRedo
    };
  }, [currentIndex, canUndo, canRedo]);

  return {
    pushState,
    undo,
    redo,
    getCurrentState,
    canUndo,
    canRedo,
    getHistoryInfo
  };
}
