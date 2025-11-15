/**
 * ModeSelectorBar - Mode switcher (Assembly/Draw/Edit)
 */

import React from 'react';
import { EditorMode } from '../../types';

interface ModeSelectorBarProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  canEdit: boolean; // Has a room selected
  onCalculateWalls?: () => void;
}

export function ModeSelectorBar({ mode, setMode, canEdit, onCalculateWalls }: ModeSelectorBarProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex bg-white dark:bg-gray-800 rounded-full shadow-lg overflow-hidden">
        {/* Draw/Add Room Mode */}
        <button
          onClick={() => setMode(EditorMode.Draw)}
          className={`px-4 py-2 text-sm font-medium transition-all focus:outline-none ${
            mode === EditorMode.Draw
              ? 'bg-green-500 dark:bg-green-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title="Add Room (D)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </span>
        </button>

        <div className="w-px bg-gray-200 dark:bg-gray-600" />

        {/* GeoRef Mode */}
        <button
          onClick={() => setMode(EditorMode.GeoRef)}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.GeoRef
              ? 'bg-purple-500 dark:bg-purple-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title="Geo-Reference Mode (R)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Georeference
          </span>
        </button>
      </div>
    </div>
  );
}
