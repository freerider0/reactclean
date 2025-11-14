/**
 * WallsListPanel - Panel for displaying all walls across all rooms
 * Shows length, angle (degrees + compass direction), height, and type
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Room, WallType } from '../../types';
import { angleToCompassDirection } from '../../utils/geometry';
import { useFloorplanStore } from '../../store/floorplanStore';

interface WallsListPanelProps {
  rooms: Room[];
  onClose: () => void;
  onWallClick?: (roomId: string, wallIndex: number) => void;
}

interface WallInfo {
  roomId: string;
  roomName: string;
  wallIndex: number;
  segmentIndex?: number; // If this is a segment
  length: number; // in meters
  angleDegrees: number;
  compassDirection: string;
  height: number; // in meters
  wallType: WallType;
  isSegment: boolean;
}

const WALL_TYPE_LABELS: Record<WallType, string> = {
  'exterior': 'Exterior',
  'interior_division': 'Interior Division',
  'interior_structural': 'Interior Structural',
  'interior_partition': 'Interior Partition',
  'terrain_contact': 'Terrain Contact',
  'adiabatic': 'Adiabatic',
  'neighbor_same_block': 'Neighbor (Same)',
  'neighbor_other_block': 'Neighbor (Other)'
};

export function WallsListPanel({
  rooms,
  onClose,
  onWallClick
}: WallsListPanelProps) {
  const [hoveredWall, setHoveredWall] = useState<{ roomId: string; wallIndex: number } | null>(null);
  const setHoverWall = useFloorplanStore(state => state.setHoverWall);
  const setHoverRoom = useFloorplanStore(state => state.setHoverRoom);

  // Collect all walls from all rooms
  const allWalls = useMemo(() => {
    const walls: WallInfo[] = [];

    for (const room of rooms) {
      // Determine which vertex array to use
      const wallsUseEnvelope = room.walls.some(w => w.vertexIndex >= room.vertices.length);
      const sourceVertices = wallsUseEnvelope && room.envelopeVertices && room.envelopeVertices.length > 0
        ? room.envelopeVertices
        : room.vertices;

      for (let wallIndex = 0; wallIndex < room.walls.length; wallIndex++) {
        const wall = room.walls[wallIndex];

        // Get wall vertices
        const v1 = sourceVertices[wall.vertexIndex];
        const v2 = sourceVertices[(wall.vertexIndex + 1) % sourceVertices.length];

        // Calculate length
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const lengthM = Math.sqrt(dx * dx + dy * dy) / 100; // Convert cm to meters

        // Calculate angle in degrees
        const angleRad = Math.atan2(dy, dx);
        const angleDegrees = ((angleRad * 180 / Math.PI) + 360) % 360;

        // Get compass direction
        const compassDirection = angleToCompassDirection(angleDegrees);

        // If wall has segments, add each segment separately
        if (wall.segments && wall.segments.length > 0) {
          for (let segmentIndex = 0; segmentIndex < wall.segments.length; segmentIndex++) {
            const segment = wall.segments[segmentIndex];

            // For segments, we need to calculate their individual lengths
            // For now, we'll use the full wall length divided by number of segments
            // (In reality, segments might have different lengths)
            const segmentLength = lengthM / wall.segments.length;

            walls.push({
              roomId: room.id,
              roomName: room.name || `Room ${room.id}`,
              wallIndex,
              segmentIndex,
              length: segmentLength,
              angleDegrees,
              compassDirection,
              height: wall.height || 2.7,
              wallType: segment.wallType,
              isSegment: true
            });
          }
        } else {
          // No segments, add the wall itself
          walls.push({
            roomId: room.id,
            roomName: room.name || `Room ${room.id}`,
            wallIndex,
            length: lengthM,
            angleDegrees,
            compassDirection,
            height: wall.height || 2.7,
            wallType: wall.wallType || 'interior_division',
            isSegment: false
          });
        }
      }
    }

    return walls;
  }, [rooms]);

  const handleWallClick = (wallInfo: WallInfo) => {
    if (onWallClick) {
      onWallClick(wallInfo.roomId, wallInfo.wallIndex);
    }
  };

  const handleWallHover = (wallInfo: WallInfo | null) => {
    if (wallInfo) {
      setHoveredWall({ roomId: wallInfo.roomId, wallIndex: wallInfo.wallIndex });
      setHoverRoom(wallInfo.roomId);
      setHoverWall(wallInfo.wallIndex);
    } else {
      setHoveredWall(null);
      setHoverRoom(null);
      setHoverWall(null);
    }
  };

  // Cleanup hover state when component unmounts
  useEffect(() => {
    return () => {
      setHoverRoom(null);
      setHoverWall(null);
    };
  }, [setHoverRoom, setHoverWall]);

  return (
    <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg p-4 w-96 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          All Walls ({allWalls.length})
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

      <div className="space-y-2">
        {allWalls.map((wallInfo, index) => (
          <div
            key={`${wallInfo.roomId}-${wallInfo.wallIndex}${wallInfo.isSegment ? `-seg-${wallInfo.segmentIndex}` : ''}`}
            onClick={() => handleWallClick(wallInfo)}
            onMouseEnter={() => handleWallHover(wallInfo)}
            onMouseLeave={() => handleWallHover(null)}
            className="p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm text-gray-900">
                {wallInfo.roomName}
              </span>
              <span className="text-xs text-gray-500">
                Wall {wallInfo.wallIndex + 1}{wallInfo.isSegment ? ` (Seg ${wallInfo.segmentIndex! + 1})` : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="text-gray-500">Length:</span>{' '}
                <span className="font-medium">{wallInfo.length.toFixed(2)}m</span>
              </div>
              <div>
                <span className="text-gray-500">Height:</span>{' '}
                <span className="font-medium">{wallInfo.height.toFixed(2)}m</span>
              </div>
              <div>
                <span className="text-gray-500">Angle:</span>{' '}
                <span className="font-medium">
                  {wallInfo.angleDegrees.toFixed(1)}° ({wallInfo.compassDirection})
                </span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>{' '}
                <span className="font-medium">{WALL_TYPE_LABELS[wallInfo.wallType]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {allWalls.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No walls found
        </div>
      )}
    </div>
  );
}
