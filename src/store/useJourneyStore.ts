import { create } from 'zustand';
import { generateAiDialogueSummary, generateAiFollowup, generateAiInsights, generateAiQuestion, generateAiSimilarity, generateAiSummary } from '../features/relationship/aiJourneyService';
import { getGoalOption } from '../features/relationship/relationship.config';
import { JOURNEY_PROGRESS_DELTA, SIMILARITY_THRESHOLD } from '../features/relationship/journeyConfig';
import { getRecommendedRouteAreas } from '../features/relationship/routePlanner';
import { generateABInsights, getMirrorSignal, calculateSimilarity } from '../services/abEngine';
import { createMirrorEvent, generateRelationshipEvent } from '../services/eventEngine';
import { generateQuestion, generateWorldEffect } from '../services/questionEngine';
import { loadStats, saveStats, unlockDiscovery } from '../services/atlasDiscoveryEngine';
import { defaultWorldState, loadWorldState, saveWorldState } from '../services/worldStateService';
import { saveSnapshot } from '../services/relationshipSnapshotService';
import { recordExplorationCompleted } from '../services/notificationService';
import type {
  ABAnswers,
  ABInsights,
  JourneyGoal,
  JourneyLength,
  JourneyQuestion,
  JourneyRoute,
  MapArea,
  MirrorEventState,
  PresentMomentState,
  RelationshipEvent,
  RelationshipStage,
  StepFlow,
  SummaryData,
  WorldState,
} from '../types';

const stepFlow: StepFlow[] = ['setup', 'goal', 'route', 'journey', 'summary'];

// 深度对话单层数据
export interface DialogueLayer {
  depth: number;              // 0=原题, 1-3=追问层
  question: {
    question: string;
    hint: string;
    reason: string;
    focusArea: 'resonance' | 'difference' | 'emotion' | 'action';
    localized?: { cn: string; en: string };
    localizedHint?: { cn: string; en: string };
    localizedReason?: { cn: string; en: string };
  };
  answerA: string;
  answerB: string;
  answerAReady: boolean;
  answerBReady: boolean;
  revealVisible: boolean;
  similarity: number;
  insights: ABInsights | null;
}

// 深度对话总结
export interface DialogueSummary {
  trajectory: string;
  keyInsight: string;
  bridge: string;
  integration: string;
  completedDepth: number;
  isCompleted: boolean;
}

// 完整步骤顺序（含侧边入口），用于同步时的步骤优先级判断
// 主流程在前，侧边入口在后，避免对方在主流程时把本地从侧边入口拉回
const SYNC_STEP_ORDER: StepFlow[] = [
  'home', 'setup', 'goal', 'route', 'journey', 'event', 'summary',
  'world', 'discoveryAtlas', 'explorationHistory', 'spaceManagement', 'spaceLibrary', 'mirrorEngine',
];

const defaultPresentMoment: PresentMomentState = {
  scene: '',
  text: '',
  image: null,
  imagePreview: '',
  imageTags: [],
  imageCaption: '',
  imageUnderstandingSource: null,
  imageOcrText: '',
  imageOcrConfidence: null,
  imageOcrStatus: 'idle',
  captureMode: null,
  routeInfluence: null,
};

const defaultMirrorEvent: MirrorEventState = {
  unlocked: false,
  active: false,
  completed: false,
  skipped: false,
  signal: null,
  decision: null,
  memorySeed: '',
};

const defaultABAnswers: ABAnswers = {
  answerA: '',
  answerB: '',
  bMode: 'guess',
  similarity: 0,
  intensity: 'low',
  insights: null,
  revealVisible: false,
  answerAReady: false,
  answerBReady: false,
};

const defaultRoute: JourneyRoute = {
  areas: [],
  reason: '',
  generatedBy: 'relationship',
};

const defaultSummary: SummaryData = {
  route: defaultRoute,
  resonance: '',
  differences: '',
  discoveries: [],
  worldChanges: [],
  nextTopic: '',
  actionSuggestion: '',
  generatedBy: 'rules',
  events: [],
};

