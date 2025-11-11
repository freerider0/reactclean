/**
 * SnappingSettings - Snapping configuration options
 */

import React from 'react';
import type { FloorplanConfig } from '../../../types';

interface SnappingSettingsProps {
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
}

export function SnappingSettings({ config, onUpdateConfig }: SnappingSettingsProps) {
  return (
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

      {/* Keyboard Shortcuts Info */}
      <div className="bg-gray-50 rounded-lg p-3 mt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Keyboard Shortcut</h4>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Toggle Snap</span>
          <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">S</kbd>
        </div>
      </div>
    </div>
  );
}
