/**
 * LevelManagementModal - Modal for managing building levels (CRUD operations)
 */

import React, { useState } from 'react';
import type { Level } from '../../types';

interface LevelManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: Level[];
  activeLevel: string | null;
  onCreateLevel: (level: Omit<Level, 'id'>) => void;
  onUpdateLevel: (id: string, updates: Partial<Level>) => void;
  onDeleteLevel: (id: string) => void;
  onSetActiveLevel: (id: string) => void;
}

// Helper function to reorder levels
const reorderLevels = (
  levels: Level[],
  levelId: string,
  direction: 'up' | 'down',
  onUpdateLevel: (id: string, updates: Partial<Level>) => void
) => {
  const sortedLevels = [...levels].sort((a, b) => a.order - b.order);
  const currentIndex = sortedLevels.findIndex(l => l.id === levelId);

  if (currentIndex === -1) return;

  if (direction === 'up' && currentIndex > 0) {
    // Swap with level above (lower index, lower order)
    const currentLevel = sortedLevels[currentIndex];
    const levelAbove = sortedLevels[currentIndex - 1];

    onUpdateLevel(currentLevel.id, { order: levelAbove.order });
    onUpdateLevel(levelAbove.id, { order: currentLevel.order });
  } else if (direction === 'down' && currentIndex < sortedLevels.length - 1) {
    // Swap with level below (higher index, higher order)
    const currentLevel = sortedLevels[currentIndex];
    const levelBelow = sortedLevels[currentIndex + 1];

    onUpdateLevel(currentLevel.id, { order: levelBelow.order });
    onUpdateLevel(levelBelow.id, { order: currentLevel.order });
  }
};

export function LevelManagementModal({
  isOpen,
  onClose,
  levels,
  activeLevel,
  onCreateLevel,
  onUpdateLevel,
  onDeleteLevel,
  onSetActiveLevel
}: LevelManagementModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [levelType, setLevelType] = useState<'above' | 'below' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    elevation: 0,
    order: 0
  });

  if (!isOpen) return null;

  // Sort levels by order
  const sortedLevels = [...levels].sort((a, b) => a.order - b.order);

  // Auto-generate level name based on type and existing levels
  const generateLevelName = (type: 'above' | 'below'): { name: string; elevation: number; order: number } => {
    if (type === 'above') {
      // Above ground: Planta Baja (0), Planta 1, Planta 2, etc.
      const aboveGroundLevels = levels.filter(l => l.order >= 0);
      const maxOrder = aboveGroundLevels.length > 0
        ? Math.max(...aboveGroundLevels.map(l => l.order))
        : -1;

      const newOrder = maxOrder + 1;
      const name = newOrder === 0 ? 'Planta Baja' : `Planta ${newOrder}`;
      const elevation = newOrder * 3; // 3 meters per floor

      return { name, elevation, order: newOrder };
    } else {
      // Below ground: Sótano -1, Sótano -2, etc.
      const belowGroundLevels = levels.filter(l => l.order < 0);
      const minOrder = belowGroundLevels.length > 0
        ? Math.min(...belowGroundLevels.map(l => l.order))
        : 0;

      const newOrder = minOrder - 1;
      const name = `Sótano ${Math.abs(newOrder)}`;
      const elevation = newOrder * 3; // -3, -6, etc.

      return { name, elevation, order: newOrder };
    }
  };

  const handleStartCreate = () => {
    setLevelType(null);
    setFormData({
      name: '',
      elevation: 0,
      order: levels.length
    });
    setIsCreating(true);
    setEditingLevelId(null);
  };

  const handleSelectLevelType = (type: 'above' | 'below') => {
    setLevelType(type);
    const generated = generateLevelName(type);
    setFormData(generated);
  };

  const handleStartEdit = (level: Level) => {
    setFormData({
      name: level.name,
      elevation: level.elevation,
      order: level.order
    });
    setEditingLevelId(level.id);
    setIsCreating(false);
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingLevelId(null);
    setLevelType(null);
    setFormData({ name: '', elevation: 0, order: 0 });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a level name');
      return;
    }

    if (isCreating) {
      onCreateLevel({
        name: formData.name.trim(),
        elevation: formData.elevation,
        order: formData.order
      });
    } else if (editingLevelId) {
      onUpdateLevel(editingLevelId, {
        name: formData.name.trim(),
        elevation: formData.elevation,
        order: formData.order
      });
    }

    handleCancelEdit();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this level? This will fail if there are rooms assigned to it.')) {
      onDeleteLevel(id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Levels</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {/* Create Button */}
            {!isCreating && !editingLevelId && (
              <button
                onClick={handleStartCreate}
                className="w-full mb-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Level
              </button>
            )}

            {/* Create/Edit Form */}
            {(isCreating || editingLevelId) && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-blue-500 dark:border-blue-600">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {isCreating ? 'New Level' : 'Edit Level'}
                </h3>

                {/* Level Type Selection (only when creating) */}
                {isCreating && !levelType && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Select level type:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSelectLevelType('above')}
                        className="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">Sobre Rasante</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Above ground</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleSelectLevelType('below')}
                        className="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">Bajo Rasante</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Below ground (basement)</span>
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={handleCancelEdit}
                      className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Form fields (shown after type selection or when editing) */}
                {(levelType || editingLevelId) && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Level Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder="e.g., Planta Baja, Planta 1, Sótano 1"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Elevation (meters)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.elevation}
                          onChange={(e) => setFormData({ ...formData, elevation: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Order
                        </label>
                        <input
                          type="number"
                          value={formData.order}
                          onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                      >
                        {isCreating ? 'Create' : 'Update'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Levels List */}
            <div className="space-y-2">
              {sortedLevels.map((level, index) => (
                <div
                  key={level.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    level.id === activeLevel
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Order arrows */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => reorderLevels(levels, level.id, 'up', onUpdateLevel)}
                          disabled={index === 0}
                          className={`p-0.5 rounded transition-colors ${
                            index === 0
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => reorderLevels(levels, level.id, 'down', onUpdateLevel)}
                          disabled={index === sortedLevels.length - 1}
                          className={`p-0.5 rounded transition-colors ${
                            index === sortedLevels.length - 1
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{level.name}</h3>
                          {level.id === activeLevel && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 dark:bg-blue-700 text-white rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Elevation: {level.elevation}m • Order: {level.order}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {level.id !== activeLevel && (
                        <button
                          onClick={() => onSetActiveLevel(level.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                          title="Make active"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(level)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(level.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>Order determines the vertical stacking of levels</li>
                    <li>Elevation is the physical height in meters</li>
                    <li>You cannot delete a level that has rooms assigned to it</li>
                    <li>Use PageUp/PageDown to switch between levels quickly</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
