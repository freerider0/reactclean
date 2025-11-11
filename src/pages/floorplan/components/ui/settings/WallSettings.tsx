/**
 * WallSettings - Default wall thickness configuration
 */

import React from 'react';
import type { FloorplanConfig } from '../../../types';

interface WallSettingsProps {
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
  onRecalculateWalls?: () => void;
}

export function WallSettings({ config, onUpdateConfig, onRecalculateWalls }: WallSettingsProps) {
  return (
    <div className="space-y-4">
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
            <div className="text-xs text-gray-500">For outer perimeter walls</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onUpdateConfig({ defaultExteriorWallThickness: Math.max(10, config.defaultExteriorWallThickness - 1) });
              onRecalculateWalls?.();
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            −
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <input
              type="number"
              min="10"
              max="50"
              value={config.defaultExteriorWallThickness}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 10 && value <= 50) {
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
  );
}
