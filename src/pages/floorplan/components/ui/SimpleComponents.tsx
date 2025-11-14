/**
 * Simple UI Components - Essential floorplan UI elements
 */

import React from 'react';
import { Viewport } from '../../types';

// Room Info Display (Top Left)
export function RoomInfoDisplay({ roomCount }: { roomCount: number }) {
  return (
    <div className="absolute top-4 left-4">
      <div className="bg-white rounded-lg shadow-lg px-4 py-2">
        <div className="text-sm text-gray-600">
          {roomCount === 0
            ? 'No rooms - Click "Add Room" to start'
            : `${roomCount} room${roomCount !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}

// View Control Buttons (Top Right)
interface ViewControlButtonsProps {
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ViewControlButtons({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset
}: ViewControlButtonsProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <div className="flex flex-col bg-white rounded-full shadow-lg overflow-hidden">
        <button
          onClick={onZoomIn}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <div className="h-px bg-gray-200" />
        <button
          onClick={onZoomOut}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
      </div>

      <button
        onClick={onReset}
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Reset View"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
    </div>
  );
}

// Bottom Control Bar
interface BottomControlBarProps {
  gridEnabled: boolean;
  onToggleGrid: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  showDimensions: boolean;
  onToggleDimensions: () => void;
}

export function BottomControlBar({
  gridEnabled,
  onToggleGrid,
  snapEnabled,
  onToggleSnap,
  showDimensions,
  onToggleDimensions
}: BottomControlBarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
      <div className="flex bg-white rounded-full shadow-lg overflow-hidden">
        {/* Grid Toggle */}
        <button
          onClick={onToggleGrid}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            gridEnabled
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Toggle Grid (G)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Grid
          </span>
        </button>

        <div className="w-px bg-gray-200" />

        {/* Snap Toggle */}
        <button
          onClick={onToggleSnap}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            snapEnabled
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Toggle Snap (S)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Snap
          </span>
        </button>

        <div className="w-px bg-gray-200" />

        {/* Dimensions Toggle */}
        <button
          onClick={onToggleDimensions}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            showDimensions
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Toggle Dimensions"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Dimensions
          </span>
        </button>
      </div>
    </div>
  );
}

// Zoom Percentage
export function ZoomPercentage({ zoom }: { zoom: number }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-full px-3 py-1 shadow-lg">
      <span className="text-sm font-medium text-gray-600">
        {(zoom * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// Export/Import Buttons
interface ExportImportButtonsProps {
  onExport: () => void;
  onImport: (file: File) => void;
  onSave?: () => Promise<any>;
  canSave?: boolean;
}

export function ExportImportButtons({ onExport, onImport, onSave, canSave = true }: ExportImportButtonsProps) {
  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(file);
      }
    };
    input.click();
  };

  const handleSaveClick = async () => {
    if (onSave && canSave) {
      const result = await onSave();
      if (result?.success) {
        // console.log('✅ Saved successfully');
      } else {
        console.error('❌ Save failed:', result?.error);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Save Button - Primary action */}
      {onSave && (
        <button
          onClick={handleSaveClick}
          disabled={!canSave}
          className={`rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-white transition-all flex items-center gap-2 ${
            canSave
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          title={canSave ? 'Save Floorplan to Database' : 'Cannot save without property ID'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save
        </button>
      )}

      <button
        onClick={onExport}
        className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
        title="Export Floorplan"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>
      <button
        onClick={handleImportClick}
        className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
        title="Import Floorplan"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import
      </button>
    </div>
  );
}
