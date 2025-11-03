/**
 * WallPropertiesPanel - Panel for editing wall properties
 * Based on the original WallInspector.tsx
 */

import React, { useState, useEffect } from 'react';
import { Room, WallType, Aperture } from '../../types';

interface WallPropertiesPanelProps {
  room: Room;
  wallIndex: number;
  onUpdateWallThickness: (wallIndex: number, thickness: number) => void;
  onUpdateWallType: (wallIndex: number, wallType: WallType) => void;
  onUpdateWallHeight: (wallIndex: number, height: number) => void;
  onUpdateWallApertures: (wallIndex: number, apertures: Aperture[]) => void;
  onClose: () => void;
}

const WALL_TYPE_LABELS: Record<WallType, string> = {
  'exterior': 'Exterior Wall',
  'interior_division': 'Interior Division',
  'interior_structural': 'Interior Structural',
  'interior_partition': 'Interior Partition',
  'terrain_contact': 'Terrain Contact',
  'adiabatic': 'Adiabatic'
};

const WALL_TYPE_DESCRIPTIONS: Record<WallType, string> = {
  'exterior': 'External building envelope',
  'interior_division': 'Divides internal spaces',
  'interior_structural': 'Load-bearing interior wall',
  'interior_partition': 'Non-structural partition',
  'terrain_contact': 'Wall in contact with ground',
  'adiabatic': 'No heat transfer (adjacent heated space)'
};

