import { create } from 'zustand';
import type { ExplorationSession, RelationshipSpace, SpaceRole } from '../../types/space';

type SpaceStore = {
  space: RelationshipSpace | null;
  exploration: ExplorationSession | null;
  role: SpaceRole;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  error: string;
  setConnecting: () => void;
  setSpace: (space: RelationshipSpace, exploration: ExplorationSession, role: SpaceRole) => void;
  setError: (error: string) => void;
  clearSpace: () => void;
};

type PersistedSpace = Pick<SpaceStore, 'space' | 'exploration' | 'role'>;

const storageKey = 'relationship-os-space-store';

function readPersistedSpace(): PersistedSpace {
  if (typeof window === 'undefined') return { space: null, exploration: null, role: null };
  try {
    const value = localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as PersistedSpace) : { space: null, exploration: null, role: null };
  } catch {
    return { space: null, exploration: null, role: null };
  }
}

function writePersistedSpace(value: PersistedSpace) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, JSON.stringify(value));
}

function clearPersistedSpace() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey);
}

const persistedSpace = readPersistedSpace();

export const useSpaceStore = create<SpaceStore>((set) => ({
  space: persistedSpace.space,
  exploration: persistedSpace.exploration,
  role: persistedSpace.role,
  status: persistedSpace.space ? 'connected' : 'idle',
  error: '',
  setConnecting: () => set({ status: 'connecting', error: '' }),
  setSpace: (space, exploration, role) => {
    writePersistedSpace({ space, exploration, role });
    set({ space, exploration, role, status: 'connected', error: '' });
  },
  setError: (error) => set({ status: 'error', error }),
  clearSpace: () => {
    clearPersistedSpace();
    set({ space: null, exploration: null, role: null, status: 'idle', error: '' });
  },
}));
