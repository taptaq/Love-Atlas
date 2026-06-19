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

interface UiStore {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  language: loadLanguage(),
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
}));
