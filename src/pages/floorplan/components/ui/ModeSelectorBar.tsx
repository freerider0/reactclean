/**
 * ModeSelectorBar - Mode switcher (Assembly/Draw/Edit)
 */

import React from 'react';
import { EditorMode } from '../../types';

interface ModeSelectorBarProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  canEdit: boolean; // Has a room selected
}

export function ModeSelectorBar({ mode, setMode, canEdit }: ModeSelectorBarProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex bg-white rounded-full shadow-lg overflow-hidden">
        {/* Assembly Mode */}
        <button
          onClick={() => setMode(EditorMode.Assembly)}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.Assembly
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Assembly Mode (A)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Assembly
          </span>
        </button>

        <div className="w-px bg-gray-200" />

        {/* Draw/Add Room Mode */}
        <button
          onClick={() => setMode(EditorMode.Draw)}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.Draw
              ? 'bg-green-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Add Room (D)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Room
          </span>
        </button>

        <div className="w-px bg-gray-200" />

        {/* Edit Mode */}
        <button
          onClick={() => setMode(EditorMode.Edit)}
          disabled={!canEdit}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.Edit
              ? 'bg-blue-500 text-white'
              : canEdit
                ? 'text-gray-700 hover:bg-gray-50'
                : 'text-gray-400 cursor-not-allowed'
          }`}
          title="Edit Mode (E)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </span>
        </button>

        <div className="w-px bg-gray-200" />

        {/* GeoRef Mode */}
        <button
          onClick={() => setMode(EditorMode.GeoRef)}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.GeoRef
              ? 'bg-purple-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Geo-Reference Mode (G)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            GeoRef
          </span>
        </button>
      </div>
    </div>
  );
}
