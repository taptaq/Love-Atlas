import { useEffect, useState } from 'react';
import { GrowthCurve } from '../../components/ui/GrowthCurve';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { RelationshipHealth } from '../../components/ui/RelationshipHealth';
import { TermTooltip } from '../../components/ui/TermTooltip';
import { discoveryPool } from '../../features/discovery/discoveryPool';
import { mapAreaConfig } from '../../features/map/map.config';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import type { MapArea } from '../../types';

const areaOrder: MapArea[] = ['forest', 'coast', 'valley', 'city', 'garden'];

const stateLabel = {
  cn: {
    growth: '正在生长',
    blur: '仍有模糊',
    bright: '变得明亮',
    fluctuate: '正在波动',
    unexplored: '尚未探索',
  },
  en: {
    growth: 'Growing',
    blur: 'Still blurry',
    bright: 'Brightening',
    fluctuate: 'Fluctuating',
    unexplored: 'Unexplored',
  },
};

export function WorldPage() {
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const worldState = useJourneyStore((state) => state.worldState);
  const events = useJourneyStore((state) => state.events);
  const stats = useDiscoveryStore((state) => state.stats);
  const atlasState = useDiscoveryStore((state) => state.state);
  const refreshDiscoveries = useDiscoveryStore((state) => state.refresh);
  const [isLoading, setIsLoading] = useState(false);
  const discoveryProgress = Math.round((atlasState.unlocked.length / discoveryPool.length) * 100);

  useEffect(() => {
    setIsLoading(true);
    Promise.resolve(refreshDiscoveries()).finally(() => setIsLoading(false));
  }, [refreshDiscoveries]);

  return (
    <main className="page flow-page world-page">
      <LoadingOverlay visible={isLoading} message={language === 'cn' ? '正在加载关系世界…' : 'Loading relationship world…'} />
      <button className="back-link" type="button" onClick={() => goToStep('home')}>← {language === 'cn' ? '返回' : 'Back'}</button>

      <section className="flow-header">
        <span className="step-pill">{language === 'cn' ? <TermTooltip explanation={{ cn: '你们每次探索后共同积累的关系地图，会随对话不断变化', en: 'A shared relationship map that evolves with every exploration' }}>关系世界</TermTooltip> : 'Relationship World'}</span>
        <h1>{language === 'cn' ? '我们的关系世界' : 'Our Relationship World'}</h1>
        <p>{language === 'cn' ? '每一次回答、事件和发现都会让地图发生变化。' : 'Every answer, event, and discovery changes the map.'}</p>
      </section>

      <section className="world-stat-grid">
        <article>
          <strong>{stats.completeCount}</strong>
          <span>{language === 'cn' ? '完成旅程' : 'Completed journeys'}</span>
        </article>
        <article>
          <strong>{atlasState.unlocked.length}</strong>
          <span>{language === 'cn' ? '图鉴发现' : 'Atlas discoveries'}</span>
        </article>
        <article>
          <strong>{worldState.visitedRegions.length}</strong>
          <span>{language === 'cn' ? '已访问区域' : 'Visited areas'}</span>
        </article>
        <article>
          <strong>{Object.values(stats.eventCounts).reduce((sum, value) => sum + value, 0)}</strong>
          <span>{language === 'cn' ? '关系事件' : 'Relationship events'}</span>
        </article>
      </section>

      <section className="route-preview-card">
        <span className="eyebrow">{language === 'cn' ? '发现进度' : 'Discovery Progress'}</span>
        <h2>{atlasState.unlocked.length} / {discoveryPool.length}</h2>
        <div className="similarity-meter"><span style={{ width: `${discoveryProgress}%` }} /></div>
      </section>

      <GrowthCurve language={language} />

      <RelationshipHealth language={language} />

      <section className="world-map-grid">
        {areaOrder.map((area) => {
          const config = mapAreaConfig[area];
          const progress = Math.max(worldState.regionProgress[area], stats.regionCounts[area] ? Math.min(100, stats.regionCounts[area] * 18) : 0);
          const regionState = worldState.regionStates[area];
          const isActive = worldState.currentRegion === area;
          return (
            <article className={`world-area-card ${isActive ? 'active' : ''}`} key={area}>
              <div className="world-area-head">
                <span>{config.icon}</span>
                <div>
                  <h2>{config.label[language]}</h2>
                  <p>{config.description[language]}</p>
                </div>
              </div>
              <div className="world-area-progress"><span style={{ width: `${progress}%` }} /></div>
              <div className="world-area-meta">
                <span>{stateLabel[language][regionState]}</span>
                <span>{progress}%</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="summary-grid">
        <article className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? '最近世界变化' : 'Recent World Changes'}</span>
          {worldState.worldChanges.length > 0 ? (
            <div className="summary-list">
              {worldState.worldChanges.slice(-5).reverse().map((change, index) => (
                <div key={`${change.area}-${index}`}>{mapAreaConfig[change.area].icon} {mapAreaConfig[change.area].label[language]} +{change.progressDelta}% · {change.message}</div>
              ))}
            </div>
          ) : (
            <p>{language === 'cn' ? '完成一次探索后，这里会出现地图变化。' : 'Map changes will appear here after a journey.'}</p>
          )}
        </article>

        <article className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? '关系事件' : 'Relationship Events'}</span>
          {events.length > 0 || Object.keys(stats.eventCounts).length > 0 ? (
            <div className="summary-list">
              {Object.entries(stats.eventCounts).map(([event, count]) => (
                <div key={event}>{event} × {count}</div>
              ))}
              {events.slice(-3).map((event, index) => (
                <div key={`${event.type}-${index}`}>{event.icon} {event.title[language]}</div>
              ))}
            </div>
          ) : (
            <p>{language === 'cn' ? 'Mirror 等关系事件触发后会记录在这里。' : 'Mirror and other relationship events will be recorded here.'}</p>
          )}
        </article>
      </section>
    </main>
  );
}
