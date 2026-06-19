import type { JourneyGoal, RelationshipStage } from './relationship';

export interface MirrorSignalBreakdown {
  trigger: boolean;
  triggerScore: number;
  probability: number;
  stageScore: number;
  goalScore: number;
  mismatchScore: number;
  momentScore: number;
  stage: RelationshipStage | string;
  goal: JourneyGoal | string;
  forceTrigger: boolean;
  reason: 'mirror-unlocked' | 'continue-route';
  nextMemorySeed: string;
}

export interface MirrorEventState {
  unlocked: boolean;
  active: boolean;
  completed: boolean;
  skipped: boolean;
  signal: MirrorSignalBreakdown | null;
  decision: MirrorSignalBreakdown | null;
  memorySeed: string;
}
