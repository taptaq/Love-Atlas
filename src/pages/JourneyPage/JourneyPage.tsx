import { useEffect, useRef, useState } from 'react';
import { generateAiCoach, generateAiCompanionAnswer } from '../../features/relationship/aiJourneyService';
import { SIMILARITY_THRESHOLD } from '../../features/relationship/journeyConfig';
import { mapAreaConfig } from '../../features/map/map.config';
import { getJourneyQuestionCount } from '../../features/relationship/relationship.config';
import { useSessionStore } from '../../features/session/useSessionStore';
import { useSpaceStore } from '../../features/session/useSpaceStore';
import { useJourneyStore, useUiStore } from '../../store';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { TermTooltip } from '../../components/ui/TermTooltip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function JourneyPage() {
  const language = useUiStore((state) => state.language);
  const currentQuestion = useJourneyStore((state) => state.currentQuestion);
  const currentQuestionIndex = useJourneyStore((state) => state.currentQuestionIndex);
  const journeyLength = useJourneyStore((state) => state.journeyLength);
  const abAnswers = useJourneyStore((state) => state.abAnswers);
  const worldState = useJourneyStore((state) => state.worldState);
  const relationshipStage = useJourneyStore((state) => state.relationshipStage);
  const goal = useJourneyStore((state) => state.goal);
  const isRevealing = useJourneyStore((state) => state.isRevealing);
  const isStartingJourney = useJourneyStore((state) => state.isStartingJourney);
  const submitAnswerA = useJourneyStore((state) => state.submitAnswerA);
  const submitAnswerB = useJourneyStore((state) => state.submitAnswerB);
  const setAnswerAReady = useJourneyStore((state) => state.setAnswerAReady);
  const setAnswerBReady = useJourneyStore((state) => state.setAnswerBReady);
  const revealAnswers = useJourneyStore((state) => state.revealAnswers);
  const goToNextQuestion = useJourneyStore((state) => state.goToNextQuestion);
  const isGeneratingNextQuestion = useJourneyStore((state) => state.isGeneratingNextQuestion);
  const endJourney = useJourneyStore((state) => state.endJourney);
  const role = useSessionStore((state) => state.role);
  const isCompanion = useSpaceStore((state) => state.isCompanion);
  const cn = language === 'cn';
  // 当前用户在对话中的角色：host=A，partner=B，无角色时默认 A
  const isPartner = role === 'partner';
  const myLayerRole: 'A' | 'B' = isPartner ? 'B' : 'A';
  const partnerLayerRole: 'A' | 'B' = isPartner ? 'A' : 'B';
  const [coachAdvice, setCoachAdvice] = useState<{ coach: { cn: string; en: string }; buffer: { cn: string; en: string } } | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [companionThinking, setCompanionThinking] = useState(false);
  const companionTriggeredRef = useRef(false);
  // 深度对话状态
  const dialogueDepth = useJourneyStore((state) => state.dialogueDepth);
  const dialogueChain = useJourneyStore((state) => state.dialogueChain);
  const isGeneratingFollowup = useJourneyStore((state) => state.isGeneratingFollowup);
  const isGeneratingDialogueSummary = useJourneyStore((state) => state.isGeneratingDialogueSummary);
  const dialogueSummary = useJourneyStore((state) => state.dialogueSummary);
  const startDeepDialogue = useJourneyStore((state) => state.startDeepDialogue);
  const submitLayerAnswer = useJourneyStore((state) => state.submitLayerAnswer);
  const setLayerReady = useJourneyStore((state) => state.setLayerReady);
  const revealLayer = useJourneyStore((state) => state.revealLayer);
  const exitDeepDialogue = useJourneyStore((state) => state.exitDeepDialogue);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [layerCompanionThinking, setLayerCompanionThinking] = useState(false);
  const layerCompanionTriggeredRef = useRef(false);

  // 双方都 ready 时自动揭晓
  const autoRevealTriggered = useRef(false);
  useEffect(() => {
    if (abAnswers.answerAReady && abAnswers.answerBReady && !abAnswers.revealVisible && !autoRevealTriggered.current) {
      autoRevealTriggered.current = true;
      void revealAnswers();
    }
    // 切换问题时重置
    if (!abAnswers.answerAReady && !abAnswers.answerBReady) {
      autoRevealTriggered.current = false;
      companionTriggeredRef.current = false;
    }
  }, [abAnswers.answerAReady, abAnswers.answerBReady, abAnswers.revealVisible, revealAnswers]);

  // 深度对话：双方都 ready 时自动揭晓当前层
  const layerAutoRevealRef = useRef(false);
  useEffect(() => {
    if (dialogueDepth === 0) {
      layerAutoRevealRef.current = false;
      layerCompanionTriggeredRef.current = false;
      return;
    }
    const currentLayer = dialogueChain[dialogueChain.length - 1];
    if (!currentLayer) return;
    if (currentLayer.answerAReady && currentLayer.answerBReady && !currentLayer.revealVisible && !layerAutoRevealRef.current) {
      layerAutoRevealRef.current = true;
      void revealLayer();
    }
    if (!currentLayer.answerAReady && !currentLayer.answerBReady) {
      layerAutoRevealRef.current = false;
      layerCompanionTriggeredRef.current = false;
    }
  }, [dialogueDepth, dialogueChain, revealLayer]);

  // 深度对话：虚拟伴侣模式自动回答（伴侣始终回答对方角色）
  useEffect(() => {
    if (!isCompanion || dialogueDepth === 0) return;
    const currentLayer = dialogueChain[dialogueChain.length - 1];
    if (!currentLayer) return;
    const myReadyFlag = myLayerRole === 'A' ? currentLayer.answerAReady : currentLayer.answerBReady;
    const partnerReadyFlag = myLayerRole === 'A' ? currentLayer.answerBReady : currentLayer.answerAReady;
    if (!myReadyFlag || partnerReadyFlag || currentLayer.revealVisible) return;
    if (layerCompanionTriggeredRef.current) return;
    layerCompanionTriggeredRef.current = true;
    setLayerCompanionThinking(true);
    generateAiCompanionAnswer({
      question: currentLayer.question.localized?.[language] ?? currentLayer.question.question,
      stage: relationshipStage,
      goal,
      questionIndex: currentLayer.depth,
    })
      .then((result) => {
        submitLayerAnswer(partnerLayerRole, result.answer || (cn ? '我也在想这个问题，和你聊让我觉得安心。' : 'I am thinking about this too. Talking with you feels safe.'));
        setLayerReady(partnerLayerRole, true);
      })
      .catch(() => {
        submitLayerAnswer(partnerLayerRole, cn ? '我也在想这个问题，和你聊让我觉得安心。' : 'I am thinking about this too. Talking with you feels safe.');
        setLayerReady(partnerLayerRole, true);
      })
      .finally(() => setLayerCompanionThinking(false));
  }, [isCompanion, dialogueDepth, dialogueChain, relationshipStage, goal, language, cn, submitLayerAnswer, setLayerReady, myLayerRole, partnerLayerRole]);

  // 虚拟伴侣模式：用户答完后由 AI 生成对方回答并自动 ready
  useEffect(() => {
    if (!isCompanion) return;
    if (!abAnswers.answerAReady || abAnswers.answerBReady || abAnswers.revealVisible) return;
    if (companionTriggeredRef.current) return;
    if (!currentQuestion) return;
    companionTriggeredRef.current = true;
    setCompanionThinking(true);
    generateAiCompanionAnswer({
      question: currentQuestion.localized?.[language] ?? currentQuestion.question,
      stage: relationshipStage,
      goal,
      questionIndex: currentQuestionIndex,
    })
      .then((result) => {
        submitAnswerB(result.answer || (cn ? '我也在想这个问题，和你聊让我觉得安心。' : 'I am thinking about this too. Talking with you feels safe.'));
        setAnswerBReady(true);
      })
      .catch(() => {
        submitAnswerB(cn ? '我也在想这个问题，和你聊让我觉得安心。' : 'I am thinking about this too. Talking with you feels safe.');
        setAnswerBReady(true);
      })
      .finally(() => setCompanionThinking(false));
  }, [isCompanion, abAnswers.answerAReady, abAnswers.answerBReady, abAnswers.revealVisible, abAnswers.answerA, currentQuestion, currentQuestionIndex, relationshipStage, goal, language, cn, submitAnswerB, setAnswerBReady]);

  // 揭晓后相似度低时获取 AI 情感教练建议（P2-2 + P2-3）
  useEffect(() => {
    if (!abAnswers.revealVisible || abAnswers.similarity >= SIMILARITY_THRESHOLD.MEDIUM) {
      setCoachAdvice(null);
      setCoachLoading(false);
      return;
    }
    let cancelled = false;
    setCoachLoading(true);
    generateAiCoach({
      answerA: abAnswers.answerA,
      answerB: abAnswers.answerB,
      similarity: abAnswers.similarity,
      question: currentQuestion?.question ?? '',
    }).then((result) => {
      if (!cancelled) {
        setCoachAdvice(result);
        setCoachLoading(false);
      }
    }).catch(() => {
      // AI 失败时提供 fallback 建议，不让用户空手而归
      if (!cancelled) {
        setCoachAdvice({
          coach: {
            cn: '差异不是问题，而是理解的入口。试着问对方：「你这样想是因为什么经历吗？」',
            en: 'Difference is not a problem but a doorway. Try asking: "What experience shaped this view for you?"',
          },
          buffer: {
            cn: '你们的答案不太一样，这很正常。揭晓时先深呼吸，带着好奇而不是评判去看。',
            en: 'Your answers may differ, and that is okay. Take a breath before revealing — approach with curiosity, not judgment.',
          },
        });
        setCoachLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [abAnswers.revealVisible, abAnswers.similarity, abAnswers.answerA, abAnswers.answerB, currentQuestion]);

  if (!currentQuestion) {
    return (
      <main className="page placeholder-page">
        <LoadingOverlay visible={isStartingJourney} message={cn ? 'AI 正在生成第一道题…' : 'AI is generating the first question…'} />
        {!isStartingJourney && (
          <>
            <h1>{cn ? '还没有生成问题' : 'No question generated yet'}</h1>
            <p>{cn ? '请先从 Route Engine 开始旅程。' : 'Start from Route Engine first.'}</p>
          </>
        )}
      </main>
    );
  }

  const area = mapAreaConfig[currentQuestion.region];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = getJourneyQuestionCount(journeyLength);
  const isLastQuestion = questionNumber >= totalQuestions;

  // 角色映射：host = A（我），partner = B（对方）
  const isHost = role === 'host';
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
      {isRevealing && (
        <LoadingOverlay visible={true} message={cn ? '正在生成你们的揭晓洞察…' : 'Generating your reveal insights…'} />
      )}
      {isGeneratingNextQuestion && (
        <LoadingOverlay visible={true} message={cn ? 'AI 正在生成下一题…' : 'AI is generating the next question…'} />
      )}
      <section className="flow-header">
        <span className="step-pill">04 / {cn ? <TermTooltip explanation={{ cn: '由若干问题组成的对话流程，每答完一题世界地图会更新', en: 'A conversation flow of several questions; each answer updates your world map' }}>探索旅程</TermTooltip> : 'Journey'} · {cn ? `第 ${questionNumber} / ${totalQuestions} 题` : `Question ${questionNumber} / ${totalQuestions}`}</span>
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
          <span className="eyebrow">{cn ? `我的回答 · ${myLayerRole}` : `My Answer · ${myLayerRole}`}</span>
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
        <article className={`answer-panel answer-panel-partner ${partnerReady ? 'answer-ready' : ''} ${isCompanion ? 'answer-panel-companion' : ''}`}>
          <span className="eyebrow">{isCompanion ? (cn ? `虚拟伴侣 · ${partnerLayerRole}` : `Virtual Companion · ${partnerLayerRole}`) : (cn ? `对方的回答 · ${partnerLayerRole}` : `Partner Answer · ${partnerLayerRole}`)}</span>
          <h3>{isCompanion
            ? (companionThinking ? (cn ? '虚拟伴侣正在思考…' : 'Companion is thinking…') : (cn ? '虚拟伴侣待你答完后回应' : 'Companion responds after you'))
            : (cn ? '对方正在回答…' : 'Partner is answering…')}</h3>
          {!abAnswers.revealVisible ? (
            <div className="answer-locked-area">
              {companionThinking ? (
                <p className="answer-locked-text">{cn ? '🤖 虚拟伴侣正在生成回答…' : '🤖 Companion is generating an answer…'}</p>
              ) : partnerReady ? (
                <p className="answer-locked-text">{isCompanion ? (cn ? '🔒 虚拟伴侣已完成，等待揭晓' : '🔒 Companion is done, waiting for reveal') : (cn ? '🔒 对方已完成，揭晓后共同查看' : '🔒 Partner is done, reveal to see together')}</p>
              ) : (
                <p className="answer-locked-text">{isCompanion ? (cn ? '🔒 等你先答完，虚拟伴侣再回应' : '🔒 Answer first, then companion responds') : (cn ? '🔒 对方正在独立回答，揭晓后共同查看' : '🔒 Partner is answering independently, reveal to see together')}</p>
              )}
              {partnerReady && (
                <span className="answer-ready-badge">{isCompanion ? (cn ? '✓ 虚拟伴侣已完成' : '✓ Companion done') : (cn ? '✓ 对方已完成' : '✓ Partner done')}</span>
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
                ? (isCompanion
                    ? (cn ? '🤖 虚拟伴侣正在思考…' : '🤖 Companion is thinking…')
                    : (cn ? '⏳ 你已完成，等待对方…' : '⏳ You are done, waiting for partner…'))
                : !myReady && partnerReady
                  ? (cn ? '⏳ 对方已完成，等你回答…' : '⏳ Partner is done, waiting for you…')
                  : (isCompanion
                      ? (cn ? '答完后虚拟伴侣会自动回应，揭晓时刻自动开启' : 'Companion auto-responds after you answer, then auto-reveals')
                      : (cn ? '双方都完成后自动揭晓' : 'Auto-reveal when both are done'))}
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

      {abAnswers.revealVisible && coachLoading && (
        <section className="coach-card coach-loading-card" aria-live="polite">
          <span className="eyebrow">{cn ? 'AI 沟通教练' : 'AI Communication Coach'}</span>
          <h2>{cn ? '正在为你们生成沟通建议…' : 'Generating communication advice…'}</h2>
          <p className="coach-buffer">{cn ? '差异是理解的入口，稍等片刻。' : 'Difference is a doorway. One moment.'}</p>
        </section>
      )}

      {abAnswers.revealVisible && !coachLoading && coachAdvice && (
        <section className="coach-card">
          <span className="eyebrow">{cn ? 'AI 沟通教练' : 'AI Communication Coach'}</span>
          <h2>{cn ? '你们的答案有差异，这很正常' : 'Your answers differ, and that is okay'}</h2>
          <p className="coach-buffer">{cn ? coachAdvice.buffer.cn : coachAdvice.buffer.en}</p>
          <p className="coach-suggestion">{cn ? coachAdvice.coach.cn : coachAdvice.coach.en}</p>
        </section>
      )}

      {/* 深度对话总结 */}
      {abAnswers.revealVisible && dialogueSummary && (
        <section className="dialogue-summary-card">
          <span className="eyebrow">{cn ? '🔗 深度对话总结' : '🔗 Deep Dialogue Summary'}</span>
          <div className="dialogue-chain-bar">
            <span className={dialogueSummary.completedDepth >= 1 ? 'chain-dot active' : 'chain-dot'} />
            <span className="chain-line" />
            <span className={dialogueSummary.completedDepth >= 2 ? 'chain-dot active' : 'chain-dot'} />
            <span className="chain-line" />
            <span className={dialogueSummary.completedDepth >= 3 ? 'chain-dot active' : 'chain-dot'} />
            <span className="chain-label">{dialogueSummary.isCompleted ? (cn ? '完整 3 层' : 'Full 3 layers') : (cn ? `完成 ${dialogueSummary.completedDepth} 层（未走完）` : `${dialogueSummary.completedDepth} layers (incomplete)`)}</span>
          </div>
          <p><strong>{cn ? '认知轨迹' : 'Trajectory'}：</strong>{dialogueSummary.trajectory}</p>
          <p><strong>{cn ? '核心洞察' : 'Key Insight'}：</strong>{dialogueSummary.keyInsight}</p>
          <p><strong>{cn ? '连接建议' : 'Bridge'}：</strong>{dialogueSummary.bridge}</p>
          <p><strong>{cn ? '整合方向' : 'Integration'}：</strong>{dialogueSummary.integration}</p>
        </section>
      )}

      {/* 深度对话生成总结 loading */}
      {abAnswers.revealVisible && isGeneratingDialogueSummary && (
        <section className="dialogue-summary-card dialogue-summary-loading" aria-live="polite">
          <span className="eyebrow">{cn ? '🔗 深度对话总结' : '🔗 Deep Dialogue Summary'}</span>
          <h2>{cn ? '正在生成你们的深度对话总结…' : 'Generating your deep dialogue summary…'}</h2>
          <p>{cn ? '把这几层的发现整理成一条认知轨迹。' : 'Weaving your discoveries into a trajectory.'}</p>
        </section>
      )}

      {/* 深度对话区域 */}
      {abAnswers.revealVisible && dialogueDepth > 0 && dialogueChain.length > 0 && (() => {
        const currentLayer = dialogueChain[dialogueChain.length - 1];
        return (
          <section className="deep-dialogue-section">
            <div className="deep-dialogue-header">
              <span className="eyebrow">{cn ? '🔗 深度对话' : '🔗 Deep Dialogue'} · {cn ? `第 ${dialogueDepth} 层 / 共 3 层` : `Layer ${dialogueDepth} / 3`}</span>
              <button className="exit-dialogue-btn" type="button" onClick={() => setShowExitConfirm(true)}>
                {cn ? '返回主线' : 'Back to main'}
              </button>
            </div>

            {/* 深度对话链可视化 */}
            <div className="dialogue-chain-bar">
              {[1, 2, 3].map((d) => (
                <span key={d} className={`chain-dot ${d <= dialogueDepth ? 'active' : ''} ${d === dialogueDepth ? 'current' : ''}`}>
                  <small>L{d}</small>
                </span>
              ))}
            </div>

            {/* 追问卡片 */}
            <div className="followup-question-card">
              <span className="eyebrow">{cn ? '追问' : 'Follow-up'} · {currentLayer.question.focusArea}</span>
              <h3>{currentLayer.question.localized?.[language] ?? currentLayer.question.question}</h3>
              <p>{currentLayer.question.localizedHint?.[language] ?? currentLayer.question.hint}</p>
              <small className="followup-reason">{currentLayer.question.localizedReason?.[language] ?? currentLayer.question.reason}</small>
            </div>

            {/* 该层 AB 答题（根据当前用户角色动态映射） */}
            {(() => {
              const layerMyAnswer = myLayerRole === 'A' ? currentLayer.answerA : currentLayer.answerB;
              const layerMyReady = myLayerRole === 'A' ? currentLayer.answerAReady : currentLayer.answerBReady;
              const layerPartnerAnswer = partnerLayerRole === 'A' ? currentLayer.answerA : currentLayer.answerB;
              const layerPartnerReady = partnerLayerRole === 'A' ? currentLayer.answerAReady : currentLayer.answerBReady;
              return (
                <div className="ab-grid">
                  <article className={`answer-panel ${layerMyReady ? 'answer-ready' : ''}`}>
                    <span className="eyebrow">{cn ? `我的回答 · ${myLayerRole}` : `My Answer · ${myLayerRole}`}</span>
                    <h3>{cn ? '写下你的真实想法' : 'Write your real answer'}</h3>
                    <textarea
                      value={layerMyAnswer}
                      onChange={(e) => submitLayerAnswer(myLayerRole, e.target.value)}
                      placeholder={cn ? '写下你的真实想法...' : 'Write your real answer...'}
                      disabled={layerMyReady}
                      aria-label={cn ? '我的回答' : 'My answer'}
                    />
                    {layerMyReady && <span className="answer-ready-badge">{cn ? '✓ 已完成' : '✓ Done'}</span>}
                    {!layerMyReady && !currentLayer.revealVisible && (
                      <button className="answer-ready-btn" type="button" disabled={!layerMyAnswer.trim()} onClick={() => setLayerReady(myLayerRole, true)}>
                        {cn ? '我已答完' : 'I am done'}
                      </button>
                    )}
                    {layerMyReady && !currentLayer.revealVisible && (
                      <button className="answer-edit-btn" type="button" onClick={() => setLayerReady(myLayerRole, false)}>
                        {cn ? '修改回答' : 'Edit'}
                      </button>
                    )}
                  </article>

                  <article className={`answer-panel answer-panel-partner ${layerPartnerReady ? 'answer-ready' : ''} ${isCompanion ? 'answer-panel-companion' : ''}`}>
                    <span className="eyebrow">{isCompanion ? (cn ? `虚拟伴侣 · ${partnerLayerRole}` : `Virtual Companion · ${partnerLayerRole}`) : (cn ? `对方的回答 · ${partnerLayerRole}` : `Partner Answer · ${partnerLayerRole}`)}</span>
                    <h3>{layerCompanionThinking ? (cn ? '虚拟伴侣正在思考…' : 'Companion is thinking…') : (cn ? '对方正在回答…' : 'Partner is answering…')}</h3>
                    {!currentLayer.revealVisible ? (
                      <div className="answer-locked-area">
                        {layerCompanionThinking ? (
                          <p className="answer-locked-text">{cn ? '🤖 虚拟伴侣正在生成回答…' : '🤖 Companion is generating an answer…'}</p>
                        ) : layerPartnerReady ? (
                          <p className="answer-locked-text">{cn ? '🔒 已完成，揭晓后共同查看' : '🔒 Done, reveal to see together'}</p>
                        ) : (
                          <p className="answer-locked-text">{cn ? '🔒 对方正在独立回答，揭晓后共同查看' : '🔒 Partner is answering independently, reveal to see together'}</p>
                        )}
                        {layerPartnerReady && <span className="answer-ready-badge">{cn ? '✓ 已完成' : '✓ Done'}</span>}
                      </div>
                    ) : (
                      <textarea value={layerPartnerAnswer} readOnly placeholder={cn ? '对方的回答' : 'Partner answer'} aria-label={cn ? '对方的回答' : 'Partner answer'} />
                    )}
                  </article>
                </div>
              );
            })()}

            {/* 该层揭晓洞察 */}
            {currentLayer.revealVisible && currentLayer.insights && (
              <section className="reveal-card layer-reveal-card">
                <span className="eyebrow">{cn ? '本层洞察' : 'Layer Insight'}</span>
                <div className="similarity-meter">
                  <span style={{ width: `${currentLayer.similarity}%` }} />
                </div>
                <p><strong>{cn ? '相似度' : 'Similarity'}：</strong>{currentLayer.similarity}%</p>
                <p><strong>{cn ? '共鸣' : 'Resonance'}：</strong>{currentLayer.insights.resonance}</p>
                <p><strong>{cn ? '差异' : 'Difference'}：</strong>{currentLayer.insights.difference}</p>
                <p><strong>{cn ? '建议' : 'Suggestion'}：</strong>{currentLayer.insights.suggestion}</p>
              </section>
            )}

            {/* 深度对话操作按钮 */}
            {currentLayer.revealVisible && (
              <div className="deep-dialogue-actions">
                {dialogueDepth < 3 ? (
                  <>
                    <button className="primary-btn" type="button" disabled={isGeneratingFollowup} onClick={() => void startDeepDialogue()}>
                      {isGeneratingFollowup ? (cn ? '正在准备更深的对话…' : 'Preparing deeper dialogue…') : (cn ? `继续深度对话 ${dialogueDepth + 1}/3` : `Go deeper ${dialogueDepth + 1}/3`)}
                    </button>
                    <button type="button" onClick={() => setShowExitConfirm(true)}>
                      {cn ? '返回主线' : 'Back to main'}
                    </button>
                  </>
                ) : (
                  <button className="primary-btn" type="button" disabled={isGeneratingDialogueSummary} onClick={() => void exitDeepDialogue()}>
                    {isGeneratingDialogueSummary ? (cn ? '正在生成总结…' : 'Generating summary…') : (cn ? '生成深度对话总结' : 'Generate summary')}
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })()}

      {/* 深度对话生成追问 loading */}
      {abAnswers.revealVisible && isGeneratingFollowup && dialogueDepth === 0 && (
        <section className="deep-dialogue-loading" aria-live="polite">
          <span className="eyebrow">{cn ? '🔗 深度对话' : '🔗 Deep Dialogue'}</span>
          <h2>{cn ? '正在为你们准备更深的对话…' : 'Preparing a deeper dialogue for you…'}</h2>
          <p>{cn ? 'AI 正在基于你们的答案差异生成追问。' : 'AI is crafting a follow-up based on your differences.'}</p>
        </section>
      )}

      {/* 深度对话入口按钮（原题揭晓后，未开启深度对话时） */}
      {abAnswers.revealVisible && dialogueDepth === 0 && !dialogueSummary && !isGeneratingFollowup && abAnswers.similarity < SIMILARITY_THRESHOLD.MEDIUM && (
        <div className="deep-dialogue-entry">
          <button className="secondary-btn deep-dialogue-btn" type="button" disabled={isGeneratingFollowup} onClick={() => void startDeepDialogue()}>
            {cn ? '🔗 继续深度对话 1/3' : '🔗 Go deeper 1/3'}
          </button>
          <p className="deep-dialogue-hint">{cn ? '你们的答案有差异，可以继续深挖背后的故事（最多 3 层）' : 'Your answers differ — go deeper into the story behind (up to 3 layers)'}</p>
        </div>
      )}

      {/* 退出确认弹窗 */}
      <ConfirmDialog
        visible={showExitConfirm}
        title={cn ? '确认退出深度对话？' : 'Exit deep dialogue?'}
        message={cn ? `当前已完成 ${dialogueChain.filter((l) => l.revealVisible).length} 层深度对话。退出后会生成已完成的对话总结，然后回到原题继续下一题。` : `You have completed ${dialogueChain.filter((l) => l.revealVisible).length} layer(s). A summary will be generated, then you can continue to the next question.`}
        confirmLabel={cn ? '确认退出' : 'Exit'}
        cancelLabel={cn ? '再想想' : 'Stay'}
        onConfirm={() => { setShowExitConfirm(false); void exitDeepDialogue(); }}
        onCancel={() => setShowExitConfirm(false)}
      />

      {abAnswers.revealVisible && (
        <div className="flow-actions">
          {isLastQuestion ? (
            <button className="primary-btn" type="button" onClick={endJourney}>
              {cn ? '完成探索' : 'Finish Exploration'}
            </button>
          ) : (
            <>
              <button className="primary-btn" type="button" disabled={isGeneratingNextQuestion} onClick={goToNextQuestion}>
                {isGeneratingNextQuestion ? (cn ? 'AI 出题中…' : 'AI generating…') : (cn ? '继续探索' : 'Keep Exploring')}
              </button>
              <button type="button" disabled={isGeneratingNextQuestion} onClick={endJourney}>
                {cn ? '结束探索' : 'End Exploration'}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
