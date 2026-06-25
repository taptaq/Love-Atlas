import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createEventCompletionMessage } from '../../services/eventEngine';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useJourneyStore, useUiStore } from '../../store';

const mirrorChoices = [
  {
    id: 'understand',
    icon: '👂',
    label: { cn: '我想先理解', en: 'I want to understand' },
    helper: { cn: '先复述对方真正想表达的意思。', en: 'First reflect what the other person may mean.' },
  },
  {
    id: 'clarify',
    icon: '🪞',
    label: { cn: '我想澄清自己', en: 'I want to clarify' },
    helper: { cn: '把自己的真实意思说得更清楚。', en: 'Make your real meaning clearer.' },
  },
  {
    id: 'pause',
    icon: '🌙',
    label: { cn: '我需要慢一点', en: 'I need to slow down' },
    helper: { cn: '先承认差异，暂时不急着解决。', en: 'Name the difference without rushing to solve it.' },
  },
] as const;

export function EventPage() {
  const language = useUiStore((state) => state.language);
  const currentEvent = useJourneyStore((state) => state.currentEvent);
  const mirrorEvent = useJourneyStore((state) => state.mirrorEvent);
  const completeCurrentEvent = useJourneyStore((state) => state.completeCurrentEvent);
  const skipMirrorEvent = useJourneyStore((state) => state.skipMirrorEvent);
  const isGeneratingNextQuestion = useJourneyStore((state) => state.isGeneratingNextQuestion);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [reflection, setReflection] = useState('');
  const isMirrorEvent = currentEvent?.type === 'mirror';
  const [introVisible, setIntroVisible] = useState(isMirrorEvent);

  // 当事件类型变化时同步 introVisible
  useEffect(() => {
    setIntroVisible(isMirrorEvent);
  }, [isMirrorEvent]);

  if (!currentEvent) {
    return (
      <main className="page placeholder-page">
        <h1>{language === 'cn' ? '没有正在进行的事件' : 'No active event'}</h1>
        <button className="primary-btn" type="button" onClick={completeCurrentEvent}>{language === 'cn' ? '返回旅程' : 'Return to Journey'}</button>
      </main>
    );
  }

  const completion = createEventCompletionMessage(currentEvent);
  const canComplete = !isMirrorEvent || (selectedChoice.length > 0 && reflection.trim().length > 0);

  if (isMirrorEvent && introVisible) {
    return (
      <main className="page flow-page event-page mirror-intro-page">
        <motion.section className="mirror-intro-card" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.72, ease: 'easeOut' }}>
          <div className="mirror-orb">
            <span>🪞</span>
          </div>
          <span className="step-pill">{language === 'cn' ? '镜像时刻出现' : 'Mirror Moment Appears'}</span>
          <h1>{language === 'cn' ? '你们的差异正在形成一面镜子' : 'Your difference is becoming a mirror'}</h1>
          <p>{language === 'cn' ? '先停一下，看看对方真实表达和你的理解之间，哪里正在发光。' : 'Pause for a moment and notice where their real expression and your understanding begin to glow.'}</p>
          <div className="mirror-intro-rings">
            <span />
            <span />
            <span />
          </div>
          <button className="primary-btn" type="button" onClick={() => setIntroVisible(false)}>
            {language === 'cn' ? '进入镜像时刻' : 'Enter Mirror Moment'}
          </button>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="page flow-page event-page">
      <LoadingOverlay visible={isGeneratingNextQuestion} message={language === 'cn' ? 'AI 正在生成下一题…' : 'AI is generating the next question…'} />
      <section className="event-hero-card">
        <span className="step-pill">{language === 'cn' ? '关系事件' : 'Relationship Event'}</span>
        <div className="event-icon">{currentEvent.icon}</div>
        <h1>{currentEvent.title[language]}</h1>
        <p>{currentEvent.description[language]}</p>
      </section>

      <section className="event-question-card">
        <span className="eyebrow">{isMirrorEvent ? (language === 'cn' ? '镜像提示' : 'Mirror Prompt') : (language === 'cn' ? '事件提示' : 'Event Prompt')}</span>
        <h2>{currentEvent.question[language]}</h2>
        {isMirrorEvent && <p>{mirrorEvent.memorySeed}</p>}
        {isMirrorEvent && (
          <div className="signal-grid">
            <span>{language === 'cn' ? '阶段' : 'Stage'} {mirrorEvent.signal?.stageScore ?? 0}</span>
            <span>{language === 'cn' ? '目标' : 'Goal'} {mirrorEvent.signal?.goalScore ?? 0}</span>
            <span>{language === 'cn' ? '差异' : 'Difference'} {mirrorEvent.signal?.mismatchScore ?? 0}</span>
            <span>{language === 'cn' ? '此刻' : 'Moment'} {mirrorEvent.signal?.momentScore ?? 0}</span>
          </div>
        )}
      </section>

      {isMirrorEvent && (
        <section className="event-interaction-card">
          <span className="eyebrow">{language === 'cn' ? '镜像互动' : 'Mirror Interaction'}</span>
          <h2>{language === 'cn' ? '选择这次回应的方向' : 'Choose how to respond this time'}</h2>
          <div className="event-choice-grid">
            {mirrorChoices.map((choice) => (
              <button className={selectedChoice === choice.id ? 'selected' : ''} key={choice.id} type="button" onClick={() => setSelectedChoice(choice.id)}>
                <span>{choice.icon}</span>
                <strong>{choice.label[language]}</strong>
                <small>{choice.helper[language]}</small>
              </button>
            ))}
          </div>
          <textarea
            className="event-reflection-input"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder={language === 'cn' ? '试着写一句：我听见你可能在说…… / 我真正想表达的是……' : 'Try one sentence: I hear you may be saying... / What I truly meant was...'}
            aria-label={language === 'cn' ? '反思记录' : 'Reflection'}
          />
        </section>
      )}

      {canComplete && (
        <section className="event-complete-card">
          <span className="eyebrow">{language === 'cn' ? '事件完成' : 'Event Complete'}</span>
          <h2>{language === 'cn' ? '看见差异，然后回到原路线' : 'See the difference, then return to the route'}</h2>
          <p>{completion[language]}</p>
        </section>
      )}

      <div className="flow-actions">
        <button type="button" disabled={isGeneratingNextQuestion} onClick={skipMirrorEvent}>{language === 'cn' ? '跳过事件' : 'Skip Event'}</button>
        <button className="primary-btn" disabled={!canComplete || isGeneratingNextQuestion} type="button" onClick={completeCurrentEvent}>{language === 'cn' ? '完成事件并返回旅程' : 'Complete Event and Return'}</button>
      </div>
    </main>
  );
}
