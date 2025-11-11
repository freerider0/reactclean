/**
 * GridSettings - Grid configuration options
 */

import React from 'react';
import type { FloorplanConfig } from '../../../types';

interface GridSettingsProps {
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
  onRecalculateWalls?: () => void;
}

export function GridSettings({ config, onUpdateConfig, onRecalculateWalls }: GridSettingsProps) {
  return (
    <div className="space-y-4">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">Major Grid Lines</div>
            <div className="text-xs text-gray-500">Draw thicker line every N grid lines</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateConfig({ majorLines: Math.max(2, config.majorLines - 1) })}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            −
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <input
              type="number"
              min="2"
              max="20"
              value={config.majorLines}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 2 && value <= 20) {
                  onUpdateConfig({ majorLines: value });
                }
              }}
              className="w-16 text-center text-sm font-semibold text-gray-900 bg-transparent border-none focus:outline-none"
            />
            <span className="text-sm text-gray-600">lines</span>
          </div>
          <button
            onClick={() => onUpdateConfig({ majorLines: Math.min(20, config.majorLines + 1) })}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            +
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          Major lines every {config.size * config.majorLines} cm
        </div>
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
            className="mt-2 w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply & Recalculate Walls
          </button>
        )}
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Keyboard Shortcut</h4>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Toggle Grid</span>
          <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">G</kbd>
        </div>
      </div>
    </div>
  );
}
