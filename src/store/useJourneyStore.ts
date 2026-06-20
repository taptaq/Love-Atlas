import { create } from 'zustand';
import { getGoalOption } from '../features/relationship/relationship.config';
import { JOURNEY_PROGRESS_DELTA, SIMILARITY_THRESHOLD } from '../features/relationship/journeyConfig';
import { getRecommendedRouteAreas } from '../features/relationship/routePlanner';
import { generateABInsights, getMirrorSignal, calculateSimilarity } from '../services/abEngine';
import { createMirrorEvent, generateRelationshipEvent } from '../services/eventEngine';
import { generateQuestion } from '../services/questionEngine';
import { loadStats, saveStats, unlockDiscovery } from '../services/atlasDiscoveryEngine';
import { defaultWorldState, loadWorldState, saveWorldState } from '../services/worldStateService';
import type {
  ABAnswers,
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
  discoveries: [],
  worldChanges: [],
  nextTopic: '',
  events: [],
};

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
  startJourney: () => void;
  startMirrorEvent: () => void;
  completeCurrentEvent: () => void;
  revealAnswers: () => void;
  goToNextQuestion: () => void;
  endJourney: () => void;
  applyPresentMoment: (moment: Partial<PresentMomentState>) => void;
  submitAnswerA: (answerA: string) => void;
  submitAnswerB: (answerB: string) => void;
  setAnswerAReady: (ready: boolean) => void;
  setAnswerBReady: (ready: boolean) => void;
  unlockMirrorEvent: (mirrorEvent: MirrorEventState) => void;
  completeMirrorEvent: () => void;
  skipMirrorEvent: () => void;
  addEvent: (event: RelationshipEvent) => void;
  setSelectedExplorationId: (explorationId: string) => void;
  completeQuestion: () => void;
  hydrateSharedState: (state: Partial<JourneyStoreState>) => void;
  completeJourney: (summary: SummaryData) => void;
  resetJourney: () => void;
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
  summary: defaultSummary,
  currentQuestion: null,
  currentEvent: null,
  selectedExplorationId: '',
  currentQuestionIndex: 0,
  journeyHistory: [],
  events: [],
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
  startJourney: () => {
    const state = get();
    const question = generateQuestion({
      stage: state.relationshipStage,
      goal: state.goal,
      areas: state.route.areas.length > 0 ? state.route.areas : [state.worldState.currentRegion],
      currentQuestionIndex: 0,
      moment: state.presentMoment,
      history: state.journeyHistory.map((item) => item.question.question),
    });
    set({ currentQuestion: question, currentQuestionIndex: 0, currentStep: 'journey', abAnswers: defaultABAnswers });
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
  completeCurrentEvent: () => {
    const state = get();
    set({
      currentEvent: null,
      currentStep: 'journey',
      mirrorEvent: { ...state.mirrorEvent, active: false, completed: true, unlocked: false },
    });
  },
  revealAnswers: () => {
    const state = get();
    if (!state.currentQuestion) return;
    const similarity = calculateSimilarity(state.abAnswers.answerA, state.abAnswers.answerB);
    const insights = generateABInsights(state.abAnswers.answerA, state.abAnswers.answerB, state.currentQuestion.region);
    const mirrorSignal = getMirrorSignal({
      stage: state.relationshipStage,
      goal: state.goal,
      similarity,
      hasMoment: Boolean(state.presentMoment.scene || state.presentMoment.text || state.presentMoment.image),
    });
    const generatedEvent = mirrorSignal.trigger
      ? null
      : generateRelationshipEvent({
          region: state.currentQuestion.region,
          questionType: state.currentQuestion.type,
          similarity,
          hasMoment: Boolean(state.presentMoment.scene || state.presentMoment.text || state.presentMoment.image),
          memorySeed: mirrorSignal.nextMemorySeed,
        });
    set({
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
        memorySeed: mirrorSignal.nextMemorySeed,
      },
      currentEvent: generatedEvent,
      events: generatedEvent ? [...state.events, generatedEvent] : state.events,
      worldState: {
        ...state.worldState,
        currentRegion: state.currentQuestion.region,
        regionProgress: {
          ...state.worldState.regionProgress,
          [state.currentQuestion.region]: Math.min(100, state.worldState.regionProgress[state.currentQuestion.region] + JOURNEY_PROGRESS_DELTA),
        },
        regionStates: { ...state.worldState.regionStates, [state.currentQuestion.region]: similarity >= SIMILARITY_THRESHOLD.HIGH ? 'bright' : 'growth' },
        visitedRegions: Array.from(new Set([...state.worldState.visitedRegions, state.currentQuestion.region])),
        worldChanges: [
          ...state.worldState.worldChanges,
          { area: state.currentQuestion.region, message: state.currentQuestion.worldEffect?.message ?? insights.emotion, progressDelta: JOURNEY_PROGRESS_DELTA },
        ],
      },
    });
  },
  goToNextQuestion: () => {
    const state = get();
    if (!state.currentQuestion) return;
    const history = [...state.journeyHistory, { question: state.currentQuestion, answers: state.abAnswers, completedAt: new Date().toISOString() }];
    const nextIndex = state.currentQuestionIndex + 1;
    const shouldStartMirrorEvent = Boolean(state.mirrorEvent.signal?.trigger && !state.mirrorEvent.completed && !state.mirrorEvent.skipped);

    if (shouldStartMirrorEvent) {
      const nextQuestion = generateQuestion({
        stage: state.relationshipStage,
        goal: state.goal,
        areas: state.route.areas.length > 0 ? state.route.areas : [state.worldState.currentRegion],
        currentQuestionIndex: nextIndex,
        moment: state.presentMoment,
        history: history.map((item) => item.question.question),
      });
      const event = createMirrorEvent(state.mirrorEvent.memorySeed);
      set({
        journeyHistory: history,
        currentQuestionIndex: nextIndex,
        currentQuestion: nextQuestion,
        currentEvent: event,
        events: [...state.events, event],
        currentStep: 'event',
        abAnswers: defaultABAnswers,
        mirrorEvent: { ...state.mirrorEvent, active: true, unlocked: true, decision: state.mirrorEvent.signal },
      });
      return;
    }

    const question = generateQuestion({
      stage: state.relationshipStage,
      goal: state.goal,
      areas: state.route.areas.length > 0 ? state.route.areas : [state.worldState.currentRegion],
      currentQuestionIndex: nextIndex,
      moment: state.presentMoment,
      history: history.map((item) => item.question.question),
    });
    set({ journeyHistory: history, currentQuestionIndex: nextIndex, currentQuestion: question, abAnswers: defaultABAnswers });
  },
  endJourney: () => {
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
    set({
      journeyHistory: history,
      summary: {
        route: state.route,
        resonance: lastItem.answers.insights?.resonance ?? '',
        discoveries: unlockResult.newItems.map((item) => item.id),
        worldChanges: state.worldState.worldChanges,
        nextTopic: lastItem.answers.insights?.suggestion ?? '',
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
  skipMirrorEvent: () => set((state) => ({ currentEvent: null, currentStep: 'journey', mirrorEvent: { ...state.mirrorEvent, active: false, skipped: true, unlocked: false } })),
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
  }),
}));
