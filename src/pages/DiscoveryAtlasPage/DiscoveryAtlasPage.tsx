import { useMemo, useState } from 'react';
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { discoveryCategories, discoveryPool } from '../../features/discovery/discoveryPool';
import { mapAreaConfig } from '../../features/map/map.config';
import { t } from '../../i18n';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import type { DiscoveryCategory, DiscoveryRarity, MapArea } from '../../types';

const categoryLabelKey: Record<DiscoveryCategory | 'all', 'all' | 'event' | 'region' | 'journey' | 'special'> = {
  all: 'all',
  event: 'event',
  region: 'region',
  journey: 'journey',
  special: 'special',
};

const rarityLabelKey: Record<DiscoveryRarity | 'all', 'rarityAll' | 'rarityCommon' | 'rarityRare' | 'rarityLegendary'> = {
  all: 'rarityAll',
  common: 'rarityCommon',
  rare: 'rarityRare',
  hidden: 'rarityLegendary',
};

const RARITIES: Array<DiscoveryRarity | 'all'> = ['all', 'common', 'rare', 'hidden'];

const LOCKED_ICON: Record<DiscoveryRarity, string> = {
  common: '❔',
  rare: '✧',
  hidden: '🔒',
};

function isNew(unlockedAt: string): boolean {
  const ts = new Date(unlockedAt).getTime();
  return Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000;
}

export function DiscoveryAtlasPage() {
  const [catFilter, setCatFilter] = useState<DiscoveryCategory | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<DiscoveryRarity | 'all'>('all');
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const unlocked = useDiscoveryStore((state) => state.state.unlocked);
  const stats = useDiscoveryStore((state) => state.stats);

  const unlockedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of unlocked) m.set(item.id, item.unlockedAt);
    return m;
  }, [unlocked]);

  const total = discoveryPool.length;
  const count = unlocked.length;
  const progress = total > 0 ? count / total : 0;

  const rarityCounts = useMemo(() => {
    const c: Record<DiscoveryRarity, number> = { common: 0, rare: 0, hidden: 0 };
    for (const item of discoveryPool) {
      if (unlockedMap.has(item.id)) c[item.rarity]++;
    }
    return c;
  }, [unlockedMap]);

  const favoriteRegion = useMemo(() => {
    let max = 0;
    let key: string | null = null;
    for (const [k, v] of Object.entries(stats.regionCounts)) {
      if (v > max) {
        max = v;
        key = k;
      }
    }
    return key && max > 0 ? { key: key as MapArea, count: max } : null;
  }, [stats]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const visibleCategories = discoveryCategories.filter((c) => catFilter === 'all' || catFilter === c);
  const hasAnyUnlocked = count > 0;

  return (
    <main className="page atlas-page">
      <button className="back-link" type="button" onClick={() => goToStep('home')}>← {t(language, 'back')}</button>

      <section className="atlas-header">
        <div className="atlas-icon">✨</div>
        <h1>{t(language, 'atlasTitle')}</h1>
        <p>{t(language, 'atlasSubtitle')}</p>

        <div className="atlas-progress-ring" role="progressbar" aria-valuenow={count} aria-valuemax={total} aria-label={t(language, 'atlasProgress')}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="atlasProgress" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="50%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="url(#atlasProgress)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="atlas-progress-center">
            <strong>{count}</strong>
            <span>/ {total}</span>
          </div>
        </div>

        <div className="atlas-rarity-bar">
          <span className="rarity-chip common">{t(language, 'rarityCommon')} <em>{rarityCounts.common}</em></span>
          <span className="rarity-chip rare">{t(language, 'rarityRare')} <em>{rarityCounts.rare}</em></span>
          <span className="rarity-chip hidden">{t(language, 'rarityLegendary')} <em>{rarityCounts.hidden}</em></span>
        </div>
      </section>

      <section className="atlas-stats">
        <div className="atlas-stat-card">
          <div className="atlas-stat-num">{stats.completeCount}</div>
          <div className="atlas-stat-label">{t(language, 'statExplorations')}</div>
        </div>
        <div className="atlas-stat-card">
          <div className="atlas-stat-num">{stats.regionVisited.length}<small>/5</small></div>
          <div className="atlas-stat-label">{t(language, 'statRegionsVisited')}</div>
        </div>
        <div className="atlas-stat-card">
          <div className="atlas-stat-num">{favoriteRegion ? mapAreaConfig[favoriteRegion.key].icon : '—'}</div>
          <div className="atlas-stat-label">
            {favoriteRegion ? `${t(language, 'statFavoriteRegion')} · ${mapAreaConfig[favoriteRegion.key].label[language]}` : t(language, 'statFavoriteNone')}
          </div>
        </div>
      </section>

      <section className="filter-tabs">
        {(['all', ...discoveryCategories] as Array<DiscoveryCategory | 'all'>).map((category) => (
          <button key={category} className={catFilter === category ? 'active' : ''} type="button" onClick={() => setCatFilter(category)}>
            {t(language, categoryLabelKey[category])}
          </button>
        ))}
      </section>
      <section className="filter-tabs rarity-tabs">
        {RARITIES.map((r) => (
          <button
            key={r}
            className={`rarity-btn ${r} ${rarityFilter === r ? 'active' : ''}`}
            type="button"
            onClick={() => setRarityFilter(r)}
          >
            {t(language, rarityLabelKey[r])}
          </button>
        ))}
      </section>

      {!hasAnyUnlocked && (
        <section className="atlas-empty">
          <div className="atlas-empty-icon">🌙</div>
          <h2>{t(language, 'atlasEmptyTitle')}</h2>
          <p>{t(language, 'atlasEmptyDesc')}</p>
        </section>
      )}

      <section className="atlas-sections">
        {visibleCategories.map((category) => {
          const items = discoveryPool.filter(
            (item) => item.category === category && (rarityFilter === 'all' || item.rarity === rarityFilter),
          );
          if (items.length === 0) return null;
          const unlockedCount = items.filter((item) => unlockedMap.has(item.id)).length;
          return (
            <section className="atlas-section" key={category}>
              <h2>{t(language, categoryLabelKey[category])} <span>{unlockedCount} / {items.length}</span></h2>
              <div className="discovery-grid">
                {items.map((item, idx) => {
                  const unlockedAt = unlockedMap.get(item.id);
                  const isUnlocked = !!unlockedAt;
                  const copy = getDiscoveryCopy(item, language);
                  const showNew = isUnlocked && unlockedAt ? isNew(unlockedAt) : false;
                  return (
                    <article
                      className={`discovery-card rarity-${item.rarity} ${isUnlocked ? 'unlocked' : 'locked'}`}
                      key={item.id}
                      style={{ animationDelay: `${Math.min(idx, 12) * 45}ms` }}
                    >
                      {showNew && <span className="discovery-new-badge">{t(language, 'newBadge')}</span>}
                      <div className="discovery-icon">{isUnlocked ? item.icon : LOCKED_ICON[item.rarity]}</div>
                      <div className="discovery-body">
                        <div className="discovery-rarity-tag">{t(language, rarityLabelKey[item.rarity])}</div>
                        <h3>{isUnlocked ? copy.title : copy.hint}</h3>
                        <p>{isUnlocked ? copy.message : t(language, 'locked')}</p>
                        {isUnlocked && unlockedAt && (
                          <time className="discovery-time">
                            {t(language, 'atlasUnlockedAt')} {new Date(unlockedAt).toLocaleDateString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                          </time>
                        )}
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
