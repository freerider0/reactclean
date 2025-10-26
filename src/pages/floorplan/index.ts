/**
 * Floorplan editor - Clean React-first architecture
 * No ECS, no global stores, just React hooks and pure functions
 */

export { FloorplanPage } from './FloorplanPage';
export { useFloorplan } from './hooks/useFloorplan';
export { useViewport } from './hooks/useViewport';
export { useDrawing } from './hooks/useDrawing';
export { useSelection } from './hooks/useSelection';

export * from './types';
