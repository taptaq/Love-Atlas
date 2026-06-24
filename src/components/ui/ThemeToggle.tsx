import { useEffect, useState } from 'react';
import { useUiStore } from '../../store';
import { getStoredTheme, toggleTheme, type AppTheme } from '../../services/themeService';

export function ThemeToggle() {
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';
  const [theme, setTheme] = useState<AppTheme>('dark');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  return (
    <button
      className="theme-toggle"
      onClick={handleToggle}
      type="button"
      aria-label={cn ? '切换深色/浅色主题' : 'Toggle dark/light theme'}
      title={cn ? (theme === 'dark' ? '切换到浅色' : '切换到深色') : (theme === 'dark' ? 'Switch to light' : 'Switch to dark')}
    >
      <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
