/**
 * LevelSelector - Bottom bar for level switching and underlevel controls
 */

import React from 'react';
import type { Level } from '../../types';

interface LevelSelectorProps {
  levels: Level[];
  activeLevel: string | null;
  onSelectLevel: (levelId: string) => void;
  showUnderlevel: boolean;
  onToggleUnderlevel: (show: boolean) => void;
  underlevelOpacity: number;
  onChangeOpacity: (opacity: number) => void;
  onOpenLevelManager: () => void;
  hasUnderlevel: boolean; // Whether there's a level below to show
}

export function LevelSelector({
  levels,
  activeLevel,
  onSelectLevel,
  showUnderlevel,
  onToggleUnderlevel,
  underlevelOpacity,
  onChangeOpacity,
  onOpenLevelManager,
  hasUnderlevel
}: LevelSelectorProps) {
  // Sort levels by order
  const sortedLevels = [...levels].sort((a, b) => a.order - b.order);

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2.5">
        {/* Level Dropdown */}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <select
            value={activeLevel || ''}
            onChange={(e) => onSelectLevel(e.target.value)}
            className="px-3 py-1.5 pr-8 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {sortedLevels.map(level => (
              <option key={level.id} value={level.id}>
                {level.name} ({level.elevation}m)
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Show Below Toggle */}
        <label
          className={`flex items-center gap-2 cursor-pointer ${!hasUnderlevel ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={!hasUnderlevel ? 'No level below to show' : 'Show level below with transparency'}
        >
          <input
            type="checkbox"
            checked={showUnderlevel}
            onChange={(e) => onToggleUnderlevel(e.target.checked)}
            disabled={!hasUnderlevel}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Below</span>
        </label>

        {/* Opacity Slider */}
        {showUnderlevel && hasUnderlevel && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2 min-w-[140px]">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={underlevelOpacity * 100}
                onChange={(e) => onChangeOpacity(Number(e.target.value) / 100)}
                className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                title={`Underlevel opacity: ${Math.round(underlevelOpacity * 100)}%`}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[2.5rem] text-right">
                {Math.round(underlevelOpacity * 100)}%
              </span>
            </div>
          </>
        )}

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        {/* Level Manager Button */}
        <button
          onClick={onOpenLevelManager}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Manage levels"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Manage
        </button>
      </div>
    </div>
  );
}
