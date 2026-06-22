import { create } from 'zustand';
import type { Language } from '../types';

const LANGUAGE_KEY = 'loveAtlasLang';

function loadLanguage(): Language {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return value === 'en' ? 'en' : 'cn';
  } catch {
    return 'cn';
  }
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

interface UiStore {
  language: Language;
  syncStatus: SyncStatus;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  language: loadLanguage(),
  syncStatus: 'online',
  toggleLanguage: () => {
    const language: Language = get().language === 'cn' ? 'en' : 'cn';
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {}
    set({ language });
  },
  setLanguage: (language) => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {}
    set({ language });
  },
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}));
