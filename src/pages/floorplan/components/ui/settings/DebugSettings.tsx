/**
 * DebugSettings - Debug and visualization configuration options
 */

import React from 'react';
import type { FloorplanConfig } from '../../../types';

interface DebugSettingsProps {
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
}

export function DebugSettings({ config, onUpdateConfig }: DebugSettingsProps) {
  return (
    <div className="space-y-3">
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

      {/* Wall Type Segments */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-900">Show Wall Type Colors</div>
            <div className="text-xs text-gray-500">Color code wall segments by type</div>
          </div>
        </div>
        <button
          onClick={() => onUpdateConfig({ showWallTypeSegments: !config.showWallTypeSegments })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.showWallTypeSegments ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.showWallTypeSegments ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Half Walls Visibility */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-900">Show Half Walls</div>
            <div className="text-xs text-gray-500">Display light gray half-thickness walls</div>
          </div>
        </div>
        <button
          onClick={() => onUpdateConfig({ showHalfWalls: !config.showHalfWalls })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.showHalfWalls ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.showHalfWalls ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Info section */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex gap-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-900">
            <div className="font-medium mb-1">Debug Lines:</div>
            <ul className="space-y-0.5 ml-3">
              <li><span className="text-pink-600 font-bold">Pink:</span> Centerline (wall center)</li>
              <li><span className="text-yellow-600 font-bold">Yellow:</span> Inner boundary (exterior walls)</li>
              <li><span className="text-green-600 font-bold">Green:</span> Contracted envelope</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
