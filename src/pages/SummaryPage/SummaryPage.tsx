import { useEffect, useMemo, useState } from 'react';
import { ExplorationFeedback } from '../../components/ui/ExplorationFeedback';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { discoveryPool } from '../../features/discovery/discoveryPool';
import { getDiscoveryCopy } from '../../features/discovery/discoveryI18n';
import { mapAreaConfig } from '../../features/map/map.config';
import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import { loadConversationMemory } from '../../services/conversationMemoryService';

export function SummaryPage() {
  const language = useUiStore((state) => state.language);
  const summary = useJourneyStore((state) => state.summary);
  const history = useJourneyStore((state) => state.journeyHistory);
  const dialogueSummary = useJourneyStore((state) => state.dialogueSummary);
  const dialogueChain = useJourneyStore((state) => state.dialogueChain);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const resetJourney = useJourneyStore((state) => state.resetJourney);
  const refreshDiscoveries = useDiscoveryStore((state) => state.refresh);
  const [isLoading, setIsLoading] = useState(false);
  const cn = language === 'cn';
  const discoveries = Array.from(new Set(summary.discoveries))
    .map((id) => discoveryPool.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // 关系成长对比：基于跨探索记忆，展示"这次 vs 上次"的深度变化
  const growthInsight = useMemo(() => {
    const memory = loadConversationMemory();
    const entries = memory.entries;
    if (entries.length === 0) {
      return { isFirst: true, count: 0, currentAvg: 0, prevAvg: 0, trend: 'first' as const, delta: 0 };
    }
    // 本次探索的相似度（从历史问答计算）
    const currentSims = history.map((item) => item.answers.similarity).filter((s) => s > 0);
    const currentAvg = currentSims.length > 0
      ? Math.round(currentSims.reduce((a, b) => a + b, 0) / currentSims.length)
      : 0;
    const prevEntry = entries[entries.length - 1];
    const prevAvg = prevEntry?.avgSimilarity ?? 0;
    const delta = currentAvg - prevAvg;
    const trend: 'rising' | 'falling' | 'stable' = delta > 5 ? 'rising' : delta < -5 ? 'falling' : 'stable';
    return { isFirst: false, count: entries.length, currentAvg, prevAvg, trend, delta };
  }, [history]);

  useEffect(() => {
    setIsLoading(true);
    Promise.resolve(refreshDiscoveries()).finally(() => setIsLoading(false));
  }, [refreshDiscoveries]);

  return (
    <main className="page flow-page summary-page">
      <LoadingOverlay visible={isLoading} message={language === 'cn' ? '正在生成旅程总结…' : 'Generating journey summary…'} />
      <section className="flow-header">
        <span className="step-pill">05 / {language === 'cn' ? '旅程总结' : 'Summary'}</span>
        <h1>{language === 'cn' ? '这次旅程留下了新的痕迹' : 'This journey left new traces'}</h1>
        <p>{summary.resonance || (language === 'cn' ? '你们完成了一次完整探索。' : 'You completed a full exploration.')}</p>
        {summary.generatedBy === 'ai' && <small>{language === 'cn' ? 'AI 已根据本次问答生成关系洞察' : 'AI generated relationship insight from this journey'}</small>}
      </section>

      {/* 关系成长对比：让用户感知"这次比上次聊得更深了" */}
      <section className="growth-comparison-card reveal-fade-in">
        <span className="eyebrow">{cn ? '🌱 关系成长轨迹' : '🌱 Relationship Growth'}</span>
        {growthInsight.isFirst ? (
          <div className="growth-first">
            <h2>{cn ? '这是你们的第一次深度对话' : 'This is your first deep conversation'}</h2>
            <p>{cn ? '每一次探索都会沉淀下来，慢慢你们会看到关系如何在这条河流里变深。' : 'Each exploration settles here. Over time you will see how your relationship deepens along this river.'}</p>
          </div>
        ) : (
          <div className="growth-comparison">
            <h2>{cn ? `第 ${growthInsight.count + 1} 次探索` : `Exploration #${growthInsight.count + 1}`}</h2>
            <div className="growth-metrics">
              <div className="growth-metric">
                <small>{cn ? '上次平均共鸣' : 'Last avg resonance'}</small>
                <strong>{growthInsight.prevAvg}%</strong>
              </div>
              <span className="growth-arrow">
                {growthInsight.trend === 'rising' ? '↗' : growthInsight.trend === 'falling' ? '↘' : '→'}
              </span>
              <div className="growth-metric growth-metric-current">
                <small>{cn ? '这次平均共鸣' : 'This avg resonance'}</small>
                <strong>{growthInsight.currentAvg}%</strong>
              </div>
            </div>
            <p className="growth-trend-hint">
              {growthInsight.trend === 'rising'
                ? (cn ? `共鸣度上升了 ${growthInsight.delta} 点，你们聊得越来越深了` : `Resonance rose ${growthInsight.delta} points — you are going deeper together`)
                : growthInsight.trend === 'falling'
                  ? (cn ? `共鸣度下降了 ${Math.abs(growthInsight.delta)} 点，这次看到了不同的角度，这也是理解的一部分` : `Resonance dipped ${Math.abs(growthInsight.delta)} points — different angles appeared, and that is part of understanding too`)
                  : (cn ? '共鸣度保持稳定，你们在不同话题里维持着相似的默契' : 'Resonance held steady — a consistent rhythm across different topics')}
            </p>
          </div>
        )}
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
          {summary.differences && <p>{summary.differences}</p>}
          {summary.actionSuggestion && <p>{summary.actionSuggestion}</p>}
        </article>
      </section>

      {dialogueSummary && dialogueChain.length > 0 && (
        <section className="route-preview-card dialogue-summary-summary-card">
          <span className="eyebrow">{cn ? '🔗 深度对话总结' : '🔗 Deep Dialogue Summary'}</span>
          <div className="dialogue-chain-bar">
            {[1, 2, 3].map((d) => (
              <span key={d} className={`chain-dot ${d <= dialogueSummary.completedDepth ? 'active' : ''}`}>
                <small>L{d}</small>
              </span>
            ))}
            <span className="chain-label">
              {dialogueSummary.isCompleted
                ? (cn ? '完整 3 层' : 'Full 3 layers')
                : (cn ? `完成 ${dialogueSummary.completedDepth} 层（未走完）` : `${dialogueSummary.completedDepth} layers (incomplete)`)}
            </span>
          </div>
          <p><strong>{cn ? '认知轨迹' : 'Trajectory'}：</strong>{dialogueSummary.trajectory}</p>
          <p><strong>{cn ? '核心洞察' : 'Key Insight'}：</strong>{dialogueSummary.keyInsight}</p>
          <p><strong>{cn ? '连接建议' : 'Bridge'}：</strong>{dialogueSummary.bridge}</p>
          <p><strong>{cn ? '整合方向' : 'Integration'}：</strong>{dialogueSummary.integration}</p>
          {dialogueChain.length > 0 && (
            <details className="dialogue-chain-details">
              <summary>{cn ? `查看 ${dialogueChain.length} 层追问记录` : `View ${dialogueChain.length} follow-up layers`}</summary>
              {dialogueChain.map((layer) => (
                <div key={layer.depth} className="dialogue-layer-record">
                  <h3>{cn ? `第 ${layer.depth} 层` : `Layer ${layer.depth}`}{layer.revealVisible ? '' : (cn ? '（未完成）' : ' (incomplete)')}</h3>
                  <p className="layer-question">{layer.question.question}</p>
                  {layer.revealVisible && (
                    <>
                      <p><strong>A：</strong>{layer.answerA}</p>
                      <p><strong>B：</strong>{layer.answerB}</p>
                      <p className="layer-similarity">{cn ? '相似度' : 'Similarity'}：{layer.similarity}%</p>
                      {layer.insights && <p className="layer-insight">{layer.insights.resonance}</p>}
                    </>
                  )}
                </div>
              ))}
            </details>
          )}
        </section>
      )}

      {(summary.moment?.text || summary.moment?.scene || summary.moment?.imagePreview) && (
        <section className="route-preview-card moment-summary-card">
          <span className="eyebrow">{language === 'cn' ? '此刻信息' : 'Present Moment'}</span>
          <h2>{language === 'cn' ? '此刻如何影响了路线' : 'How this moment shaped the route'}</h2>
          {summary.moment.imagePreview && <img alt={language === 'cn' ? '此刻图片' : 'Present moment'} src={summary.moment.imagePreview} />}
          {summary.moment.text && <p>{summary.moment.text}</p>}
          {summary.moment.imageTags.length > 0 && <p>{summary.moment.imageTags.map((tag) => `#${tag}`).join(' ')}</p>}
          {summary.moment.imageCaption && (
            <p>{language === 'cn' ? '云端视觉理解：' : 'Cloud vision: '}{summary.moment.imageCaption}</p>
          )}
          {summary.moment.imageOcrText && (
            <p>{language === 'cn' ? '本地 OCR 识别：' : 'Local OCR: '}{summary.moment.imageOcrText}</p>
          )}
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

      <ExplorationFeedback />

      <div className="flow-actions">
        <button type="button" onClick={() => goToStep('home')}>{language === 'cn' ? '返回首页' : 'Back Home'}</button>
        <button className="primary-btn" type="button" onClick={resetJourney}>{language === 'cn' ? '再次探索' : 'Explore Again'}</button>
      </div>
    </main>
  );
}