async function generateQuestionWithAiFallback(state: JourneyStoreState, questionIndex: number, historyQuestions: string[]) {
  const routeAreas = state.route.areas.length > 0 ? state.route.areas : [state.worldState.currentRegion];
  // 按题目索引轮转路线区域：第 0 题用 areas[0]，第 1 题用 areas[1]，循环
  const targetArea = routeAreas[questionIndex % routeAreas.length];
  // 题型均衡：偶数题用 guess（开放性），奇数题用 choice（选择型），交替
  const preferredType = questionIndex % 2 === 0 ? 'guess' : 'choice';
  try {
    const aiQuestion = await generateAiQuestion({
      stage: state.relationshipStage,
      goal: state.goal,
      areas: routeAreas,
      targetArea,
      preferredType,
      currentQuestionIndex: questionIndex,
      moment: state.presentMoment,
      history: historyQuestions,
      worldProgress: state.worldState.regionProgress,
    });
    return {
      ...aiQuestion,
      worldEffect: aiQuestion.worldEffect ?? generateWorldEffect(aiQuestion.emotion),
    };
  } catch {
    return generateQuestion({
      stage: state.relationshipStage,
      goal: state.goal,
      areas: routeAreas,
      currentQuestionIndex: questionIndex,
      moment: state.presentMoment,
      history: historyQuestions,
    });
  }
}

export interface JourneyStoreState {
  currentStep: StepFlow;
  previousStepName: StepFlow | null;
  // 标记用户是否手动返回了 home（区别于页面加载时的默认 home 状态）
  // 手动返回 home 后，同步不应把用户拉回主流程步骤
  isHomeManuallyNavigated: boolean;
  relationshipStage: RelationshipStage | null;
  goal: JourneyGoal | null;
  route: JourneyRoute;
  routeReason: string;
  journeyLength: JourneyLength;
  worldState: WorldState;
  mirrorEvent: MirrorEventState;
  presentMoment: PresentMomentState;
  abAnswers: ABAnswers;
  summary: SummaryData;
  currentQuestion: JourneyQuestion | null;
  currentEvent: RelationshipEvent | null;
  selectedExplorationId: string;
  currentQuestionIndex: number;
  journeyHistory: Array<{ question: JourneyQuestion; answers: ABAnswers; completedAt: string }>;
  events: RelationshipEvent[];
  isStartingJourney: boolean;
  isGeneratingNextQuestion: boolean;
  // 深度对话状态
  dialogueDepth: number;                    // 当前深度 0-3（0=未开启，1-3=追问层）
  dialogueChain: DialogueLayer[];           // 深度对话链（不含原题，仅 Layer 1-3）
  isGeneratingFollowup: boolean;            // AI 生成追问中
  isGeneratingDialogueSummary: boolean;     // AI 生成总结中
  dialogueSummary: DialogueSummary | null; // 深度对话总结
}

interface JourneyStore extends JourneyStoreState {
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: StepFlow) => void;
  setRelationshipStage: (stage: RelationshipStage) => void;
  setGoal: (goal: JourneyGoal) => void;
  setJourneyLength: (length: JourneyLength) => void;
  setRoute: (route: JourneyRoute) => void;
  setCurrentQuestion: (question: JourneyQuestion | null) => void;
  startJourney: () => void | Promise<void>;
  startMirrorEvent: () => void;
  completeCurrentEvent: () => void | Promise<void>;
  revealAnswers: () => Promise<void>;
  isRevealing: boolean;
  goToNextQuestion: () => void | Promise<void>;
  endJourney: () => void | Promise<void>;
  applyPresentMoment: (moment: Partial<PresentMomentState>) => void;
  submitAnswerA: (answerA: string) => void;
  submitAnswerB: (answerB: string) => void;
  setAnswerAReady: (ready: boolean) => void;
  setAnswerBReady: (ready: boolean) => void;
  unlockMirrorEvent: (mirrorEvent: MirrorEventState) => void;
  completeMirrorEvent: () => void;
  skipMirrorEvent: () => void | Promise<void>;
  addEvent: (event: RelationshipEvent) => void;
  setSelectedExplorationId: (explorationId: string) => void;
  completeQuestion: () => void;
  hydrateSharedState: (state: Partial<JourneyStoreState>) => void;
  completeJourney: (summary: SummaryData) => void;
  resetJourney: () => void;
  // 深度对话方法
  startDeepDialogue: () => Promise<void>;
  submitLayerAnswer: (role: 'A' | 'B', value: string) => void;
  setLayerReady: (role: 'A' | 'B', ready: boolean) => void;
  revealLayer: () => Promise<void>;
  exitDeepDialogue: () => Promise<void>;
}

