export type AppTheme = 'dark' | 'light';

const STORAGE_KEY = 'love-atlas-theme';

export function getStoredTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return 'dark';
}

export function setStoredTheme(theme: AppTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore quota errors
  }
}

export function applyThemeToDocument(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
  const theme = getStoredTheme();
  applyThemeToDocument(theme);
  return theme;
}

export function toggleTheme(): AppTheme {
  const current = getStoredTheme();
  const next: AppTheme = current === 'dark' ? 'light' : 'dark';
  setStoredTheme(next);
  applyThemeToDocument(next);
  return next;
}
