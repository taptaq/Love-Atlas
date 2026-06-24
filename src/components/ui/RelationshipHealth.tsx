import { useDiscoveryStore, useJourneyStore, useUiStore } from '../../store';
import { loadStats } from '../../services/atlasDiscoveryEngine';
import { loadFeedback } from './ExplorationFeedback';
import type { Language } from '../../types';

interface RelationshipHealthProps {
  language: Language;
}

export function RelationshipHealth({ language }: RelationshipHealthProps) {
  const stats = useDiscoveryStore((state) => state.stats);
  const worldState = useJourneyStore((state) => state.worldState);
  const cn = language === 'cn';

  const localStats = loadStats();
  const feedback = loadFeedback();

  // 探索频率：完成次数越多越好，上限 10 次 = 满分
  const frequencyScore = Math.min(100, (localStats.completeCount / 10) * 100);

  // 反馈正向率：helpful 占比
  const feedbackTotal = feedback.length;
  const helpfulCount = feedback.filter((item) => item.rating === 'helpful').length;
  const feedbackScore = feedbackTotal > 0 ? (helpfulCount / feedbackTotal) * 100 : 0;

  // 区域多样性：已访问区域 / 5
  const diversityScore = (worldState.visitedRegions.length / 5) * 100;

  // 事件丰富度：总事件数，上限 10 = 满分
  const totalEvents = Object.values(localStats.eventCounts).reduce((sum, count) => sum + count, 0);
  const eventScore = Math.min(100, (totalEvents / 10) * 100);

  // 综合健康度
  const healthScore = Math.round((frequencyScore + feedbackScore + diversityScore + eventScore) / 4);

  const metrics = [
    { label: cn ? '探索频率' : 'Frequency', value: frequencyScore, hint: cn ? `${localStats.completeCount} 次探索` : `${localStats.completeCount} explorations` },
    { label: cn ? '对话正向率' : 'Positivity', value: feedbackScore, hint: feedbackTotal > 0 ? cn ? `${helpfulCount}/${feedbackTotal} 觉得有帮助` : `${helpfulCount}/${feedbackTotal} helpful` : cn ? '暂无反馈' : 'No feedback' },
    { label: cn ? '区域多样性' : 'Diversity', value: diversityScore, hint: cn ? `${worldState.visitedRegions.length}/5 区域` : `${worldState.visitedRegions.length}/5 areas` },
    { label: cn ? '事件丰富度' : 'Events', value: eventScore, hint: cn ? `${totalEvents} 个关系事件` : `${totalEvents} events` },
  ];

  const healthLabel = healthScore >= 75 ? (cn ? '活跃丰富' : 'Active & Rich') : healthScore >= 50 ? (cn ? '稳步成长' : 'Growing Steadily') : healthScore >= 25 ? (cn ? '刚刚起步' : 'Just Starting') : (cn ? '期待开始' : 'Awaiting Start');

  return (
    <article className="route-preview-card health-dashboard-card">
      <span className="eyebrow">{cn ? '关系健康度' : 'Relationship Health'}</span>
      <div className="health-score-row">
        <div className="health-score-circle">
          <span className="health-score-value">{healthScore}</span>
          <span className="health-score-unit">%</span>
        </div>
        <div className="health-score-meta">
          <strong>{healthLabel}</strong>
          <p>{cn ? `${stats.completeCount} 次完成 · ${worldState.visitedRegions.length} 个区域` : `${stats.completeCount} done · ${worldState.visitedRegions.length} areas`}</p>
        </div>
      </div>
      <div className="health-metrics">
        {metrics.map((metric) => (
          <div className="health-metric" key={metric.label}>
            <div className="health-metric-head">
              <span>{metric.label}</span>
              <small>{metric.hint}</small>
            </div>
            <div className="similarity-meter"><span style={{ width: `${metric.value}%` }} /></div>
          </div>
        ))}
      </div>
    </article>
  );
}
