import { useMemo, useState } from 'react';
import { useUiStore } from '../../store';
import { getDailyQuestion } from '../../features/relationship/dailyQuestion';
import type { JourneyQuestion } from '../../types';

interface DailyQuestionProps {
  onStart: (question: JourneyQuestion) => void;
}

// 今日一问：每日一个精选问题，一键开启对话，降低启动门槛
export function DailyQuestion({ onStart }: DailyQuestionProps) {
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';
  const [hidden, setHidden] = useState(false);

  // 同一天返回同一题，避免刷新后变化
  const daily = useMemo(() => getDailyQuestion(new Date(), language), [language]);

  if (hidden) return null;

  return (
    <section className="daily-question-section" aria-label={cn ? '今日一问' : 'Today\'s Question'}>
      <article className="daily-question-card">
        <header className="daily-question-header">
          <span className="daily-question-icon" aria-hidden="true">✉️</span>
          <div className="daily-question-heading">
            <span className="daily-question-eyebrow">{cn ? '今日一问' : 'Today\'s Question'}</span>
            <small className="daily-question-date">{daily.seed}</small>
          </div>
          <button
            type="button"
            className="daily-question-close"
            onClick={() => setHidden(true)}
            aria-label={cn ? '收起今日一问' : 'Dismiss'}
          >
            ×
          </button>
        </header>
        <h3 className="daily-question-text">{daily.question.question}</h3>
        <p className="daily-question-hint">{daily.question.hint}</p>
        <div className="daily-question-actions">
          <button
            type="button"
            className="daily-question-start-btn"
            onClick={() => onStart(daily.question)}
          >
            {cn ? '就用这题开始' : 'Start with this question'}
          </button>
          <button
            type="button"
            className="daily-question-dismiss-btn"
            onClick={() => setHidden(true)}
          >
            {cn ? '换个方式开始' : 'Start another way'}
          </button>
        </div>
      </article>
    </section>
  );
}
