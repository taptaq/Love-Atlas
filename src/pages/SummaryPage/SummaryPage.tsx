import { useEffect, useState } from 'react';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { discoveryPool } from '../../features/discovery/discoveryPool';
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { mapAreaConfig } from '../../features/map/map.config';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';

export function SummaryPage() {
  const language = useUiStore((state) => state.language);
  const summary = useJourneyStore((state) => state.summary);
  const history = useJourneyStore((state) => state.journeyHistory);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const resetJourney = useJourneyStore((state) => state.resetJourney);
  const refreshDiscoveries = useDiscoveryStore((state) => state.refresh);
  const [isLoading, setIsLoading] = useState(false);
  const discoveries = Array.from(new Set(summary.discoveries))
    .map((id) => discoveryPool.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  useEffect(() => {
    setIsLoading(true);
    Promise.resolve(refreshDiscoveries()).finally(() => setIsLoading(false));
  }, [refreshDiscoveries]);

  return (
    <main className="page flow-page summary-page">
      <LoadingOverlay visible={isLoading} message={language === 'cn' ? '加载中…' : 'Loading…'} />
      <section className="flow-header">
        <span className="step-pill">05 / {language === 'cn' ? '旅程总结' : 'Summary'}</span>
        <h1>{language === 'cn' ? '这次旅程留下了新的痕迹' : 'This journey left new traces'}</h1>
        <p>{summary.resonance || (language === 'cn' ? '你们完成了一次完整探索。' : 'You completed a full exploration.')}</p>
      </section>

      <section className="summary-grid">
        <article className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? '路线' : 'Route'}</span>
          <div className="route-node-list">
            {summary.route.areas.map((area) => (
              <div className="route-node" key={area}>
                <span>{mapAreaConfig[area].icon}</span>
                <strong>{mapAreaConfig[area].label[language]}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? 'AB 互动' : 'AB Interaction'}</span>
          <h2>{history.length} {language === 'cn' ? '个问题已完成' : 'questions completed'}</h2>
          <p>{summary.nextTopic}</p>
        </article>
      </section>

      {(summary.moment?.text || summary.moment?.scene || summary.moment?.imagePreview) && (
        <section className="route-preview-card moment-summary-card">
          <span className="eyebrow">{language === 'cn' ? '此刻信息' : 'Present Moment'}</span>
          <h2>{language === 'cn' ? '此刻如何影响了路线' : 'How this moment shaped the route'}</h2>
          {summary.moment.imagePreview && <img alt={language === 'cn' ? '此刻图片' : 'Present moment'} src={summary.moment.imagePreview} />}
          {summary.moment.text && <p>{summary.moment.text}</p>}
          {summary.moment.imageTags.length > 0 && <p>{summary.moment.imageTags.map((tag) => `#${tag}`).join(' ')}</p>}
          {summary.moment.routeInfluence && <p>{summary.moment.routeInfluence.reason}</p>}
        </section>
      )}

      <section className="route-preview-card">
        <span className="eyebrow">{language === 'cn' ? '世界变化' : 'World Changes'}</span>
        {summary.worldChanges.length > 0 ? (
          <div className="summary-list">
            {summary.worldChanges.map((change, index) => (
              <div key={`${change.area}-${index}`}>{mapAreaConfig[change.area].icon} {mapAreaConfig[change.area].label[language]} +{change.progressDelta}% · {change.message}</div>
            ))}
          </div>
        ) : (
          <p>{language === 'cn' ? '世界变化将在后续探索中积累。' : 'World changes will accumulate in later explorations.'}</p>
        )}
      </section>

      <section className="route-preview-card">
        <span className="eyebrow">{language === 'cn' ? '新发现' : 'New Discoveries'}</span>
        {discoveries.length > 0 ? (
          <div className="discovery-grid">
            {discoveries.map((item) => {
              const copy = getDiscoveryCopy(item, language);
              return (
                <article className="discovery-card unlocked" key={item.id}>
                  <div className="discovery-icon">{item.icon}</div>
                  <div>
                    <h3>{copy.title}</h3>
                    <p>{copy.message}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p>{language === 'cn' ? '这次没有新的图鉴发现，但旅程已经更新了关系世界。' : 'No new atlas discovery this time, but the relationship world was updated.'}</p>
        )}
      </section>

      {summary.events.length > 0 && (
        <section className="route-preview-card">
          <span className="eyebrow">{language === 'cn' ? '关系事件' : 'Relationship Events'}</span>
          <div className="summary-list">
            {summary.events.map((event, index) => (
              <div key={`${event.type}-${index}`}>{event.icon} {event.title[language]}</div>
            ))}
          </div>
        </section>
      )}

      <div className="flow-actions">
        <button type="button" onClick={() => goToStep('home')}>{language === 'cn' ? '返回首页' : 'Back Home'}</button>
        <button className="primary-btn" type="button" onClick={resetJourney}>{language === 'cn' ? '再次探索' : 'Explore Again'}</button>
      </div>
    </main>
  );
}
