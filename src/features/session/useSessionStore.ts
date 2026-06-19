import { create } from 'zustand';
import type { RelationshipSession } from '../../types/session';

type SessionRole = 'host' | 'partner' | null;

type SessionStore = {
  session: RelationshipSession | null;
  role: SessionRole;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  error: string;
  setConnecting: () => void;
  setSession: (session: RelationshipSession, role: SessionRole) => void;
  setError: (error: string) => void;
  clearSession: () => void;
};

type PersistedSession = Pick<SessionStore, 'session' | 'role'>;

const storageKey = 'relationship-os-session-store';

function readPersistedSession(): PersistedSession {
  if (typeof window === 'undefined') return { session: null, role: null };
  try {
    const value = localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as PersistedSession) : { session: null, role: null };
  } catch {
    return { session: null, role: null };
  }
}

function writePersistedSession(value: PersistedSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, JSON.stringify(value));
}

function clearPersistedSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey);
}

const persistedSession = readPersistedSession();

export const useSessionStore = create<SessionStore>((set) => ({
  session: persistedSession.session,
  role: persistedSession.role,
  status: persistedSession.session ? 'connected' : 'idle',
  error: '',
  setConnecting: () => set({ status: 'connecting', error: '' }),
  setSession: (session, role) => {
    writePersistedSession({ session, role });
    set({ session, role, status: 'connected', error: '' });
  },
  setError: (error) => set({ status: 'error', error }),
  clearSession: () => {
    clearPersistedSession();
    set({ session: null, role: null, status: 'idle', error: '' });
  },
}));
