import type { JourneyGoal, JourneyHistoryItem, JourneyQuestion, JourneyRoute, MapArea, PresentMomentState, RelationshipEvent, RelationshipStage } from '../../types';
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
  mirrorSignal: {
    trigger: boolean;
    nextMemorySeed: string;
  };
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

export interface AiReminderResult {
  title: { cn: string; en: string };
  body: { cn: string; en: string };
}

export function generateAiReminder(params: {
  days: number;
  stage: RelationshipStage | null;
  lastGoal: JourneyGoal | null;
  history: string[];
}) {
  return postJson<AiReminderResult>('/api/ai/reminder', params);
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
  answerA: string;
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

export function generateAiQuestion(params: {
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  areas: MapArea[];
  currentQuestionIndex: number;
  moment: PresentMomentState;
  history: string[];
  worldProgress?: Record<string, number>;
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
