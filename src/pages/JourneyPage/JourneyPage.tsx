import { mapAreaConfig } from '../../features/map/map.config';
import { useJourneyStore, useUiStore } from '../../store';

export function JourneyPage() {
  const language = useUiStore((state) => state.language);
  const currentQuestion = useJourneyStore((state) => state.currentQuestion);
  const currentQuestionIndex = useJourneyStore((state) => state.currentQuestionIndex);
  const abAnswers = useJourneyStore((state) => state.abAnswers);
  const worldState = useJourneyStore((state) => state.worldState);
  const submitAnswerA = useJourneyStore((state) => state.submitAnswerA);
  const submitAnswerB = useJourneyStore((state) => state.submitAnswerB);
  const revealAnswers = useJourneyStore((state) => state.revealAnswers);
  const goToNextQuestion = useJourneyStore((state) => state.goToNextQuestion);
  const endJourney = useJourneyStore((state) => state.endJourney);

  if (!currentQuestion) {
    return (
      <main className="page placeholder-page">
        <h1>{language === 'cn' ? '还没有生成问题' : 'No question generated yet'}</h1>
        <p>{language === 'cn' ? '请先从 Route Engine 开始旅程。' : 'Start from Route Engine first.'}</p>
      </main>
    );
  }

  const area = mapAreaConfig[currentQuestion.region];
  const canReveal = abAnswers.answerA.trim().length > 0 && abAnswers.answerB.trim().length > 0;
  const questionNumber = currentQuestionIndex + 1;

  return (
    <main className="page flow-page journey-page">
      <section className="flow-header">
        <span className="step-pill">04 / {language === 'cn' ? '探索旅程' : 'Journey'} · {language === 'cn' ? `第 ${questionNumber} 题` : `Question ${questionNumber}`}</span>
        <h1>{area.icon} {area.label[language]}</h1>
        <p>{currentQuestion.localizedReason?.[language] ?? currentQuestion.reason}</p>
      </section>

      <section className="question-card">
        <span className="eyebrow">{language === 'cn' ? '问题' : 'Question'} · {currentQuestion.type}</span>
        <h2>{currentQuestion.localized?.[language] ?? currentQuestion.question}</h2>
        <p>{currentQuestion.localizedHint?.[language] ?? currentQuestion.hint}</p>
        {currentQuestion.worldEffect && <small className="world-effect-chip">{currentQuestion.worldEffect.localizedMessage?.[language] ?? currentQuestion.worldEffect.message}</small>}
      </section>

      <section className="ab-grid">
        <article className="answer-panel">
          <span className="eyebrow">{language === 'cn' ? 'A 的回答' : 'A Answer'}</span>
          <h3>{language === 'cn' ? 'A 的真实回答' : 'A’s real answer'}</h3>
          <textarea
            value={abAnswers.answerA}
            onChange={(event) => submitAnswerA(event.target.value)}
            placeholder={language === 'cn' ? '写下 A 的真实想法...' : 'Write A’s real answer...'}
          />
        </article>
        <article className="answer-panel">
          <span className="eyebrow">{language === 'cn' ? 'B 的猜测' : 'B Guess'}</span>
          <h3>{language === 'cn' ? 'B 猜 A 会怎么说' : 'B guesses what A would say'}</h3>
          <textarea
            value={abAnswers.answerB}
            onChange={(event) => submitAnswerB(event.target.value)}
            placeholder={language === 'cn' ? '写下 B 的猜测或回应...' : 'Write B’s guess or response...'}
          />
        </article>
      </section>

      {!abAnswers.revealVisible && (
        <div className="flow-actions">
          <button className="primary-btn" disabled={!canReveal} type="button" onClick={revealAnswers}>
            {language === 'cn' ? '揭晓时刻' : 'Reveal Moment'}
          </button>
        </div>
      )}

      {abAnswers.revealVisible && abAnswers.insights && (
        <section className="reveal-card">
          <span className="eyebrow">{language === 'cn' ? '洞察' : 'Insight'}</span>
          <h2>{language === 'cn' ? '你们之间出现了新的信号' : 'A new signal appeared between you'}</h2>
          <div className="similarity-meter">
            <span style={{ width: `${abAnswers.similarity}%` }} />
          </div>
          <p><strong>{language === 'cn' ? '相似度' : 'Similarity'}：</strong>{abAnswers.similarity}% · {abAnswers.intensity}</p>
          <p><strong>{language === 'cn' ? '共鸣' : 'Resonance'}：</strong>{abAnswers.insights.resonance}</p>
          <p><strong>{language === 'cn' ? '差异' : 'Difference'}：</strong>{abAnswers.insights.difference}</p>
          <p><strong>{language === 'cn' ? '建议' : 'Suggestion'}：</strong>{abAnswers.insights.suggestion}</p>
        </section>
      )}

      {abAnswers.revealVisible && (
        <section className="world-update-card">
          <span className="eyebrow">{language === 'cn' ? '世界更新' : 'World Update'}</span>
          <h2>{area.icon} {area.label[language]} · {worldState.regionProgress[currentQuestion.region]}%</h2>
          <p>{abAnswers.insights?.emotion}</p>
        </section>
      )}

      {abAnswers.revealVisible && (
        <div className="flow-actions">
          <button className="primary-btn" type="button" onClick={goToNextQuestion}>
            {language === 'cn' ? '继续探索' : 'Keep Exploring'}
          </button>
          <button type="button" onClick={endJourney}>
            {language === 'cn' ? '结束探索' : 'End Exploration'}
          </button>
        </div>
      )}
    </main>
  );
}
