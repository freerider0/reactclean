/**
 * SettingsModal - Configuration modal for floorplan settings
 */

import React from 'react';
import type { FloorplanConfig } from '../../types';

type ConfigCategory = 'visibility' | 'snapping' | 'grid' | 'walls' | 'apertures' | null;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
  onRecalculateWalls?: () => void;
  category?: ConfigCategory;
}

export function SettingsModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onRecalculateWalls,
  category = null
}: SettingsModalProps) {
  if (!isOpen) return null;

  // Get title based on category
  const getTitle = () => {
    switch (category) {
      case 'visibility': return 'Visibility Settings';
      case 'snapping': return 'Snapping Settings';
      case 'grid': return 'Grid Settings';
      case 'walls': return 'Wall Defaults';
      case 'apertures': return 'Aperture Settings';
      default: return 'Floorplan Settings';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
            {/* Visibility Section */}
            {(!category || category === 'visibility') && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Visibility</h3>
              <div className="space-y-3">
                {/* Grid Visibility */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Show Grid</div>
                      <div className="text-xs text-gray-500">Display grid lines on canvas</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ enabled: !config.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Dimensions Visibility */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Show Dimensions</div>
                      <div className="text-xs text-gray-500">Display measurements on walls</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ showDimensions: !config.showDimensions })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.showDimensions ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showDimensions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Debug Lines Visibility */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 4" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Show Debug Lines</div>
                      <div className="text-xs text-gray-500">Display pink/yellow/green reference lines</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ showDebugLines: !config.showDebugLines })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.showDebugLines ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showDebugLines ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Envelope Vertices Visibility */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Show Envelope Vertices</div>
                      <div className="text-xs text-gray-500">Display outer boundary control points</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ showEnvelopeVertices: !config.showEnvelopeVertices })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.showEnvelopeVertices ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showEnvelopeVertices ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Snapping Section */}
            {(!category || category === 'snapping') && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Snapping</h3>
              <div className="space-y-3">
                {/* Grid Snap */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Grid Snapping</div>
                      <div className="text-xs text-gray-500">Snap points to grid intersections</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ snapEnabled: !config.snapEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.snapEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.snapEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Orthogonal Snap */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Orthogonal Snapping</div>
                      <div className="text-xs text-gray-500">Snap to horizontal/vertical/perpendicular lines</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ orthogonalSnapEnabled: !config.orthogonalSnapEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.orthogonalSnapEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.orthogonalSnapEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Grid Settings Section */}
            {(!category || category === 'grid') && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Grid Settings</h3>
              <div className="space-y-3">
                {/* Grid Size */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Grid Size</div>
                      <div className="text-xs text-gray-500">Size of each grid square in centimeters</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateConfig({ size: Math.max(5, config.size - 5) })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      −
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        step="5"
                        value={config.size}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 5 && value <= 100) {
                            onUpdateConfig({ size: value });
                          }
                        }}
                        className="w-16 text-center text-sm font-semibold text-gray-900 bg-transparent border-none focus:outline-none"
                      />
                      <span className="text-sm text-gray-600">cm</span>
                    </div>
                    <button
                      onClick={() => onUpdateConfig({ size: Math.min(100, config.size + 5) })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Major Lines */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Major Grid Lines</div>
                      <div className="text-xs text-gray-500">Draw thicker line every N squares</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateConfig({ majorLines: Math.max(1, config.majorLines - 1) })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      −
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        value={config.majorLines}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 10) {
                            onUpdateConfig({ majorLines: value });
                          }
                        }}
                        className="w-16 text-center text-sm font-semibold text-gray-900 bg-transparent border-none focus:outline-none"
                      />
                      <span className="text-sm text-gray-600">lines</span>
                    </div>
                    <button
                      onClick={() => onUpdateConfig({ majorLines: Math.min(10, config.majorLines + 1) })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Guide Lines Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Helpers</h3>
              <div className="space-y-3">
                {/* Guide Lines */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 4" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Show Guide Lines</div>
                      <div className="text-xs text-gray-500">Display snap alignment guides</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ showGuideLines: !config.showGuideLines })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.showGuideLines ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showGuideLines ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Miter Limit Slider */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Miter Limit</div>
                      <div className="text-xs text-gray-500">Lower = more beveling (less spikes)</div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{(config.miterLimit ?? 2.0).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={config.miterLimit ?? 2.0}
                    onChange={(e) => onUpdateConfig({ miterLimit: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1.0 (More bevels)</span>
                    <span>10.0 (Sharp corners)</span>
                  </div>
                  {onRecalculateWalls && (
                    <button
                      onClick={onRecalculateWalls}
                      className="mt-2 w-full px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors"
                    >
                      Apply & Recalculate Walls
                    </button>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Wall Thicknesses Section */}
            {(!category || category === 'walls') && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Default Wall Thicknesses</h3>
              <div className="space-y-3">
                {/* Interior Wall Thickness */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Interior Wall Thickness</div>
                      <div className="text-xs text-gray-500">For partition walls between rooms</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onUpdateConfig({ defaultInteriorWallThickness: Math.max(5, config.defaultInteriorWallThickness - 1) });
                        onRecalculateWalls?.();
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      −
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                      <input
                        type="number"
                        min="5"
                        max="30"
                        step="1"
                        value={config.defaultInteriorWallThickness}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 5 && value <= 30) {
                            onUpdateConfig({ defaultInteriorWallThickness: value });
                            onRecalculateWalls?.();
                          }
                        }}
                        className="w-16 text-center text-sm font-semibold text-gray-900 bg-transparent border-none focus:outline-none"
                      />
                      <span className="text-sm text-gray-600">cm</span>
                    </div>
                    <button
                      onClick={() => {
                        onUpdateConfig({ defaultInteriorWallThickness: Math.min(30, config.defaultInteriorWallThickness + 1) });
                        onRecalculateWalls?.();
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Exterior Wall Thickness */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Exterior Wall Thickness</div>
                      <div className="text-xs text-gray-500">For structural and outside walls</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onUpdateConfig({ defaultExteriorWallThickness: Math.max(15, config.defaultExteriorWallThickness - 1) });
                        onRecalculateWalls?.();
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      −
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                      <input
                        type="number"
                        min="15"
                        max="50"
                        step="1"
                        value={config.defaultExteriorWallThickness}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 15 && value <= 50) {
                            onUpdateConfig({ defaultExteriorWallThickness: value });
                            onRecalculateWalls?.();
                          }
                        }}
                        className="w-16 text-center text-sm font-semibold text-gray-900 bg-transparent border-none focus:outline-none"
                      />
                      <span className="text-sm text-gray-600">cm</span>
                    </div>
                    <button
                      onClick={() => {
                        onUpdateConfig({ defaultExteriorWallThickness: Math.min(50, config.defaultExteriorWallThickness + 1) });
                        onRecalculateWalls?.();
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Info note */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Changes automatically recalculate all room envelopes with new thickness values.
                  </p>
                </div>
              </div>
            </div>

            {/* UI Preferences Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">UI Preferences</h3>
              <div className="space-y-3">
                {/* Menu Open by Default */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Open Tools Menu on Load</div>
                      <div className="text-xs text-gray-500">Show tools menu by default when loading floorplan</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateConfig({ menuOpenByDefault: !config.menuOpenByDefault })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.menuOpenByDefault ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.menuOpenByDefault ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Keyboard Shortcuts</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Toggle Grid</span>
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">G</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Toggle Snap</span>
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">S</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
