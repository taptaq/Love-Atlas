import type { LocalizedText } from './i18n';

export type EventType = 'memory' | 'switch' | 'moment' | 'future' | 'silence';

export interface RelationshipEvent {
  type: EventType;
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  action: LocalizedText;
  question: LocalizedText;
  duration?: number;
  timestamp?: string;
  unlockedByAI?: boolean;
}
