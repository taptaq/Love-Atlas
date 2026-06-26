import { relationshipStages } from '../../features/relationship/relationship.config';
import { useJourneyStore, useUiStore } from '../../store';
import type { Language, MoodTag } from '../../types';

// 情绪签到选项
const MOOD_OPTIONS: Array<{ id: MoodTag; icon: string; label: Record<Language, string> }> = [
  { id: 'calm', icon: '🌿', label: { cn: '平静', en: 'Calm' } },
  { id: 'expectant', icon: '✨', label: { cn: '期待', en: 'Expectant' } },
  { id: 'tired', icon: '🌙', label: { cn: '疲惫', en: 'Tired' } },
  { id: 'anxious', icon: '🌊', label: { cn: '焦虑', en: 'Anxious' } },
  { id: 'happy', icon: '🌸', label: { cn: '开心', en: 'Happy' } },
  { id: 'low', icon: '🌧', label: { cn: '低落', en: 'Low' } },
  { id: 'curious', icon: '🔍', label: { cn: '好奇', en: 'Curious' } },
  { id: 'missing', icon: '💭', label: { cn: '想念', en: 'Missing' } },
];

export function SetupPage() {
  const language = useUiStore((state) => state.language);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const setRelationshipStage = useJourneyStore((state) => state.setRelationshipStage);
  const currentMood = useJourneyStore((state) => state.currentMood);
  const setCurrentMood = useJourneyStore((state) => state.setCurrentMood);
  const nextStep = useJourneyStore((state) => state.nextStep);
  const goToStep = useJourneyStore((state) => state.goToStep);
  const cn = language === 'cn';

  return (
    <main className="page flow-page">
      <section className="flow-header">
        <span className="step-pill">01 / {cn ? '关系阶段' : 'Setup'}</span>
        <h1>{cn ? '你们现在处于什么阶段？' : 'Where is your relationship now?'}</h1>
        <p>{cn ? '关系阶段会影响目标推荐、地图路线和问题深度。' : 'Relationship stage shapes goal recommendations, route, and question depth.'}</p>
      </section>

      {/* 情绪签到：轻量可选，影响第一题方向 */}
      <section className="mood-checkin-section" aria-label={cn ? '情绪签到' : 'Mood Check-in'}>
        <div className="mood-checkin-header">
          <span className="mood-checkin-eyebrow">{cn ? '此刻的你' : 'How are you right now?'}</span>
          <small className="mood-checkin-hint">{cn ? '选一个最接近的，会影响第一题的方向（可跳过）' : 'Pick the closest one — it shapes the first question (skippable)'}</small>
        </div>
        <div className="mood-checkin-grid" role="radiogroup" aria-label={cn ? '选择当前情绪' : 'Select your mood'}>
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              role="radio"
              aria-checked={currentMood === mood.id}
              className={`mood-chip ${currentMood === mood.id ? 'mood-chip-selected' : ''}`}
              onClick={() => setCurrentMood(currentMood === mood.id ? null : mood.id)}
            >
              <span className="mood-chip-icon" aria-hidden="true">{mood.icon}</span>
              <span className="mood-chip-label">{mood.label[language]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="option-grid">
        {relationshipStages.map((stage) => (
          <button
            className={`option-card ${relationshipStage === stage.id ? 'selected' : ''}`}
            key={stage.id}
            type="button"
            onClick={() => setRelationshipStage(stage.id)}
          >
            <span className="option-icon">{stage.icon}</span>
            <strong>{stage.label[language]}</strong>
            <small>{stage.description[language]}</small>
          </button>
        ))}
      </section>

      <div className="flow-actions">
        <button type="button" onClick={() => goToStep('home')}>
          {cn ? '返回首页' : 'Back Home'}
        </button>
        <button className="primary-btn" disabled={!relationshipStage} type="button" onClick={nextStep}>
          {cn ? '继续选择目标' : 'Continue to Goals'}
        </button>
      </div>
    </main>
  );
}
