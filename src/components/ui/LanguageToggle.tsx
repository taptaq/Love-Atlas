import { useUiStore } from '../../store';

export function LanguageToggle() {
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);

  return (
    <button className="language-toggle" onClick={toggleLanguage} type="button">
      <span className={language === 'cn' ? 'active' : ''}>中文</span>
      <span>/</span>
      <span className={language === 'en' ? 'active' : ''}>EN</span>
    </button>
  );
}
