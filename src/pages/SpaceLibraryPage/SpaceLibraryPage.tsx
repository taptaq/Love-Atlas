import { useEffect, useState } from 'react';
import { loadSpaceLibrary } from '../../features/session/spaceService';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { t } from '../../i18n';
import { useJourneyStore, useUiStore } from '../../store';
import type { SpaceLibraryResult } from '../../types/space';

function formatDate(language: 'cn' | 'en', value: string) {
  return new Date(value).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function readableList(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join(' · ') : '';
}

export function SpaceLibraryPage() {
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const space = useSpaceStore((state) => state.space);
  const [library, setLibrary] = useState<SpaceLibraryResult>({ discoveries: [], summaries: [] });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!space) return;
    void loadSpaceLibrary(space.id).then(setLibrary).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load library'));
  }, [space]);

  return (
    <main className="page flow-page space-library-page">
      <button className="back-link" type="button" onClick={() => goToStep('home')}>← {t(language, 'back')}</button>
      <section className="flow-header">
        <span className="step-pill">{language === 'cn' ? '长期沉淀' : 'Long-term Library'}</span>
        <h1>{language === 'cn' ? '你们的发现库与总结库' : 'Your discovery and summary library'}</h1>
        <p>{language === 'cn' ? '把多次探索里沉淀下来的发现、总结和变化集中查看。' : 'Review discoveries, summaries, and changes collected across explorations.'}</p>
      </section>

      {message && <p className="session-error">{message}</p>}

      <section className="library-grid">
        <article className="library-column">
          <span className="eyebrow">{language === 'cn' ? '发现库' : 'Discoveries'}</span>
          {library.discoveries.length === 0 ? (
            <p>{language === 'cn' ? '暂无长期发现。完成更多探索后会出现在这里。' : 'No discoveries yet. Complete more explorations to fill this space.'}</p>
          ) : library.discoveries.map((item) => (
            <div className="library-card" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.content}</p>
              {item.tags.length > 0 && <small>{item.tags.join(' · ')}</small>}
              <time>{formatDate(language, item.created_at)}</time>
            </div>
          ))}
        </article>

        <article className="library-column">
          <span className="eyebrow">{language === 'cn' ? '总结库' : 'Summaries'}</span>
          {library.summaries.length === 0 ? (
            <p>{language === 'cn' ? '暂无长期总结。每次探索结束后会逐步沉淀。' : 'No summaries yet. They will accumulate after completed explorations.'}</p>
          ) : library.summaries.map((item) => (
            <div className="library-card" key={item.id}>
              <strong>{item.summary_text}</strong>
              {readableList(item.highlights) && <p>{language === 'cn' ? '高光：' : 'Highlights: '}{readableList(item.highlights)}</p>}
              {readableList(item.suggestions) && <p>{language === 'cn' ? '建议：' : 'Suggestions: '}{readableList(item.suggestions)}</p>}
              <time>{formatDate(language, item.created_at)}</time>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}
