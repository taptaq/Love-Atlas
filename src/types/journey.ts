import type { RelationshipEvent } from './event';
import type { LocalizedText } from './i18n';
import type { MapArea, WorldChange } from './map';
import type { PresentMomentState } from './presentMoment';

export type StepFlow = 'home' | 'setup' | 'goal' | 'route' | 'journey' | 'summary' | 'world' | 'discoveryAtlas' | 'explorationHistory' | 'spaceManagement' | 'spaceLibrary';

// 情绪签到标签
export type MoodTag = 'calm' | 'expectant' | 'tired' | 'anxious' | 'happy' | 'low' | 'curious' | 'missing';

export type QuestionType = 'guess' | 'mirror' | 'choice' | 'sync';

export interface JourneyRoute {
  areas: MapArea[];
  reason: LocalizedText | string;
  generatedBy: 'relationship' | 'presentMoment' | 'hybrid';
}

export interface JourneyQuestion {
  question: string;
  hint: string;
  emotion: string;
  region: MapArea;
  type: QuestionType;
  localized?: LocalizedText;
  localizedHint?: LocalizedText;
  localizedReason?: LocalizedText;
  reason?: string;
  worldEffect?: {
    message: string;
    unlock: string;
    localizedMessage?: LocalizedText;
  };
}

export interface ABInsights {
  resonance: string;
  difference: string;
  emotion: string;
  suggestion: string;
}

export interface ABAnswers {
  answerA: string;
  answerB: string;
  bMode: 'guess' | 'self';
  similarity: number;
  intensity: 'high' | 'medium' | 'low';
  insights: ABInsights | null;
  revealVisible: boolean;
  answerAReady: boolean;
  answerBReady: boolean;
  // 分阶段揭晓：idle=未揭晓, anticipating=期待期(双方ready), revealing_answer=揭示对方答案, revealing_similarity=渐入相似度, revealing_insight=呈现洞察, complete=完成
  revealStage: 'idle' | 'anticipating' | 'revealing_answer' | 'revealing_similarity' | 'revealing_insight' | 'complete';
}

export interface JourneyHistoryItem {
  question: JourneyQuestion;
  answers: ABAnswers;
  completedAt: string;
}

export interface SummaryData {
  route: JourneyRoute;
  resonance: string;
  differences?: string;
  discoveries: string[];
  worldChanges: WorldChange[];
  nextTopic: string;
  actionSuggestion?: string;
  generatedBy?: 'ai' | 'rules';
  moment?: PresentMomentState;
  events: RelationshipEvent[];
}
