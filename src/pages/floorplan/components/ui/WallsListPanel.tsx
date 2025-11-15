/**
 * WallsListPanel - Panel for displaying all walls across all rooms
 * Shows length, angle (degrees + compass direction), height, and type
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Room, WallType, Level } from '../../types';
import { angleToCompassDirection } from '../../utils/geometry';
import { useFloorplanStore } from '../../store/floorplanStore';

interface WallsListPanelProps {
  rooms: Room[];
  levels: Map<string, Level>;
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
  levelId: string;
  levelName: string;
  levelOrder: number;
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
  levels,
  onClose,
  onWallClick
}: WallsListPanelProps) {
  const [hoveredWall, setHoveredWall] = useState<{ roomId: string; wallIndex: number } | null>(null);
  const setHoverWall = useFloorplanStore(state => state.setHoverWall);
  const setHoverRoom = useFloorplanStore(state => state.setHoverRoom);
  const setHoverSegment = useFloorplanStore(state => state.setHoverSegment);

  // Collect all walls from all rooms
  const allWalls = useMemo(() => {
    const walls: WallInfo[] = [];

    for (const room of rooms) {
      // Get level info for this room
      const level = levels.get(room.levelId);
      const levelName = level?.name || 'Unknown Level';
      const levelOrder = level?.order ?? 999; // Unknown levels go to the end

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

        // Calculate wall direction angle in mathematical coordinates (0° = East, counter-clockwise)
        const wallAngleRad = Math.atan2(dy, dx);
        const wallAngleMath = ((wallAngleRad * 180 / Math.PI) + 360) % 360;

        // Calculate normal (outward facing) angle by adding 90° (counter-clockwise in math coords)
        const normalAngleMath = (wallAngleMath + 90) % 360;

        // Convert normal from mathematical coords to CTE/compass coords (0° = North, clockwise)
        // Formula: compass = (90 - math + 360) % 360
        const normalAngleCTE = (90 - normalAngleMath + 360) % 360;

        // Get compass direction based on normal (angleToCompassDirection expects compass angle)
        const compassDirection = angleToCompassDirection(normalAngleMath);

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
              angleDegrees: normalAngleCTE,
              compassDirection,
              height: wall.height || 2.7,
              wallType: segment.wallType,
              isSegment: true,
              levelId: room.levelId,
              levelName,
              levelOrder
            });
          }
        } else {
          // No segments, add the wall itself
          walls.push({
            roomId: room.id,
            roomName: room.name || `Room ${room.id}`,
            wallIndex,
            length: lengthM,
            angleDegrees: normalAngleCTE,
            compassDirection,
            height: wall.height || 2.7,
            wallType: wall.wallType || 'interior_division',
            isSegment: false,
            levelId: room.levelId,
            levelName,
            levelOrder
          });
        }
      }
    }

    return walls;
  }, [rooms, levels]);

  // Group walls by level and sort by level order
  const wallsByLevel = useMemo(() => {
    // Create a map of levelId -> walls
    const grouped = new Map<string, WallInfo[]>();

    for (const wall of allWalls) {
      const existing = grouped.get(wall.levelId);
      if (existing) {
        existing.push(wall);
      } else {
        grouped.set(wall.levelId, [wall]);
      }
    }

    // Convert to array and sort by level order
    const sorted = Array.from(grouped.entries())
      .map(([levelId, walls]) => ({
        levelId,
        levelName: walls[0].levelName,
        levelOrder: walls[0].levelOrder,
        walls
      }))
      .sort((a, b) => a.levelOrder - b.levelOrder);

    return sorted;
  }, [allWalls]);

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

      // If this is a segment, set hover segment
      if (wallInfo.isSegment && wallInfo.segmentIndex !== undefined) {
        setHoverSegment({
          roomId: wallInfo.roomId,
          wallIndex: wallInfo.wallIndex,
          segmentIndex: wallInfo.segmentIndex
        });
      } else {
        setHoverSegment(null);
      }
    } else {
      setHoveredWall(null);
      setHoverRoom(null);
      setHoverWall(null);
      setHoverSegment(null);
    }
  };

  // Cleanup hover state when component unmounts
  useEffect(() => {
    return () => {
      setHoverRoom(null);
      setHoverWall(null);
      setHoverSegment(null);
    };
  }, [setHoverRoom, setHoverWall, setHoverSegment]);

  return (
    <div className="absolute right-4 top-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-96 max-h-[calc(100vh-100px)] overflow-y-auto border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          All Walls ({allWalls.length})
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {wallsByLevel.map((levelGroup) => (
          <div key={levelGroup.levelId}>
            {/* Level header */}
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md mb-2 border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {levelGroup.levelName}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {levelGroup.walls.length} wall{levelGroup.walls.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Walls in this level */}
            <div className="space-y-2">
              {levelGroup.walls.map((wallInfo) => (
                <div
                  key={`${wallInfo.roomId}-${wallInfo.wallIndex}${wallInfo.isSegment ? `-seg-${wallInfo.segmentIndex}` : ''}`}
                  onClick={() => handleWallClick(wallInfo)}
                  onMouseEnter={() => handleWallHover(wallInfo)}
                  onMouseLeave={() => handleWallHover(null)}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {wallInfo.roomName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Wall {wallInfo.wallIndex + 1}{wallInfo.isSegment ? ` (Seg ${wallInfo.segmentIndex! + 1})` : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Length:</span>{' '}
                      <span className="font-medium">{wallInfo.length.toFixed(2)}m</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Height:</span>{' '}
                      <span className="font-medium">{wallInfo.height.toFixed(2)}m</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Angle:</span>{' '}
                      <span className="font-medium">
                        {wallInfo.angleDegrees.toFixed(1)}° ({wallInfo.compassDirection})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>{' '}
                      <span className="font-medium">{WALL_TYPE_LABELS[wallInfo.wallType]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {allWalls.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No walls found
        </div>
      )}
    </div>
  );
}
