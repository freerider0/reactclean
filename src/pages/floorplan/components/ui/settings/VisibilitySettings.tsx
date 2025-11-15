/**
 * VisibilitySettings - Visibility configuration options
 */

import React from 'react';
import type { FloorplanConfig } from '../../../types';

interface VisibilitySettingsProps {
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
}

export function VisibilitySettings({ config, onUpdateConfig }: VisibilitySettingsProps) {
  return (
    <div className="space-y-3">
      {/* Grid Visibility */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Show Grid</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Display grid lines on canvas</div>
          </div>
        </div>
        <button
          onClick={() => onUpdateConfig({ enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? 'bg-blue-600 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700'
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
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Show Dimensions</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Display measurements on walls</div>
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

      {/* Guide Lines */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 4" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Show Guide Lines</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Display snap alignment guides</div>
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
    </div>
  );
}
