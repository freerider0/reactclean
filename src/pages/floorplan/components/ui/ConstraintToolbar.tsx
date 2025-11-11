/**
 * ConstraintToolbar - UI for adding and managing constraints
 * NO MODIFICATIONS TO CORE - This is an additive component only
 */

import React, { useState } from 'react';
import { Room, ConstraintType } from '../../types';
import { UseConstraintsResult } from '../../hooks/useConstraints';

export interface ConstraintToolbarProps {
  room: Room | null;
  constraints: UseConstraintsResult;
  selectedWalls: number[];  // Currently selected edge indices (for adding constraints)
  wallPropertiesPanelOpen?: boolean;  // True if WallPropertiesPanel is showing (to offset position)
}

export const ConstraintToolbar: React.FC<ConstraintToolbarProps> = ({
  room,
  constraints,
  selectedWalls,
  wallPropertiesPanelOpen = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!room) {
    return null;
  }

  // Adjust position if WallPropertiesPanel is open (move down to avoid overlap)
  const topPosition = wallPropertiesPanelOpen ? 'top-[32rem]' : 'top-20';

  // Check what constraints can be added based on selection
  const canAddSingleEdgeConstraint = selectedWalls.length === 1;
  const canAddTwoEdgeConstraint = selectedWalls.length === 2;

  // Helper function to get vertex indices from edge index
  // Edge index i corresponds to the edge from vertex[i] to vertex[i+1]
  const getEdgeVertices = (edgeIndex: number): [number, number] => {
    return [edgeIndex, (edgeIndex + 1) % room.vertices.length];
  };

  /**
   * Handle adding a distance constraint (locks the edge length)
   */
  const handleAddDistance = () => {
    if (!canAddSingleEdgeConstraint) return;
    const [v1, v2] = getEdgeVertices(selectedWalls[0]);
    constraints.addDistanceConstraint(room.id, v1, v2);
  };

  /**
   * Handle adding a horizontal constraint (makes edge horizontal)
   */
  const handleAddHorizontal = () => {
    if (!canAddSingleEdgeConstraint) return;
    const [v1, v2] = getEdgeVertices(selectedWalls[0]);
    constraints.addHorizontalConstraint(room.id, v1, v2);
  };

  /**
   * Handle adding a vertical constraint (makes edge vertical)
   */
  const handleAddVertical = () => {
    if (!canAddSingleEdgeConstraint) return;
    const [v1, v2] = getEdgeVertices(selectedWalls[0]);
    constraints.addVerticalConstraint(room.id, v1, v2);
  };

  /**
   * Handle adding a parallel constraint (makes two edges parallel)
   */
  const handleAddParallel = () => {
    if (!canAddTwoEdgeConstraint) return;
    const [edge1] = getEdgeVertices(selectedWalls[0]);
    const [edge2] = getEdgeVertices(selectedWalls[1]);
    constraints.addParallelConstraint(room.id, edge1, edge2);
  };

  /**
   * Handle adding a perpendicular constraint (makes two edges perpendicular)
   */
  const handleAddPerpendicular = () => {
    if (!canAddTwoEdgeConstraint) return;
    const [edge1] = getEdgeVertices(selectedWalls[0]);
    const [edge2] = getEdgeVertices(selectedWalls[1]);
    constraints.addPerpendicularConstraint(room.id, edge1, edge2);
  };

  /**
   * Handle adding an equal length constraint (makes two edges equal length)
   */
  const handleAddEqualLength = () => {
    if (!canAddTwoEdgeConstraint) return;
    const [edge1] = getEdgeVertices(selectedWalls[0]);
    const [edge2] = getEdgeVertices(selectedWalls[1]);
    constraints.addEqualLengthConstraint(room.id, edge1, edge2);
  };

  /**
   * Handle solving constraints
   */
  const handleSolve = async () => {
    await constraints.solveConstraints(room.id);
  };

  /**
   * Get constraint type display name
   */
  const getConstraintTypeName = (type: ConstraintType): string => {
    switch (type) {
      case ConstraintType.Distance: return 'Distance';
      case ConstraintType.Horizontal: return 'Horizontal';
      case ConstraintType.Vertical: return 'Vertical';
      case ConstraintType.Parallel: return 'Parallel';
      case ConstraintType.Perpendicular: return 'Perpendicular';
      case ConstraintType.Angle: return 'Angle';
      case ConstraintType.Equal: return 'Equal Length';
      default: return type;
    }
  };

  /**
   * Get constraint description
   */
  const getConstraintDescription = (constraint: any): string => {
    const indices = constraint.indices.join(', ');
    if (constraint.type === ConstraintType.Distance && constraint.value) {
      return `v${indices} = ${constraint.value.toFixed(1)}cm`;
    }
    return `v${indices}`;
  };

  return (
    <div className={`absolute ${topPosition} right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden`}>
      {/* Header */}
      <div
        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <span className="font-semibold">Constraints</span>
        </div>
        <div className="flex items-center gap-2">
          {/* DOF Indicator */}
          <div className={`text-xs px-2 py-1 rounded ${
            constraints.overConstrained
              ? 'bg-red-500 text-white'
              : constraints.dof === 0
              ? 'bg-green-500 text-white'
              : 'bg-yellow-500 text-white'
          }`}>
            DOF: {constraints.dof ?? 0}
          </div>
          <svg
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 max-h-[600px] overflow-y-auto">
          {/* Add Constraint Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Add Constraint</h3>

            {/* Single Edge Constraints */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Edge Constraints (select 1 edge)</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={handleAddDistance}
                  disabled={!canAddSingleEdgeConstraint}
                  className={`px-2 py-1 text-xs rounded ${
                    canAddSingleEdgeConstraint
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Lock edge length"
                >
                  Distance
                </button>
                <button
                  onClick={handleAddHorizontal}
                  disabled={!canAddSingleEdgeConstraint}
                  className={`px-2 py-1 text-xs rounded ${
                    canAddSingleEdgeConstraint
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Make edge horizontal"
                >
                  Horizontal
                </button>
                <button
                  onClick={handleAddVertical}
                  disabled={!canAddSingleEdgeConstraint}
                  className={`px-2 py-1 text-xs rounded ${
                    canAddSingleEdgeConstraint
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Make edge vertical"
                >
                  Vertical
                </button>
              </div>
            </div>

            {/* Two Edge Constraints */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Two-Edge Constraints (select 2 edges)</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={handleAddParallel}
                  disabled={!canAddTwoEdgeConstraint}
                  className={`px-2 py-1 text-xs rounded ${
                    canAddTwoEdgeConstraint
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Make two edges parallel"
                >
                  Parallel
                </button>
                <button
                  onClick={handleAddPerpendicular}
                  disabled={!canAddTwoEdgeConstraint}
                  className={`px-2 py-1 text-xs rounded ${
                    canAddTwoEdgeConstraint
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Make two edges perpendicular"
                >
                  Perpendicular
                </button>
                <button
                  onClick={handleAddEqualLength}
                  disabled={!canAddTwoEdgeConstraint}
                  className={`px-2 py-1 text-xs rounded ${
                    canAddTwoEdgeConstraint
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Make two edges equal length"
                >
                  Equal
                </button>
              </div>
            </div>

            {/* Selection hint */}
            {!canAddSingleEdgeConstraint && !canAddTwoEdgeConstraint && (
              <p className="text-xs text-gray-400 italic">
                Click on an edge to add constraints
              </p>
            )}
          </div>

          {/* Active Constraints List */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Active Constraints</h3>
              <span className="text-xs text-gray-500">{room.constraints.length} total</span>
            </div>

            {room.constraints.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No constraints yet</p>
            ) : (
              <div className="space-y-1">
                {room.constraints.map((constraint) => (
                  <div
                    key={constraint.id}
                    className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                      constraint.enabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={constraint.enabled}
                        onChange={() => constraints.toggleConstraint(room.id, constraint.id)}
                        className="w-3 h-3"
                      />
                      <span className={constraint.enabled ? 'text-gray-700' : 'text-gray-400'}>
                        <span className="font-medium">{getConstraintTypeName(constraint.type)}</span>
                        {' '}
                        <span className="text-gray-500">{getConstraintDescription(constraint)}</span>
                      </span>
                    </div>
                    <button
                      onClick={() => constraints.removeConstraint(room.id, constraint.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove constraint"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solve Button */}
          <div>
            <button
              onClick={handleSolve}
              disabled={room.constraints.length === 0 || constraints.isSolving}
              className={`w-full py-2 px-4 rounded font-medium ${
                room.constraints.length === 0 || constraints.isSolving
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : constraints.overConstrained
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {constraints.isSolving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Solving...
                </span>
              ) : (
                'Solve Constraints'
              )}
            </button>

            {/* Warning for over-constrained */}
            {constraints.overConstrained && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Over-constrained (DOF &lt; 0). May not solve correctly.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
