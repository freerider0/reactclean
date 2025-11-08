/**
 * GeoRefToolbar - Toolbar controls for geo-referencing mode
 * Provides buttons for translate, rotate, reset, and snap controls
 */

import React, { useState } from 'react';
import type { GeoReference } from '../types/geo';

interface GeoRefToolbarProps {
  /** Current interaction mode */
  interactionMode: 'translate' | 'rotate' | 'none';
  /** Set interaction mode */
  onModeChange: (mode: 'translate' | 'rotate' | 'none') => void;
  /** Snap enabled state */
  snapEnabled: boolean;
  /** Toggle snap */
  onSnapToggle: () => void;
  /** Current geo reference */
  geoRef: GeoReference;
  /** Set rotation manually (in degrees) */
  onRotationChange: (degrees: number) => void;
  /** Set scale manually */
  onScaleChange: (scale: number) => void;
  /** Reset to initial geo reference */
  onReset: () => void;
  /** CSS class name */
  className?: string;
}

/**
 * GeoRefToolbar component
 */
export const GeoRefToolbar: React.FC<GeoRefToolbarProps> = ({
  interactionMode,
  onModeChange,
  snapEnabled,
  onSnapToggle,
  geoRef,
  onRotationChange,
  onScaleChange,
  onReset,
  className = '',
}) => {
  const [rotationInput, setRotationInput] = useState<string>('');
  const [scaleInput, setScaleInput] = useState<string>('');

  const handleRotationSubmit = () => {
    const degrees = parseFloat(rotationInput);
    if (!isNaN(degrees)) {
      onRotationChange(degrees);
      setRotationInput('');
    }
  };

  const handleScaleSubmit = () => {
    const scale = parseFloat(scaleInput);
    if (!isNaN(scale) && scale > 0) {
      onScaleChange(scale);
      setScaleInput('');
    }
  };

  const currentRotationDegrees = ((geoRef.rotation * 180) / Math.PI).toFixed(1);

  return (
    <div className={`flex items-center gap-3 bg-white border border-gray-300 rounded-lg p-3 shadow-md ${className}`}>
      {/* Mode buttons */}
      <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
        <span className="text-sm font-semibold text-gray-700">Mode:</span>
        <button
          onClick={() => onModeChange('translate')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            interactionMode === 'translate'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Drag to move the floorplan"
        >
          🔄 Translate
        </button>
        <button
          onClick={() => onModeChange('rotate')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            interactionMode === 'rotate'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Drag to rotate the floorplan (Shift to snap to 15°)"
        >
          🔁 Rotate
        </button>
        <button
          onClick={() => onModeChange('none')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            interactionMode === 'none'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="Pan and zoom the map"
        >
          👁️ View
        </button>
      </div>

      {/* Snap toggle */}
      <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={onSnapToggle}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Snap to Cadastre</span>
        </label>
      </div>

      {/* Manual rotation input */}
      <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
        <label className="text-sm font-medium text-gray-700">Rotation:</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={rotationInput}
            onChange={(e) => setRotationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRotationSubmit();
              }
            }}
            placeholder={currentRotationDegrees}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">°</span>
          <button
            onClick={handleRotationSubmit}
            className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={!rotationInput}
          >
            Set
          </button>
        </div>
      </div>

      {/* Manual scale input */}
      <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
        <label className="text-sm font-medium text-gray-700">Scale:</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={scaleInput}
            onChange={(e) => setScaleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleScaleSubmit();
              }
            }}
            placeholder={geoRef.scale.toFixed(3)}
            step="0.01"
            min="0.1"
            max="10"
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleScaleSubmit}
            className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={!scaleInput}
          >
            Set
          </button>
        </div>
      </div>

      {/* Geo reference info display */}
      <div className="flex flex-col text-xs font-mono text-gray-600 border-r border-gray-300 pr-3">
        <div>
          <span className="font-semibold">X:</span> {geoRef.anchor.x.toFixed(2)} m
        </div>
        <div>
          <span className="font-semibold">Y:</span> {geoRef.anchor.y.toFixed(2)} m
        </div>
      </div>

      <div className="flex flex-col text-xs font-mono text-gray-600 border-r border-gray-300 pr-3">
        <div>
          <span className="font-semibold">SRID:</span> {geoRef.srid}
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title="Reset to initial position"
      >
        🔄 Reset
      </button>
    </div>
  );
};

export default GeoRefToolbar;
