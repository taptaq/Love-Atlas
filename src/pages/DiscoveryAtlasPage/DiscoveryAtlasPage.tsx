import { useState } from 'react';
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { discoveryCategories, discoveryPool } from '../../features/discovery/discoveryPool';
import { t } from '../../i18n';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import type { DiscoveryCategory } from '../../types';

const categoryLabelKey: Record<DiscoveryCategory | 'all', 'all' | 'event' | 'region' | 'journey' | 'special'> = {
  all: 'all',
  event: 'event',
  region: 'region',
  journey: 'journey',
  special: 'special',
};

export function DiscoveryAtlasPage() {
  const [filter, setFilter] = useState<DiscoveryCategory | 'all'>('all');
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const unlocked = useDiscoveryStore((state) => state.state.unlocked);
  const unlockedIds = new Set(unlocked.map((item) => item.id));

  return (
    <main className="page atlas-page">
      <button className="back-link" type="button" onClick={() => goToStep('home')}>← {t(language, 'back')}</button>
      <section className="atlas-header">
        <div className="atlas-icon">✨</div>
        <h1>{t(language, 'atlasTitle')}</h1>
        <p>{t(language, 'atlasSubtitle')}</p>
        <div className="progress-pill">{t(language, 'discovered')} <strong>{unlocked.length}</strong> / {discoveryPool.length}</div>
      </section>

      <section className="filter-tabs">
        {(['all', ...discoveryCategories] as Array<DiscoveryCategory | 'all'>).map((category) => (
          <button key={category} className={filter === category ? 'active' : ''} type="button" onClick={() => setFilter(category)}>
            {t(language, categoryLabelKey[category])}
          </button>
        ))}
      </section>

      <section className="atlas-sections">
        {discoveryCategories.filter((category) => filter === 'all' || filter === category).map((category) => {
          const items = discoveryPool.filter((item) => item.category === category);
          const unlockedCount = items.filter((item) => unlockedIds.has(item.id)).length;
          return (
            <section className="atlas-section" key={category}>
              <h2>{t(language, categoryLabelKey[category])} <span>{unlockedCount} / {items.length}</span></h2>
              <div className="discovery-grid">
                {items.map((item) => {
                  const isUnlocked = unlockedIds.has(item.id);
                  const copy = getDiscoveryCopy(item, language);
                  return (
                    <article className={`discovery-card ${isUnlocked ? 'unlocked' : 'locked'}`} key={item.id}>
                      <div className="discovery-icon">{isUnlocked ? item.icon : '❓'}</div>
                      <div>
                        <h3>{isUnlocked ? copy.title : '???'}</h3>
                        <p>{isUnlocked ? copy.message : t(language, 'locked')}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
