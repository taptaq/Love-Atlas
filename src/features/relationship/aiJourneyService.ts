import type { JourneyGoal, JourneyHistoryItem, JourneyQuestion, JourneyRoute, MapArea, MoodTag, PresentMomentState, RelationshipEvent, RelationshipStage } from '../../types';
import type { ABInsights } from '../../types';

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export interface AiInsightsResult {
  insights: ABInsights;
}

export function generateAiInsights(params: {
  answerA: string;
  answerB: string;
  similarity: number;
  question: string;
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  region: MapArea;
  hasMoment: boolean;
}) {
  return postJson<AiInsightsResult>('/api/ai/insights', params);
}

export interface AiMomentInfluence {
  primaryArea: MapArea;
  reason: string;
  weight: number;
}

export function generateAiMomentInfluence(params: {
  text: string;
  scene: string;
  imageTags: string[];
}) {
  return postJson<AiMomentInfluence>('/api/ai/moment', params);
}

export interface AiCompanionAnswer {
  answer: string;
  ready: boolean;
}

export function generateAiCompanionAnswer(params: {
  question: string;
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  questionIndex: number;
}) {
  return postJson<AiCompanionAnswer>('/api/ai/companion', params);
}

export interface AiThemeResult {
  icon: string;
  title: { cn: string; en: string };
  description: { cn: string; en: string };
  goal: JourneyGoal;
  stage: RelationshipStage;
  momentText: { cn: string; en: string };
  accent: 'rose' | 'mist' | 'amber' | 'teal';
}

export function generateAiTheme(params: {
  stage: RelationshipStage | null;
  history: string[];
  worldProgress?: Record<string, number>;
  lastExploreDays: number;
  weekKey: string;
}) {
  return postJson<AiThemeResult>('/api/ai/theme', params);
}

// 动态深度上下文：传给 AI 用于实时判断下一题深度
export interface DynamicDepthContext {
  questionsAsked: number;
  // 历史每题的相似度和简短问答摘要
  historySummary: Array<{
    question: string;
    answerA: string;
    answerB: string;
    similarity: number;
  }>;
  // 相似度趋势
  avgSimilarity: number;
  recentSimilarityTrend: 'rising' | 'falling' | 'stable';
  // 是否刚结束深度对话
  hadDeepDialogue: boolean;
  deepDialogueDepth: number;
  // 连续低共鸣题数（差异大）
  consecutiveLowResonance: number;
  // 连续高共鸣题数
  consecutiveHighResonance: number;
}

export function generateAiQuestion(params: {
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  areas: MapArea[];
  targetArea?: MapArea;
  preferredType?: 'guess' | 'mirror' | 'choice' | 'sync';
  currentQuestionIndex: number;
  moment: PresentMomentState;
  history: string[];
  structuredHistory?: Array<{ question: string; answerA: string; answerB: string; similarity: number }>;
  dynamicDepth?: DynamicDepthContext;
  worldProgress?: Record<string, number>;
  // 情绪签到：仅第一题传入，影响问题方向和温度
  mood?: MoodTag | null;
  // 跨探索记忆：仅第一题传入，避免重复并基于之前发现继续
  memory?: string;
}) {
  return postJson<JourneyQuestion>('/api/ai/question', params);
}

export function generateAiSummary(params: {
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  route: JourneyRoute;
  moment: PresentMomentState;
  history: JourneyHistoryItem[];
  events: RelationshipEvent[];
}) {
  return postJson<{
    resonance: string;
    differences: string;
    nextTopic: string;
    actionSuggestion: string;
    generatedBy: 'ai';
  }>('/api/ai/summary', params);
}

export function generateAiCoach(params: {
  answerA: string;
  answerB: string;
  similarity: number;
  question: string;
}) {
  return postJson<{
    coach: { cn: string; en: string };
    buffer: { cn: string; en: string };
  }>('/api/ai/coach', params);
}

// 深度对话追问
export interface AiFollowupResult {
  question: string;
  hint: string;
  reason: string;
  focusArea: 'resonance' | 'difference' | 'emotion' | 'action';
  localized: { cn: string; en: string };
  localizedHint: { cn: string; en: string };
  localizedReason: { cn: string; en: string };
}

export function generateAiFollowup(params: {
  depth: number;
  originalQuestion: string;
  answerA: string;
  answerB: string;
  prevInsights: ABInsights | null;
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  // 触发类型：低共鸣探索差异，高共鸣深化连接
  trigger?: 'low_resonance' | 'high_resonance';
}) {
  return postJson<AiFollowupResult>('/api/ai/followup', params);
}

// 深度对话总结
export interface AiDialogueSummaryResult {
  trajectory: string;
  keyInsight: string;
  bridge: string;
  integration: string;
  completedDepth: number;
  isCompleted: boolean;
}

export function generateAiDialogueSummary(params: {
  layers: unknown[];
  completedDepth: number;
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
}) {
  return postJson<AiDialogueSummaryResult>('/api/ai/dialogue-summary', params);
}

// AI 语义相似度计算
export interface AiSimilarityResult {
  similarity: number;
  source: 'ai' | 'fallback';
}

export function generateAiSimilarity(params: {
  answerA: string;
  answerB: string;
  localSimilarity: number;
}) {
  return postJson<AiSimilarityResult>('/api/ai/similarity', params);
}
