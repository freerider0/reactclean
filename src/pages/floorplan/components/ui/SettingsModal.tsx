/**
 * SettingsModal - Configuration modal for floorplan settings
 * Displays category-specific settings using subcomponents
 */

import React from 'react';
import type { FloorplanConfig } from '../../types';
import {
  VisibilitySettings,
  SnappingSettings,
  GridSettings,
  WallSettings,
  ApertureSettings
} from './settings';

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
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {/* Render the appropriate settings component based on category */}
            {category === 'visibility' && (
              <VisibilitySettings
                config={config}
                onUpdateConfig={onUpdateConfig}
              />
            )}

            {category === 'snapping' && (
              <SnappingSettings
                config={config}
                onUpdateConfig={onUpdateConfig}
              />
            )}

            {category === 'grid' && (
              <GridSettings
                config={config}
                onUpdateConfig={onUpdateConfig}
                onRecalculateWalls={onRecalculateWalls}
              />
            )}

            {category === 'walls' && (
              <WallSettings
                config={config}
                onUpdateConfig={onUpdateConfig}
                onRecalculateWalls={onRecalculateWalls}
              />
            )}

            {category === 'apertures' && (
              <ApertureSettings
                config={config}
                onUpdateConfig={onUpdateConfig}
              />
            )}

            {/* Show all settings if no category is specified (fallback) */}
            {!category && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Settings</h3>
                <p className="text-xs text-gray-500">
                  Select a settings category from the menu
                </p>
              </div>
            )}
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
