import { useEffect, useState } from 'react';
import { loadExplorationDetail, listSpaceExplorations } from '../../features/session/spaceService';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { t } from '../../i18n';
import { formatDate, readableList } from '../../lib/format';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useJourneyStore, useUiStore } from '../../store';
import type { ExplorationDetailResult, ExplorationSession } from '../../types/space';

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
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    if (!space || !session || space.type !== 'persistent') {
      setIsListLoading(false);
      return;
    }
    setIsListLoading(true);
    void listSpaceExplorations(space.id).then((result) => {
      setExplorations(result.explorations);
      const selected = result.explorations.find((item) => item.id === selectedFromStore) ?? result.explorations[0];
      if (selected) {
        setSelectedExplorationId(selected.id);
        setSelectedInStore(selected.id);
        setIsDetailLoading(true);
        void loadExplorationDetail(selected.id).then(setExplorationDetail).catch(() => setExplorationDetail(null)).finally(() => setIsDetailLoading(false));
      } else {
        setSelectedExplorationId('');
        setExplorationDetail(null);
      }
    }).catch(() => {
      setExplorations([]);
      setExplorationDetail(null);
    }).finally(() => {
      setIsListLoading(false);
    });
  }, [space, session, selectedFromStore, setSelectedInStore]);

  const handleSelectExploration = async (explorationId: string) => {
    try {
      setSelectedExplorationId(explorationId);
      setSelectedInStore(explorationId);
      setExplorationDetail(null);
      setIsDetailLoading(true);
      const detail = await loadExplorationDetail(explorationId);
      setExplorationDetail(detail);
    } catch {
      setExplorationDetail(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <main className="page flow-page exploration-history-page">
      <LoadingOverlay visible={isListLoading} message={language === 'cn' ? '正在加载历史探索…' : 'Loading exploration history…'} />
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
            {isListLoading ? (
              <div className="detail-skeleton-list" aria-label={language === 'cn' ? '正在加载历史探索' : 'Loading exploration history'}>
                <span />
                <span />
                <span />
              </div>
            ) : explorations.length === 0 ? (
              <div className="detail-empty-state">
                <strong>{language === 'cn' ? '还没有历史探索' : 'No past explorations yet'}</strong>
                <p>{language === 'cn' ? '完成一次探索后，这里会自动出现可回看的记录。' : 'Completed explorations will appear here for review.'}</p>
                <button type="button" onClick={() => goToStep('setup')}>{language === 'cn' ? '开始一次探索' : 'Start Exploring'}</button>
              </div>
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
          {isDetailLoading ? (
            <div className="detail-loading-state" aria-label={language === 'cn' ? '正在加载探索详情' : 'Loading exploration detail'}>
              <div className="loading-orbit" />
              <strong>{language === 'cn' ? '正在整理这次探索' : 'Preparing this exploration'}</strong>
              <p>{language === 'cn' ? 'AB 回顾、镜像时刻和总结会在这里展开。' : 'AB review, mirror moments, and summaries will unfold here.'}</p>
              <div className="detail-skeleton-grid">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : explorationDetail ? (
            <div className="history-detail-grid">
              <section>
                <h3>{language === 'cn' ? '本次 AB 回顾' : 'AB Review'}</h3>
                {explorationDetail.abInteractions.length === 0 ? <div className="detail-empty-state detail-empty-state-compact"><strong>{language === 'cn' ? '暂无 AB 互动' : 'No AB interactions'}</strong><p>{language === 'cn' ? '这次探索还没有保存问答记录。' : 'No saved question records for this exploration.'}</p></div> : explorationDetail.abInteractions.map((item) => (
                  <article className="history-mini-card" key={item.id}>
                    <strong>{item.question_text}</strong>
                    <p>A：{item.host_answer || '-'}</p>
                    <p>B：{item.partner_answer || '-'}</p>
                  </article>
                ))}
              </section>
              <section>
                <h3>{language === 'cn' ? '镜像时刻回放' : 'Mirror Replay'}</h3>
                {explorationDetail.mirrorEvents.length === 0 ? <div className="detail-empty-state detail-empty-state-compact"><strong>{language === 'cn' ? '暂无镜像时刻' : 'No mirror moments'}</strong><p>{language === 'cn' ? '本次探索没有触发镜像事件。' : 'No mirror event was triggered this time.'}</p></div> : explorationDetail.mirrorEvents.map((item) => (
                  <article className="history-mini-card" key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.prompt}</p>
                    {item.host_reflection && <small>{item.host_reflection}</small>}
                  </article>
                ))}
              </section>
              <section>
                <h3>{language === 'cn' ? '总结库' : 'Summary Library'}</h3>
                {explorationDetail.summaries.length === 0 ? <div className="detail-empty-state detail-empty-state-compact"><strong>{language === 'cn' ? '暂无总结' : 'No summary yet'}</strong><p>{language === 'cn' ? '结束探索后，总结会沉淀到这里。' : 'Summaries are saved here after an exploration ends.'}</p></div> : explorationDetail.summaries.map((item) => (
                  <article className="history-mini-card" key={item.id}>
                    <strong>{item.summary_text}</strong>
                    {readableList(item.highlights) && <p>{language === 'cn' ? '高光：' : 'Highlights: '}{readableList(item.highlights)}</p>}
                    {readableList(item.suggestions) && <p>{language === 'cn' ? '变化：' : 'Changes: '}{readableList(item.suggestions)}</p>}
                  </article>
                ))}
              </section>
            </div>
          ) : (
            <div className="detail-empty-state">
              <strong>{language === 'cn' ? '选择一次探索' : 'Select an exploration'}</strong>
              <p>{language === 'cn' ? '左侧点开任意记录后，详情会在这里显示。' : 'Choose a record on the left to show its details here.'}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