export function WallPropertiesPanel({
  room,
  wallIndex,
  onUpdateWallThickness,
  onUpdateWallType,
  onUpdateWallHeight,
  onUpdateWallApertures,
  onClose
}: WallPropertiesPanelProps) {
  const wall = room.walls[wallIndex];

  // Local state for responsive UI
  const [localThickness, setLocalThickness] = useState(wall.thickness);
  const [localHeight, setLocalHeight] = useState(wall.height || 2.7);
  const [localWallType, setLocalWallType] = useState<WallType>(wall.wallType || 'interior_division');
  const [localApertures, setLocalApertures] = useState<Aperture[]>(wall.apertures || []);

  // Update local state when wall changes
  useEffect(() => {
    setLocalThickness(wall.thickness);
    setLocalHeight(wall.height || 2.7);
    setLocalWallType(wall.wallType || 'interior_division');
    setLocalApertures(wall.apertures || []);
  }, [wall, wallIndex]);

  // Get wall vertices for display
  const v1Index = wall.vertexIndex;
  const v2Index = (wall.vertexIndex + 1) % room.vertices.length;
  const v1 = room.vertices[v1Index];
  const v2 = room.vertices[v2Index];

  // Calculate wall length in pixels (cm) and meters
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const lengthPx = Math.sqrt(dx * dx + dy * dy);
  const lengthM = lengthPx / 100; // Convert to meters

  const handleThicknessChange = (thickness: number) => {
    setLocalThickness(thickness);
    onUpdateWallThickness(wallIndex, thickness);
  };

  const handleWallTypeChange = (wallType: WallType) => {
    setLocalWallType(wallType);
    onUpdateWallType(wallIndex, wallType);
  };

  const handleHeightChange = (height: number) => {
    setLocalHeight(height);
    onUpdateWallHeight(wallIndex, height);
  };

  // Aperture handlers
  const startPlacingAperture = (type: 'door' | 'window') => {
    const newAperture: Aperture = {
      id: crypto.randomUUID(),
      type,
      anchorVertex: 'start',
      distance: lengthM / 2 - (type === 'door' ? 0.45 : 0.6), // Center the aperture
      width: type === 'door' ? 0.9 : 1.2, // 90cm door, 120cm window
      height: type === 'door' ? 2.1 : 1.2, // 210cm door, 120cm window
      sillHeight: type === 'window' ? 0.9 : undefined // 90cm sill for windows
    };

    const updatedApertures = [...localApertures, newAperture];
    setLocalApertures(updatedApertures);
    onUpdateWallApertures(wallIndex, updatedApertures);
  };

  const removeAperture = (apertureId: string) => {
    const updatedApertures = localApertures.filter(a => a.id !== apertureId);
    setLocalApertures(updatedApertures);
    onUpdateWallApertures(wallIndex, updatedApertures);
  };

  const updateApertureWidth = (apertureId: string, width: number) => {
    const updatedApertures = localApertures.map(a =>
      a.id === apertureId ? { ...a, width } : a
    );
    setLocalApertures(updatedApertures);
    onUpdateWallApertures(wallIndex, updatedApertures);
  };

  const updateApertureHeight = (apertureId: string, height: number) => {
    const updatedApertures = localApertures.map(a =>
      a.id === apertureId ? { ...a, height } : a
    );
    setLocalApertures(updatedApertures);
    onUpdateWallApertures(wallIndex, updatedApertures);
  };

  const updateApertureSillHeight = (apertureId: string, sillHeight: number) => {
    const updatedApertures = localApertures.map(a =>
      a.id === apertureId ? { ...a, sillHeight } : a
    );
    setLocalApertures(updatedApertures);
    onUpdateWallApertures(wallIndex, updatedApertures);
  };

  const updateApertureDistance = (apertureId: string, distance: number, fromVertex: 'start' | 'end') => {
    const updatedApertures = localApertures.map(a => {
      if (a.id === apertureId) {
        return { ...a, distance, anchorVertex: fromVertex };
      }
      return a;
    });
    setLocalApertures(updatedApertures);
    onUpdateWallApertures(wallIndex, updatedApertures);
  };

  return (
    <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Wall Inspector
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Wall Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wall Type
          </label>
          <select
            value={localWallType}
            onChange={(e) => handleWallTypeChange(e.target.value as WallType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(WALL_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {WALL_TYPE_DESCRIPTIONS[localWallType]}
          </p>
        </div>

        {/* Thickness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thickness (cm)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={localThickness}
              onChange={(e) => handleThicknessChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min="5"
              max="50"
              step="1"
              value={Math.round(localThickness)}
              onChange={(e) => handleThicknessChange(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Height (m)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="2.0"
              max="5.0"
              step="0.1"
              value={localHeight}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min="2.0"
              max="5.0"
              step="0.1"
              value={localHeight}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Wall Information */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Information</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Room ID:</span>
              <span className="font-mono">{room.id.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Wall Index:</span>
              <span>{wallIndex}</span>
            </div>
            <div className="flex justify-between">
              <span>Start:</span>
              <span>({Math.round(v1.x)}, {Math.round(v1.y)})</span>
            </div>
            <div className="flex justify-between">
              <span>End:</span>
              <span>({Math.round(v2.x)}, {Math.round(v2.y)})</span>
            </div>
          </div>
        </div>

        {/* Apertures Section */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Apertures</h4>

          {/* Add Aperture Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => startPlacingAperture('door')}
              className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              + Add Door
            </button>
            <button
              onClick={() => startPlacingAperture('window')}
              className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              + Add Window
            </button>
          </div>

          {/* Aperture List */}
          <div className="space-y-2">
            {localApertures.length > 0 ? (
              localApertures.map((aperture) => (
                <div key={aperture.id} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {aperture.type === 'door' ? '🚪 Door' : '🪟 Window'}
                    </span>
                    <button
                      onClick={() => removeAperture(aperture.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {/* Position from vertices */}
                    <div className="border-b pb-1 mb-1">
                      <div className="font-medium mb-1">Position</div>
                      <div className="flex items-center gap-2">
                        {/* Visual indicator */}
                        <div className="flex items-center bg-gray-200 rounded px-1 py-0.5 text-xs">
                          <span className={aperture.anchorVertex === 'start' ? 'font-bold' : 'text-gray-400'}>◀</span>
                          <span className="mx-1">─</span>
                          <span className="text-gray-600">{Math.round(aperture.distance * 100)}cm</span>
                          <span className="mx-1">→</span>
                          <span className="bg-blue-500 text-white px-1 rounded">
                            {aperture.type === 'door' ? 'Door' : 'Win'}
                          </span>
                          <span className="mx-1">←</span>
                          <span className="text-gray-600">{Math.round((lengthM - aperture.distance - aperture.width) * 100)}cm</span>
                          <span className="mx-1">─</span>
                          <span className={aperture.anchorVertex === 'end' ? 'font-bold' : 'text-gray-400'}>▶</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs">Distance from:</span>
                        <select
                          value={aperture.anchorVertex}
                          onChange={(e) => {
                            const newAnchor = e.target.value as 'start' | 'end';
                            if (newAnchor !== aperture.anchorVertex) {
                              // Calculate new distance when switching anchor
                              const currentDistFromOther = lengthM - aperture.distance - aperture.width;
                              updateApertureDistance(aperture.id, currentDistFromOther, newAnchor);
                            }
                          }}
                          className="text-xs px-1 py-0.5 border rounded"
                        >
                          <option value="start">Left (CCW start)</option>
                          <option value="end">Right (CCW end)</option>
                        </select>
                        <input
                          type="number"
                          value={Math.round(aperture.distance * 100)}
                          onChange={(e) => {
                            const distanceM = parseFloat(e.target.value) / 100;
                            updateApertureDistance(aperture.id, distanceM, aperture.anchorVertex);
                          }}
                          className="w-14 px-1 border rounded text-xs"
                          min="0"
                          step="5"
                        />
                        <span className="text-xs">cm</span>
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={Math.round(aperture.width * 100)}
                          onChange={(e) => updateApertureWidth(aperture.id, parseFloat(e.target.value) / 100)}
                          className="w-16 px-1 border rounded"
                          min="50"
                          max="300"
                          step="10"
                        />
                        <span>cm</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={Math.round(aperture.height * 100)}
                          onChange={(e) => updateApertureHeight(aperture.id, parseFloat(e.target.value) / 100)}
                          className="w-16 px-1 border rounded"
                          min="50"
                          max="250"
                          step="10"
                        />
                        <span>cm</span>
                      </div>
                    </div>
                    {aperture.type === 'window' && (
                      <div className="flex justify-between">
                        <span>Sill:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={Math.round((aperture.sillHeight || 0.9) * 100)}
                            onChange={(e) => updateApertureSillHeight(aperture.id, parseFloat(e.target.value) / 100)}
                            className="w-16 px-1 border rounded"
                            min="0"
                            max="200"
                            step="10"
                          />
                          <span>cm</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No doors or windows</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
