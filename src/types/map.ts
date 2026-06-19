export type MapArea = 'forest' | 'coast' | 'valley' | 'city' | 'garden';

export type RegionState = 'growth' | 'blur' | 'bright' | 'fluctuate' | 'unexplored';

export interface WorldChange {
  area: MapArea;
  message: string;
  progressDelta: number;
}

export interface WorldState {
  currentRegion: MapArea;
  regionProgress: Record<MapArea, number>;
  regionStates: Record<MapArea, RegionState>;
  visitedRegions: MapArea[];
  worldChanges: WorldChange[];
}
