import type { RelationshipEvent } from './event';
import type { LocalizedText } from './i18n';
import type { MapArea, WorldChange } from './map';
import type { PresentMomentState } from './presentMoment';

export type StepFlow = 'home' | 'setup' | 'goal' | 'route' | 'journey' | 'event' | 'summary' | 'world' | 'discoveryAtlas' | 'explorationHistory' | 'spaceManagement' | 'spaceLibrary' | 'mirrorEngine';

export type JourneyLength = 'short' | 'normal' | 'deep';

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
}

export interface JourneyHistoryItem {
  question: JourneyQuestion;
  answers: ABAnswers;
  completedAt: string;
}

export interface SummaryData {
  route: JourneyRoute;
  resonance: string;
  discoveries: string[];
  worldChanges: WorldChange[];
  nextTopic: string;
  moment?: PresentMomentState;
  events: RelationshipEvent[];
}