export const useJourneyStore = create<JourneyStore>((set, get) => ({
  currentStep: 'home',
  previousStepName: null,
  isHomeManuallyNavigated: false,
  relationshipStage: null,
  goal: null,
  route: defaultRoute,
  routeReason: '',
  journeyLength: 'normal',
  worldState: loadWorldState(),
  mirrorEvent: defaultMirrorEvent,
  presentMoment: defaultPresentMoment,
  abAnswers: defaultABAnswers,
  isRevealing: false,
  summary: defaultSummary,
  currentQuestion: null,
  currentEvent: null,
  selectedExplorationId: '',
  currentQuestionIndex: 0,
  journeyHistory: [],
  events: [],
  isStartingJourney: false,
  isGeneratingNextQuestion: false,
  // 深度对话初始状态
  dialogueDepth: 0,
  dialogueChain: [],
  isGeneratingFollowup: false,
  isGeneratingDialogueSummary: false,
  dialogueSummary: null,
  nextStep: () => {
    const current = get().currentStep;
    const index = stepFlow.indexOf(current);
    if (index >= 0 && index < stepFlow.length - 1) {
      set({ previousStepName: current, currentStep: stepFlow[index + 1] });
    }
  },
  previousStep: () => {
    const current = get().currentStep;
    const index = stepFlow.indexOf(current);
    if (index > 0) {
      set({ previousStepName: current, currentStep: stepFlow[index - 1] });
    } else {
      const previousStepName = get().previousStepName;
      if (previousStepName) set({ currentStep: previousStepName });
    }
  },
  goToStep: (step) => set((state) => ({ previousStepName: state.currentStep, currentStep: step, isHomeManuallyNavigated: step === 'home' })),
  setRelationshipStage: (relationshipStage) => set((state) => {
    const goalOption = getGoalOption(state.goal);
    const routeAreas = getRecommendedRouteAreas(relationshipStage, state.goal);
    return {
      relationshipStage,
      route: goalOption ? { areas: routeAreas, reason: goalOption.routeReason, generatedBy: 'relationship' as const } : state.route,
    };
  }),
  setGoal: (goal) => {
    const goalOption = getGoalOption(goal);
    set((state) => {
      const routeAreas = getRecommendedRouteAreas(state.relationshipStage, goal);
      return {
        goal,
        route: goalOption
          ? {
              areas: routeAreas,
              reason: goalOption.routeReason,
              generatedBy: 'relationship' as const,
            }
          : state.route,
        routeReason: goalOption?.routeReason.cn ?? state.routeReason,
        worldState: goalOption
          ? {
              ...state.worldState,
              currentRegion: routeAreas[0] ?? goalOption.primaryArea,
              regionStates: routeAreas.reduce(
                (states, area) => ({ ...states, [area]: 'growth' as const }),
                { ...state.worldState.regionStates },
              ),
            }
          : state.worldState,
      };
    });
  },
  setJourneyLength: (journeyLength) => set({ journeyLength }),
  setRoute: (route) => set({ route, routeReason: typeof route.reason === 'string' ? route.reason : route.reason.cn }),
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
  startJourney: async () => {
    set({ isStartingJourney: true });
    try {
      const state = get();
      const question = await generateQuestionWithAiFallback(state, 0, state.journeyHistory.map((item) => item.question.question));
      set({ currentQuestion: question, currentQuestionIndex: 0, currentStep: 'journey', abAnswers: defaultABAnswers });
    } finally {
      set({ isStartingJourney: false });
    }
  },
  startMirrorEvent: () => {
    const state = get();
    const event = createMirrorEvent(state.mirrorEvent.memorySeed);
    set({
      currentEvent: event,
      events: [...state.events, event],
      currentStep: 'event',
      mirrorEvent: { ...state.mirrorEvent, active: true, decision: state.mirrorEvent.signal },
    });
  },
  completeCurrentEvent: async () => {
    const state = get();
    // 先清空事件，标记镜像事件完成
    set({
      currentEvent: null,
      mirrorEvent: { ...state.mirrorEvent, active: false, completed: true, unlocked: false },
      isGeneratingNextQuestion: true,
    });
    try {
      // 镜像事件完成后，生成下一题并跳转回旅程
      const question = await generateQuestionWithAiFallback(state, state.currentQuestionIndex, state.journeyHistory.map((item) => item.question.question));
      set({
        currentQuestion: question,
        currentStep: 'journey',
        abAnswers: defaultABAnswers,
        dialogueDepth: 0,
        dialogueChain: [],
        dialogueSummary: null,
      });
    } finally {
      set({ isGeneratingNextQuestion: false });
    }
  },
  revealAnswers: async () => {
    const state = get();
    if (!state.currentQuestion) return;
    const answerA = state.abAnswers.answerA;
    const answerB = state.abAnswers.answerB;
    const region = state.currentQuestion.region;
    const question = state.currentQuestion.localized?.cn ?? state.currentQuestion.question;
    const localSimilarity = calculateSimilarity(answerA, answerB);
    const hasMoment = Boolean(state.presentMoment.scene || state.presentMoment.text || state.presentMoment.image);

    // 标记正在揭晓，UI 显示 loading
    set({ isRevealing: true });

    // AI 语义相似度计算：优先调用 AI 获取更准确的语义相似度，失败回退到本地算法
    let similarity = localSimilarity;
    try {
      const aiSimResult = await generateAiSimilarity({ answerA, answerB, localSimilarity });
      if (aiSimResult.source === 'ai') {
        similarity = aiSimResult.similarity;
      }
    } catch {
      // AI 失败时使用本地算法结果
    }

    // 优先用 AI 生成个性化洞察，失败回退到规则引擎
    let insights: ABInsights;
    let mirrorTrigger: boolean;
    let nextMemorySeed: string;
    try {
      const aiResult = await generateAiInsights({
        answerA,
        answerB,
        similarity,
        question,
        stage: state.relationshipStage,
        goal: state.goal,
        region,
        hasMoment,
      });
      insights = aiResult.insights;
      mirrorTrigger = aiResult.mirrorSignal.trigger;
      nextMemorySeed = aiResult.mirrorSignal.nextMemorySeed;
    } catch {
      // 回退到规则引擎
      insights = generateABInsights(answerA, answerB, region);
      const ruleMirrorSignal = getMirrorSignal({
        stage: state.relationshipStage,
        goal: state.goal,
        similarity,
        hasMoment,
      });
      mirrorTrigger = ruleMirrorSignal.trigger;
      nextMemorySeed = ruleMirrorSignal.nextMemorySeed;
    }

    // 用规则引擎补全 mirrorSignal 的评分字段（用于 UI 展示）
    const mirrorSignal = getMirrorSignal({
      stage: state.relationshipStage,
      goal: state.goal,
      similarity,
      hasMoment,
    });
    mirrorSignal.trigger = mirrorTrigger;
    mirrorSignal.nextMemorySeed = nextMemorySeed;
    mirrorSignal.reason = mirrorTrigger ? 'mirror-unlocked' : 'continue-route';

    const generatedEvent = mirrorTrigger
      ? null
      : generateRelationshipEvent({
          region,
          questionType: state.currentQuestion.type,
          similarity,
          hasMoment,
          memorySeed: nextMemorySeed,
        });
    set({
      isRevealing: false,
      abAnswers: {
        ...state.abAnswers,
        similarity,
        intensity: similarity >= SIMILARITY_THRESHOLD.HIGH ? 'high' : similarity >= SIMILARITY_THRESHOLD.MEDIUM ? 'medium' : 'low',
        insights,
        revealVisible: true,
      },
      mirrorEvent: {
        ...state.mirrorEvent,
        unlocked: false,
        active: false,
        signal: mirrorSignal,
        decision: null,
        memorySeed: nextMemorySeed,
      },
      currentEvent: generatedEvent,
      events: generatedEvent ? [...state.events, generatedEvent] : state.events,
      worldState: {
        ...state.worldState,
        currentRegion: region,
        regionProgress: {
          ...state.worldState.regionProgress,
          [region]: Math.min(100, state.worldState.regionProgress[region] + JOURNEY_PROGRESS_DELTA),
        },
        regionStates: { ...state.worldState.regionStates, [region]: similarity >= SIMILARITY_THRESHOLD.HIGH ? 'bright' : 'growth' },
        visitedRegions: Array.from(new Set([...state.worldState.visitedRegions, region])),
        worldChanges: [
          ...state.worldState.worldChanges,
          { area: region, message: state.currentQuestion.worldEffect?.message ?? insights.emotion, progressDelta: JOURNEY_PROGRESS_DELTA },
        ],
      },
    });
  },
  goToNextQuestion: async () => {
    const state = get();
    if (!state.currentQuestion) return;
    set({ isGeneratingNextQuestion: true });
    try {
      const history = [...state.journeyHistory, { question: state.currentQuestion, answers: state.abAnswers, completedAt: new Date().toISOString() }];
      const nextIndex = state.currentQuestionIndex + 1;
      // 镜像事件暂时关闭 —— 逻辑有问题，后续修复后再启用
      // const shouldStartMirrorEvent = Boolean(state.mirrorEvent.signal?.trigger && !state.mirrorEvent.completed && !state.mirrorEvent.skipped);

      // if (shouldStartMirrorEvent) {
      //   // 镜像事件：不提前生成下一题，等镜像事件完成后再生成
      //   const event = createMirrorEvent(state.mirrorEvent.memorySeed);
      //   set({
      //     journeyHistory: history,
      //     currentQuestionIndex: nextIndex,
      //     currentQuestion: null,
      //     currentEvent: event,
      //     events: [...state.events, event],
      //     currentStep: 'event',
      //     abAnswers: defaultABAnswers,
      //     mirrorEvent: { ...state.mirrorEvent, active: true, unlocked: true, decision: state.mirrorEvent.signal },
      //   });
      //   return;
      // }

      const question = await generateQuestionWithAiFallback(state, nextIndex, history.map((item) => item.question.question));
      set({ journeyHistory: history, currentQuestionIndex: nextIndex, currentQuestion: question, abAnswers: defaultABAnswers, dialogueDepth: 0, dialogueChain: [], dialogueSummary: null });
    } finally {
      set({ isGeneratingNextQuestion: false });
    }
  },
  endJourney: async () => {
    const state = get();
    const history = state.currentQuestion && state.abAnswers.revealVisible
      ? [...state.journeyHistory, { question: state.currentQuestion, answers: state.abAnswers, completedAt: new Date().toISOString() }]
      : state.journeyHistory;
    if (history.length === 0) return;

    const lastItem = history[history.length - 1];
    const stats = loadStats();
    const region = lastItem.question.region;
    const eventTypes = state.events.map((event) => event.type);
    const nextStats = {
      ...stats,
      completeCount: stats.completeCount + 1,
      regionCounts: { ...stats.regionCounts, [region]: (stats.regionCounts[region] ?? 0) + 1 },
      eventCounts: eventTypes.reduce((acc, type) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }), { ...stats.eventCounts }),
      momentUpload: stats.momentUpload || Boolean(state.presentMoment.image),
      lastExploreTime: Date.now(),
      longestAnswer: Math.max(stats.longestAnswer, lastItem.answers.answerA.length, lastItem.answers.answerB.length),
      regionVisited: Array.from(new Set([...stats.regionVisited, ...state.worldState.visitedRegions, region])),
      eventTypeVisited: Array.from(new Set([...stats.eventTypeVisited, ...eventTypes])),
    };
    const unlockResult = unlockDiscovery({
      event: eventTypes[eventTypes.length - 1],
      region,
      journey: {
        length: history.length,
        hasEvent: state.events.length > 0,
        eventCount: state.events.length,
        firstMomentUpload: Boolean(state.presentMoment.image),
      },
      stats,
      answers: { a: lastItem.answers.answerA, b: lastItem.answers.answerB },
      guessMatched: lastItem.answers.similarity >= SIMILARITY_THRESHOLD.HIGH,
    });
    saveStats(nextStats);
    saveWorldState(state.worldState);
    saveSnapshot({
      regionProgress: { ...state.worldState.regionProgress },
      resonance: lastItem.answers.insights?.resonance ?? '',
      eventCount: state.events.length,
    });
    // 提醒功能暂时关闭
    // recordExplorationCompleted();
    let aiSummary: Partial<SummaryData> = {};
    try {
      aiSummary = await generateAiSummary({
        stage: state.relationshipStage,
        goal: state.goal,
        route: state.route,
        moment: state.presentMoment,
        history,
        events: state.events,
      });
    } catch {
      aiSummary = {
        resonance: lastItem.answers.insights?.resonance ?? '',
        differences: lastItem.answers.insights?.difference ?? '',
        nextTopic: lastItem.answers.insights?.suggestion ?? '',
        actionSuggestion: lastItem.answers.insights?.suggestion ?? '',
        generatedBy: 'rules',
      };
    }
    set({
      journeyHistory: history,
      summary: {
        route: state.route,
        resonance: aiSummary.resonance ?? lastItem.answers.insights?.resonance ?? '',
        differences: aiSummary.differences ?? lastItem.answers.insights?.difference ?? '',
        discoveries: unlockResult.newItems.map((item) => item.id),
        worldChanges: state.worldState.worldChanges,
        nextTopic: aiSummary.nextTopic ?? lastItem.answers.insights?.suggestion ?? '',
        actionSuggestion: aiSummary.actionSuggestion ?? lastItem.answers.insights?.suggestion ?? '',
        generatedBy: aiSummary.generatedBy ?? 'rules',
        moment: state.presentMoment,
        events: state.events,
      },
      currentStep: 'summary',
    });
  },
  applyPresentMoment: (moment) => set((state) => {
    const presentMoment = { ...state.presentMoment, ...moment };
    const route = presentMoment.routeInfluence
      ? {
          areas: Array.from(new Set([...state.route.areas, presentMoment.routeInfluence.primaryArea])),
          reason: presentMoment.routeInfluence.reason,
          generatedBy: 'hybrid' as const,
        }
      : state.route;

    return {
      presentMoment,
      route,
      routeReason: typeof route.reason === 'string' ? route.reason : state.routeReason,
      worldState: presentMoment.routeInfluence
        ? {
            ...state.worldState,
            currentRegion: presentMoment.routeInfluence.primaryArea,
            regionStates: { ...state.worldState.regionStates, [presentMoment.routeInfluence.primaryArea]: 'growth' },
          }
        : state.worldState,
    };
  }),
  submitAnswerA: (answerA) => set((state) => ({ abAnswers: { ...state.abAnswers, answerA } })),
  submitAnswerB: (answerB) => set((state) => ({ abAnswers: { ...state.abAnswers, answerB } })),
  setAnswerAReady: (ready) => set((state) => ({ abAnswers: { ...state.abAnswers, answerAReady: ready } })),
  setAnswerBReady: (ready) => set((state) => ({ abAnswers: { ...state.abAnswers, answerBReady: ready } })),
  unlockMirrorEvent: (mirrorEvent) => set({ mirrorEvent }),
  completeMirrorEvent: () => set((state) => ({ mirrorEvent: { ...state.mirrorEvent, active: false, completed: true } })),
  skipMirrorEvent: async () => {
    const state = get();
    set({
      currentEvent: null,
      mirrorEvent: { ...state.mirrorEvent, active: false, skipped: true, unlocked: false },
      isGeneratingNextQuestion: true,
    });
    try {
      const question = await generateQuestionWithAiFallback(state, state.currentQuestionIndex, state.journeyHistory.map((item) => item.question.question));
      set({
        currentQuestion: question,
        currentStep: 'journey',
        abAnswers: defaultABAnswers,
        dialogueDepth: 0,
        dialogueChain: [],
        dialogueSummary: null,
      });
    } finally {
      set({ isGeneratingNextQuestion: false });
    }
  },
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  setSelectedExplorationId: (selectedExplorationId) => set({ selectedExplorationId }),
  completeQuestion: () => {
    const state = get();
    if (!state.currentQuestion) return;
    set({
      journeyHistory: [...state.journeyHistory, { question: state.currentQuestion, answers: state.abAnswers, completedAt: new Date().toISOString() }],
      currentQuestionIndex: state.currentQuestionIndex + 1,
      abAnswers: defaultABAnswers,
    });
  },
  hydrateSharedState: (sharedState) => set((state) => {
    const incoming = { ...sharedState } as Partial<JourneyStoreState>;
    // currentStep 只允许前进，不允许后退
    // 避免对方还在上一页时把你也拉回去
    const localStepIndex = SYNC_STEP_ORDER.indexOf(state.currentStep);
    const incomingStepIndex = incoming.currentStep ? SYNC_STEP_ORDER.indexOf(incoming.currentStep) : -1;
    // 用户手动返回 home 后，不应被对方主流程步骤拉回
    // 页面加载时的默认 home（isHomeManuallyNavigated=false）允许正常恢复
    const isLocalAtHome = state.currentStep === 'home' && state.isHomeManuallyNavigated;
    if (isLocalAtHome || (incomingStepIndex >= 0 && incomingStepIndex < localStepIndex)) {
      incoming.currentStep = state.currentStep;
    }
    // 智能合并 abAnswers：保留本地答案，只更新对方的答案和 ready 标识
    if (incoming.abAnswers) {
      const incomingAb = incoming.abAnswers;
      const localAb = state.abAnswers;
      // 如果已经揭晓，接受全部答案
      if (incomingAb.revealVisible) {
        incoming.abAnswers = { ...incomingAb };
      } else {
        // 未揭晓：保留本地答案文本，只同步 ready 标识
        incoming.abAnswers = {
          ...localAb,
          answerAReady: incomingAb.answerAReady ?? localAb.answerAReady,
          answerBReady: incomingAb.answerBReady ?? localAb.answerBReady,
          // 如果对方同步了答案（双方都 ready 时），接受对方的答案
          answerA: incomingAb.answerA || localAb.answerA,
          answerB: incomingAb.answerB || localAb.answerB,
        };
      }
    }
    return incoming;
  }),
  completeJourney: (summary) => set({ summary, currentStep: 'summary' }),
  // 深度对话：开启下一层追问
  startDeepDialogue: async () => {
    const state = get();
    if (state.dialogueDepth >= 3) return;
    if (!state.currentQuestion) return;
    const nextDepth = state.dialogueDepth + 1;
    const prevLayer = state.dialogueChain[state.dialogueChain.length - 1];
    const prevInsights = prevLayer?.insights ?? state.abAnswers.insights;
    const originalQuestion = state.currentQuestion.localized?.cn ?? state.currentQuestion.question;
    const answerA = prevLayer?.answerA ?? state.abAnswers.answerA;
    const answerB = prevLayer?.answerB ?? state.abAnswers.answerB;

    set({ isGeneratingFollowup: true });
    try {
      const followup = await generateAiFollowup({
        depth: nextDepth,
        originalQuestion,
        answerA,
        answerB,
        prevInsights: prevInsights ?? null,
        stage: state.relationshipStage,
        goal: state.goal,
      });
      const newLayer: DialogueLayer = {
        depth: nextDepth,
        question: {
          question: followup.question,
          hint: followup.hint,
          reason: followup.reason,
          focusArea: followup.focusArea,
          localized: followup.localized,
          localizedHint: followup.localizedHint,
          localizedReason: followup.localizedReason,
        },
        answerA: '',
        answerB: '',
        answerAReady: false,
        answerBReady: false,
        revealVisible: false,
        similarity: 0,
        insights: null,
      };
      set({
        isGeneratingFollowup: false,
        dialogueDepth: nextDepth,
        dialogueChain: [...state.dialogueChain, newLayer],
      });
    } catch {
      // fallback 追问
      const fallbackQuestions = [
        '能多说一点你这样想的原因吗？',
        '这个想法背后有没有什么具体的经历？',
        '如果要把你们的发现带入日常，你觉得可以怎么做？',
      ];
      const fallbackHints = [
        '从一个具体的瞬间或经历说起会更容易。',
        '不用完整，一个画面或感受都可以。',
        '哪怕是一个很小的尝试也行。',
      ];
      const idx = Math.min(nextDepth - 1, fallbackQuestions.length - 1);
      const newLayer: DialogueLayer = {
        depth: nextDepth,
        question: {
          question: fallbackQuestions[idx],
          hint: fallbackHints[idx],
          reason: '追问是为了看见答案背后的故事。',
          focusArea: 'difference',
        },
        answerA: '',
        answerB: '',
        answerAReady: false,
        answerBReady: false,
        revealVisible: false,
        similarity: 0,
        insights: null,
      };
      set({
        isGeneratingFollowup: false,
        dialogueDepth: nextDepth,
        dialogueChain: [...state.dialogueChain, newLayer],
      });
    }
  },
  // 深度对话：提交某层答案
  submitLayerAnswer: (role, value) => set((state) => {
    const chain = [...state.dialogueChain];
    const current = chain[chain.length - 1];
    if (!current) return {};
    chain[chain.length - 1] = role === 'A'
      ? { ...current, answerA: value }
      : { ...current, answerB: value };
    return { dialogueChain: chain };
  }),
  // 深度对话：设置某层 ready
  setLayerReady: (role, ready) => set((state) => {
    const chain = [...state.dialogueChain];
    const current = chain[chain.length - 1];
    if (!current) return {};
    chain[chain.length - 1] = role === 'A'
      ? { ...current, answerAReady: ready }
      : { ...current, answerBReady: ready };
    return { dialogueChain: chain };
  }),
  // 深度对话：揭晓当前层
  revealLayer: async () => {
    const state = get();
    const current = state.dialogueChain[state.dialogueChain.length - 1];
    if (!current) return;
    const localSimilarity = calculateSimilarity(current.answerA, current.answerB);
    const region = state.currentQuestion?.region ?? 'forest';

    // AI 语义相似度：优先 AI，失败回退本地
    let similarity = localSimilarity;
    try {
      const aiSimResult = await generateAiSimilarity({ answerA: current.answerA, answerB: current.answerB, localSimilarity });
      if (aiSimResult.source === 'ai') {
        similarity = aiSimResult.similarity;
      }
    } catch {
      // AI 失败时使用本地算法结果
    }

    let insights: ABInsights;
    try {
      const aiResult = await generateAiInsights({
        answerA: current.answerA,
        answerB: current.answerB,
        similarity,
        question: current.question.question,
        stage: state.relationshipStage,
        goal: state.goal,
        region,
        hasMoment: false,
      });
      insights = aiResult.insights;
    } catch {
      insights = generateABInsights(current.answerA, current.answerB, region);
    }
    set((s) => {
      const chain = [...s.dialogueChain];
      const idx = chain.length - 1;
      chain[idx] = {
        ...chain[idx],
        similarity,
        insights,
        revealVisible: true,
      };
      return { dialogueChain: chain };
    });
  },
  // 深度对话：退出并生成总结
  exitDeepDialogue: async () => {
    const state = get();
    if (state.dialogueChain.length === 0) {
      set({ dialogueDepth: 0 });
      return;
    }
    const completedDepth = state.dialogueChain.filter((l) => l.revealVisible).length;
    set({ isGeneratingDialogueSummary: true });
    try {
      const summary = await generateAiDialogueSummary({
        layers: state.dialogueChain.map((l) => ({
          depth: l.depth,
          question: l.question.question,
          answerA: l.answerA,
          answerB: l.answerB,
          similarity: l.similarity,
          insights: l.insights,
        })),
        completedDepth,
        stage: state.relationshipStage,
        goal: state.goal,
      });
      set({ isGeneratingDialogueSummary: false, dialogueSummary: summary, dialogueDepth: 0 });
    } catch {
      set({
        isGeneratingDialogueSummary: false,
        dialogueSummary: {
          trajectory: '你们从表面的分歧开始，逐渐看见彼此答案背后的故事。',
          keyInsight: '差异不是对立，而是两种不同的爱的表达。',
          bridge: '找一个轻松的时刻，把对方打动你的部分复述给对方听。',
          integration: '把这次发现作为你们关系中的一个小小默契。',
          completedDepth,
          isCompleted: completedDepth >= 3,
        },
        dialogueDepth: 0,
      });
    }
  },
  resetJourney: () => set({
    currentStep: 'setup',
    isHomeManuallyNavigated: false,
    relationshipStage: null,
    goal: null,
    route: defaultRoute,
    routeReason: '',
    journeyLength: 'normal',
    worldState: loadWorldState(),
    mirrorEvent: defaultMirrorEvent,
    presentMoment: defaultPresentMoment,
    abAnswers: defaultABAnswers,
    summary: defaultSummary,
    currentQuestion: null,
    currentEvent: null,
    currentQuestionIndex: 0,
    journeyHistory: [],
    events: [],
    dialogueDepth: 0,
    dialogueChain: [],
    isGeneratingFollowup: false,
    isGeneratingDialogueSummary: false,
    dialogueSummary: null,
  }),
}));
