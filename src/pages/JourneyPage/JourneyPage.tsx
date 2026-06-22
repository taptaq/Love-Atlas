import { useEffect, useRef } from 'react';
import { mapAreaConfig } from '../../features/map/map.config';
import { getJourneyQuestionCount } from '../../features/relationship/relationship.config';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useJourneyStore, useUiStore } from '../../store';

export function JourneyPage() {
  const language = useUiStore((state) => state.language);
  const currentQuestion = useJourneyStore((state) => state.currentQuestion);
  const currentQuestionIndex = useJourneyStore((state) => state.currentQuestionIndex);
  const journeyLength = useJourneyStore((state) => state.journeyLength);
  const abAnswers = useJourneyStore((state) => state.abAnswers);
  const worldState = useJourneyStore((state) => state.worldState);
  const submitAnswerA = useJourneyStore((state) => state.submitAnswerA);
  const submitAnswerB = useJourneyStore((state) => state.submitAnswerB);
  const setAnswerAReady = useJourneyStore((state) => state.setAnswerAReady);
  const setAnswerBReady = useJourneyStore((state) => state.setAnswerBReady);
  const revealAnswers = useJourneyStore((state) => state.revealAnswers);
  const goToNextQuestion = useJourneyStore((state) => state.goToNextQuestion);
  const endJourney = useJourneyStore((state) => state.endJourney);
  const role = useSessionStore((state) => state.role);
  const cn = language === 'cn';

  // 双方都 ready 时自动揭晓
  const autoRevealTriggered = useRef(false);
  useEffect(() => {
    if (abAnswers.answerAReady && abAnswers.answerBReady && !abAnswers.revealVisible && !autoRevealTriggered.current) {
      autoRevealTriggered.current = true;
      revealAnswers();
    }
    // 切换问题时重置
    if (!abAnswers.answerAReady && !abAnswers.answerBReady) {
      autoRevealTriggered.current = false;
    }
  }, [abAnswers.answerAReady, abAnswers.answerBReady, abAnswers.revealVisible, revealAnswers]);

  if (!currentQuestion) {
    return (
      <main className="page placeholder-page">
        <h1>{cn ? '还没有生成问题' : 'No question generated yet'}</h1>
        <p>{cn ? '请先从 Route Engine 开始旅程。' : 'Start from Route Engine first.'}</p>
      </main>
    );
  }

  const area = mapAreaConfig[currentQuestion.region];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = getJourneyQuestionCount(journeyLength);
  const isLastQuestion = questionNumber >= totalQuestions;

  // 角色映射：host = A（我），partner = B（对方）
  const isHost = role === 'host';
  const isPartner = role === 'partner';
  // 单人模式（无角色时）可以同时操作 A 和 B
  const isSolo = !isHost && !isPartner;

  // 我的回答和对方的回答
  const myAnswer = isPartner ? abAnswers.answerB : abAnswers.answerA;
  const partnerAnswer = isPartner ? abAnswers.answerA : abAnswers.answerB;
  const myReady = isPartner ? abAnswers.answerBReady : abAnswers.answerAReady;
  const partnerReady = isPartner ? abAnswers.answerBReady : abAnswers.answerAReady;

  const setMyAnswer = (value: string) => {
    if (isPartner) submitAnswerB(value);
    else submitAnswerA(value);
  };
  const setMyReady = (ready: boolean) => {
    if (isPartner) setAnswerBReady(ready);
    else setAnswerAReady(ready);
  };

  const bothReady = abAnswers.answerAReady && abAnswers.answerBReady;
  const canReveal = isSolo
    ? abAnswers.answerA.trim().length > 0 && abAnswers.answerB.trim().length > 0
    : bothReady;

  return (
    <main className="page flow-page journey-page">
      <section className="flow-header">
        <span className="step-pill">04 / {cn ? '探索旅程' : 'Journey'} · {cn ? `第 ${questionNumber} / ${totalQuestions} 题` : `Question ${questionNumber} / ${totalQuestions}`}</span>
        <h1>{area.icon} {area.label[language]}</h1>
        <p>{currentQuestion.localizedReason?.[language] ?? currentQuestion.reason}</p>
      </section>

      <section className="question-card">
        <span className="eyebrow">{cn ? '问题' : 'Question'} · {currentQuestion.type}</span>
        <h2>{currentQuestion.localized?.[language] ?? currentQuestion.question}</h2>
        <p>{currentQuestion.localizedHint?.[language] ?? currentQuestion.hint}</p>
        {currentQuestion.worldEffect && <small className="world-effect-chip">{currentQuestion.worldEffect.localizedMessage?.[language] ?? currentQuestion.worldEffect.message}</small>}
      </section>

      <section className="ab-grid">
        {/* 我的回答 */}
        <article className={`answer-panel ${myReady ? 'answer-ready' : ''}`}>
          <span className="eyebrow">{cn ? '我的回答' : 'My Answer'}</span>
          <h3>{cn ? '写下你的真实想法' : 'Write your real answer'}</h3>
          <textarea
            value={myAnswer}
            onChange={(event) => setMyAnswer(event.target.value)}
            placeholder={cn ? '写下你的真实想法...' : 'Write your real answer...'}
            disabled={myReady}
            aria-label={cn ? '我的回答' : 'My answer'}
          />
          {myReady && (
            <span className="answer-ready-badge">{cn ? '✓ 已完成' : '✓ Done'}</span>
          )}
          {!myReady && !abAnswers.revealVisible && (
            <button
              className="answer-ready-btn"
              type="button"
              disabled={!myAnswer.trim()}
              onClick={() => setMyReady(true)}
            >
              {cn ? '我已答完' : 'I am done'}
            </button>
          )}
          {myReady && !abAnswers.revealVisible && (
            <button
              className="answer-edit-btn"
              type="button"
              onClick={() => setMyReady(false)}
            >
              {cn ? '修改回答' : 'Edit'}
            </button>
          )}
        </article>

        {/* 对方的回答 */}
        <article className={`answer-panel answer-panel-partner ${partnerReady ? 'answer-ready' : ''}`}>
          <span className="eyebrow">{cn ? '对方的回答' : 'Partner Answer'}</span>
          <h3>{cn ? '对方正在回答…' : 'Partner is answering…'}</h3>
          {!abAnswers.revealVisible ? (
            <div className="answer-locked-area">
              {partnerReady ? (
                <p className="answer-locked-text">{cn ? '🔒 对方已完成，等待揭晓' : '🔒 Partner is done, waiting for reveal'}</p>
              ) : (
                <p className="answer-locked-text">{cn ? '🔒 等待对方回答…' : '🔒 Waiting for partner…'}</p>
              )}
              {partnerReady && (
                <span className="answer-ready-badge">{cn ? '✓ 对方已完成' : '✓ Partner done'}</span>
              )}
            </div>
          ) : (
            <textarea value={partnerAnswer} readOnly placeholder={cn ? '对方的回答' : 'Partner answer'} aria-label={cn ? '对方的回答' : 'Partner answer'} />
          )}
        </article>
      </section>

      {/* 单人模式：显示揭晓按钮 */}
      {isSolo && !abAnswers.revealVisible && (
        <div className="flow-actions">
          <button className="primary-btn" disabled={!canReveal} type="button" onClick={revealAnswers}>
            {cn ? '揭晓时刻' : 'Reveal Moment'}
          </button>
        </div>
      )}

      {/* 双人模式：显示等待状态 */}
      {!isSolo && !abAnswers.revealVisible && (
        <div className="flow-actions">
          <p className="reveal-wait-hint">
            {bothReady
              ? (cn ? '✨ 双方已完成，正在揭晓…' : '✨ Both done, revealing…')
              : myReady && !partnerReady
                ? (cn ? '⏳ 你已完成，等待对方…' : '⏳ You are done, waiting for partner…')
                : !myReady && partnerReady
                  ? (cn ? '⏳ 对方已完成，等你回答…' : '⏳ Partner is done, waiting for you…')
                  : (cn ? '双方都完成后自动揭晓' : 'Auto-reveal when both are done')}
          </p>
        </div>
      )}

      {abAnswers.revealVisible && abAnswers.insights && (
        <section className="reveal-card">
          <span className="eyebrow">{cn ? '洞察' : 'Insight'}</span>
          <h2>{cn ? '你们之间出现了新的信号' : 'A new signal appeared between you'}</h2>
          <div className="similarity-meter">
            <span style={{ width: `${abAnswers.similarity}%` }} />
          </div>
          <p><strong>{cn ? '相似度' : 'Similarity'}：</strong>{abAnswers.similarity}% · {abAnswers.intensity}</p>
          <p><strong>{cn ? '共鸣' : 'Resonance'}：</strong>{abAnswers.insights.resonance}</p>
          <p><strong>{cn ? '差异' : 'Difference'}：</strong>{abAnswers.insights.difference}</p>
          <p><strong>{cn ? '建议' : 'Suggestion'}：</strong>{abAnswers.insights.suggestion}</p>
        </section>
      )}

      {abAnswers.revealVisible && (
        <section className="world-update-card">
          <span className="eyebrow">{cn ? '世界更新' : 'World Update'}</span>
          <h2>{area.icon} {area.label[language]} · {worldState.regionProgress[currentQuestion.region]}%</h2>
          <p>{abAnswers.insights?.emotion}</p>
        </section>
      )}

      {abAnswers.revealVisible && (
        <div className="flow-actions">
          {isLastQuestion ? (
            <button className="primary-btn" type="button" onClick={endJourney}>
              {cn ? '完成探索' : 'Finish Exploration'}
            </button>
          ) : (
            <>
              <button className="primary-btn" type="button" onClick={goToNextQuestion}>
                {cn ? '继续探索' : 'Keep Exploring'}
              </button>
              <button type="button" onClick={endJourney}>
                {cn ? '结束探索' : 'End Exploration'}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
