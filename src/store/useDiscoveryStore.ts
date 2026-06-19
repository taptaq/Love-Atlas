import { create } from 'zustand';
import { discoveryPool } from '../features/discovery/discoveryPool';
import { getLatestDiscovery, loadAtlasState, loadStats } from '../services/atlasDiscoveryEngine';
import type { AtlasDiscoveryState, AtlasStats, DiscoveryItem } from '../types';

interface DiscoveryStore {
  pool: DiscoveryItem[];
  state: AtlasDiscoveryState;
  stats: AtlasStats;
  latest: DiscoveryItem | null;
  refresh: () => void;
}

export const useDiscoveryStore = create<DiscoveryStore>((set) => ({
  pool: discoveryPool,
  state: loadAtlasState(),
  stats: loadStats(),
  latest: getLatestDiscovery(),
  refresh: () => set({ state: loadAtlasState(), stats: loadStats(), latest: getLatestDiscovery() }),
}));
