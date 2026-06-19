import { useEffect, useState } from 'react';
import { loadExplorationDetail, listSpaceExplorations } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { t } from '../../i18n';
import { useJourneyStore, useUiStore } from '../../store';
import type { ExplorationDetailResult, ExplorationSession } from '../../types/space';

function formatDate(language: 'cn' | 'en', value: string) {
  return new Date(value).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function readableList(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join(' · ') : '';
}

export function ExplorationHistoryPage() {
  const language = useUiStore((state) => state.language);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const space = useSpaceStore((state) => state.space);
  const session = useSessionStore((state) => state.session);
  const selectedFromStore = useJourneyStore((state) => state.selectedExplorationId);
  const setSelectedInStore = useJourneyStore((state) => state.setSelectedExplorationId);
  const [explorations, setExplorations] = useState<ExplorationSession[]>([]);
  const [selectedExplorationId, setSelectedExplorationId] = useState('');
  const [explorationDetail, setExplorationDetail] = useState<ExplorationDetailResult | null>(null);

  useEffect(() => {
    if (!space || !session || space.type !== 'persistent') return;
    void listSpaceExplorations(space.id).then((result) => {
      setExplorations(result.explorations);
      const selected = result.explorations.find((item) => item.id === selectedFromStore) ?? result.explorations[0];
      if (selected) {
        setSelectedExplorationId(selected.id);
        setSelectedInStore(selected.id);
        void loadExplorationDetail(selected.id).then(setExplorationDetail).catch(() => setExplorationDetail(null));
      }
    }).catch(() => {
      setExplorations([]);
      setExplorationDetail(null);
    });
  }, [space, session, selectedFromStore, setSelectedInStore]);

  const handleSelectExploration = async (explorationId: string) => {
    try {
      setSelectedExplorationId(explorationId);
      setSelectedInStore(explorationId);
      const detail = await loadExplorationDetail(explorationId);
      setExplorationDetail(detail);
    } catch {
      setExplorationDetail(null);
    }
  };

  return (
    <main className="page flow-page exploration-history-page">
      <button className="back-link" type="button" onClick={() => goToStep('home')}>← {t(language, 'back')}</button>
      <section className="flow-header">
        <span className="step-pill">{language === 'cn' ? '历史探索' : 'Past Explorations'}</span>
        <h1>{language === 'cn' ? '查看你们的探索沉淀' : 'Review your exploration history'}</h1>
        <p>{language === 'cn' ? '点击任意一次探索，可以查看本次 AB 回顾、镜像时刻和总结。' : 'Pick any exploration to review AB, mirror moments, and summaries.'}</p>
      </section>

      <section className="exploration-history-panel">
        <div className="history-list-card">
          <span className="eyebrow">{language === 'cn' ? '历史列表' : 'History List'}</span>
          <div className="history-list">
            {explorations.length === 0 ? (
              <p>{language === 'cn' ? '还没有历史探索。' : 'No past explorations yet.'}</p>
            ) : explorations.map((item, index) => (
              <button className={selectedExplorationId === item.id ? 'history-item history-item-active' : 'history-item'} type="button" key={item.id} onClick={() => void handleSelectExploration(item.id)}>
                <strong>{language === 'cn' ? `探索 ${explorations.length - index}` : `Exploration ${explorations.length - index}`}</strong>
                <span>{formatDate(language, item.created_at)}</span>
                <small>{item.goal ?? item.current_step}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="history-detail-card">
          <span className="eyebrow">{language === 'cn' ? '探索详情' : 'Exploration Detail'}</span>
          {explorationDetail ? (
            <div className="history-detail-grid">
              <section>
                <h3>{language === 'cn' ? '本次 AB 回顾' : 'AB Review'}</h3>
                {explorationDetail.abInteractions.length === 0 ? <p>{language === 'cn' ? '暂无 AB 互动记录。' : 'No AB interactions yet.'}</p> : explorationDetail.abInteractions.map((item) => (
                  <article className="history-mini-card" key={item.id}>
                    <strong>{item.question_text}</strong>
                    <p>A：{item.host_answer || '-'}</p>
                    <p>B：{item.partner_answer || '-'}</p>
                  </article>
                ))}
              </section>
              <section>
                <h3>{language === 'cn' ? '镜像时刻回放' : 'Mirror Replay'}</h3>
                {explorationDetail.mirrorEvents.length === 0 ? <p>{language === 'cn' ? '暂无镜像时刻。' : 'No mirror events yet.'}</p> : explorationDetail.mirrorEvents.map((item) => (
                  <article className="history-mini-card" key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.prompt}</p>
                    {item.host_reflection && <small>{item.host_reflection}</small>}
                  </article>
                ))}
              </section>
              <section>
                <h3>{language === 'cn' ? '总结库' : 'Summary Library'}</h3>
                {explorationDetail.summaries.length === 0 ? <p>{language === 'cn' ? '暂无总结沉淀。' : 'No summaries yet.'}</p> : explorationDetail.summaries.map((item) => (
                  <article className="history-mini-card" key={item.id}>
                    <strong>{item.summary_text}</strong>
                    {readableList(item.highlights) && <p>{language === 'cn' ? '高光：' : 'Highlights: '}{readableList(item.highlights)}</p>}
                    {readableList(item.suggestions) && <p>{language === 'cn' ? '变化：' : 'Changes: '}{readableList(item.suggestions)}</p>}
                  </article>
                ))}
              </section>
            </div>
          ) : (
            <p>{language === 'cn' ? '选择一次历史探索查看详情。' : 'Select an exploration to view details.'}</p>
          )}
        </div>
      </section>
    </main>
  );
}
