import { create } from 'zustand';
import type { ExplorationSession, RelationshipSpace, SpaceRole } from '../../types/space';

type SpaceStore = {
  space: RelationshipSpace | null;
  exploration: ExplorationSession | null;
  role: SpaceRole;
  isCompanion: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  error: string;
  setConnecting: () => void;
  setSpace: (space: RelationshipSpace, exploration: ExplorationSession, role: SpaceRole, isCompanion?: boolean) => void;
  setError: (error: string) => void;
  clearSpace: () => void;
};

type PersistedSpace = Pick<SpaceStore, 'space' | 'exploration' | 'role' | 'isCompanion'>;

const storageKey = 'relationship-os-space-store';

function readPersistedSpace(): PersistedSpace {
  if (typeof window === 'undefined') return { space: null, exploration: null, role: null, isCompanion: false };
  try {
    const value = localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as PersistedSpace) : { space: null, exploration: null, role: null, isCompanion: false };
  } catch {
    return { space: null, exploration: null, role: null, isCompanion: false };
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
  isCompanion: persistedSpace.isCompanion ?? false,
  status: persistedSpace.space ? 'connected' : 'idle',
  error: '',
  setConnecting: () => set({ status: 'connecting', error: '' }),
  setSpace: (space, exploration, role, isCompanion = false) => {
    writePersistedSpace({ space, exploration, role, isCompanion });
    set({ space, exploration, role, isCompanion, status: 'connected', error: '' });
  },
  setError: (error) => set({ status: 'error', error }),
  clearSpace: () => {
    clearPersistedSpace();
    set({ space: null, exploration: null, role: null, isCompanion: false, status: 'idle', error: '' });
  },
}));
