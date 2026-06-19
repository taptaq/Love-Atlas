import type { MapArea, WorldState } from '../types';

const WORLD_STORAGE_KEY = 'loveAtlasWorldState';

export const defaultWorldState: WorldState = {
  currentRegion: 'forest',
  regionProgress: { forest: 0, coast: 0, valley: 0, city: 0, garden: 0 },
  regionStates: { forest: 'growth', coast: 'unexplored', valley: 'unexplored', city: 'unexplored', garden: 'unexplored' },
  visitedRegions: [],
  worldChanges: [],
};

function normalizeProgress(progress: Partial<Record<MapArea, number>> | undefined): Record<MapArea, number> {
  return {
    forest: progress?.forest ?? 0,
    coast: progress?.coast ?? 0,
    valley: progress?.valley ?? 0,
    city: progress?.city ?? 0,
    garden: progress?.garden ?? 0,
  };
}

export function loadWorldState(): WorldState {
  try {
    const raw = localStorage.getItem(WORLD_STORAGE_KEY);
    if (!raw) return defaultWorldState;
    const parsed = JSON.parse(raw) as Partial<WorldState>;
    return {
      ...defaultWorldState,
      ...parsed,
      regionProgress: normalizeProgress(parsed.regionProgress),
      regionStates: { ...defaultWorldState.regionStates, ...parsed.regionStates },
      visitedRegions: Array.isArray(parsed.visitedRegions) ? parsed.visitedRegions : [],
      worldChanges: Array.isArray(parsed.worldChanges) ? parsed.worldChanges : [],
    };
  } catch {
    return defaultWorldState;
  }
}

export function saveWorldState(worldState: WorldState): void {
  try {
    localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(worldState));
  } catch {}
}
