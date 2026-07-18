import { relationshipStages } from '../../features/relationship/relationship.config';
import { useSessionStore } from '../../features/session/useSessionStore';
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
  const sessionRole = useSessionStore((state) => state.role);
  const cn = language === 'cn';
  // 主导方模型：host 负责设置，partner 完全跟随
  // partner 的所有操作按钮 disabled，通过 currentStep 同步自动跳转
  const isFollower = sessionRole === 'partner';

  return (
    <main className="page flow-page">
      <section className="flow-header">
        <span className="step-pill">01 / {cn ? '关系阶段' : 'Setup'}</span>
        <h1>{cn ? '你们现在处于什么阶段？' : 'Where is your relationship now?'}</h1>
        <p>{cn ? '关系阶段会影响目标推荐、地图路线和问题深度。' : 'Relationship stage shapes goal recommendations, route, and question depth.'}</p>
      </section>

      {/* 情绪签到：轻量可选，影响第一题方向。主导方模型下由 host 选择并同步给 partner */}
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
              // 主导方模型：host 选择情绪后同步给 partner，保证第一题方向一致
              disabled={isFollower}
              className={`mood-chip ${currentMood === mood.id ? 'mood-chip-selected' : ''}`}
              onClick={() => setCurrentMood(currentMood === mood.id ? null : mood.id)}
            >
              <span className="mood-chip-icon" aria-hidden="true">{mood.icon}</span>
              <span className="mood-chip-label">{mood.label[language]}</span>
            </button>
          ))}
        </div>
        {isFollower && (
          <p className="step-lock-hint" role="status">
            {cn ? '⏳ 等待对方选择当前情绪…' : '⏳ Waiting for your partner to choose a mood…'}
          </p>
        )}
      </section>

      <section className="option-grid">
        {relationshipStages.map((stage) => (
          <button
            className={`option-card ${relationshipStage === stage.id ? 'selected' : ''}`}
            key={stage.id}
            type="button"
            // partner 完全跟随 host 的设置，不可操作
            disabled={isFollower}
            onClick={() => setRelationshipStage(stage.id)}
          >
            <span className="option-icon">{stage.icon}</span>
            <strong>{stage.label[language]}</strong>
            <small>{stage.description[language]}</small>
          </button>
        ))}
      </section>

      {isFollower && (
        <p className="step-lock-hint" role="status">
          {cn ? '⏳ 等待对方选择关系阶段…' : '⏳ Waiting for your partner to choose the stage…'}
        </p>
      )}

      <div className="flow-actions">
        {/* partner 不显示返回首页按钮，跟随 host 的步骤跳转 */}
        {!isFollower && (
          <button type="button" onClick={() => goToStep('home')}>
            {cn ? '返回首页' : 'Back Home'}
          </button>
        )}
        <button
          className="primary-btn"
          disabled={isFollower || !relationshipStage}
          type="button"
          onClick={nextStep}
        >
          {isFollower
            ? (cn ? '等待对方继续…' : 'Waiting for partner…')
            : (cn ? '继续选择目标' : 'Continue to Goals')}
        </button>
      </div>
    </main>
  );
}
