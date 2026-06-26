import { create } from 'zustand';
import { discoveryPool } from '../features/discovery/discoveryPool';
import { getLatestDiscovery, loadAtlasState, loadStats } from '../services/atlasDiscoveryEngine';
import type { AtlasDiscoveryState, AtlasStats, DiscoveryItem } from '../types';

interface DiscoveryStore {
  pool: DiscoveryItem[];
  state: AtlasDiscoveryState;
  stats: AtlasStats;
  latest: DiscoveryItem | null;
  pendingUnlocks: DiscoveryItem[];
  refresh: () => void;
  addPendingUnlocks: (items: DiscoveryItem[]) => void;
  acknowledgeUnlock: (id: string) => void;
  acknowledgeAllUnlocks: () => void;
}

export const useDiscoveryStore = create<DiscoveryStore>((set) => ({
  pool: discoveryPool,
  state: loadAtlasState(),
  stats: loadStats(),
  latest: getLatestDiscovery(),
  pendingUnlocks: [],
  refresh: () => set({ state: loadAtlasState(), stats: loadStats(), latest: getLatestDiscovery() }),
  addPendingUnlocks: (items) => {
    if (items.length === 0) return;
    set((s) => ({
      pendingUnlocks: [...s.pendingUnlocks, ...items],
      latest: items[items.length - 1],
    }));
  },
  acknowledgeUnlock: (id) => {
    set((s) => ({ pendingUnlocks: s.pendingUnlocks.filter((item) => item.id !== id) }));
  },
  acknowledgeAllUnlocks: () => {
    set({ pendingUnlocks: [] });
  },
}));
