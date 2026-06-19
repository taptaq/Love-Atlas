import type { JourneyStoreState } from '../store/useJourneyStore';

export type SessionStatus = 'waiting' | 'active' | 'completed';

export type RelationshipSharedState = Pick<
  JourneyStoreState,
  | 'currentStep'
  | 'relationshipStage'
  | 'goal'
  | 'route'
  | 'mirrorEvent'
  | 'presentMoment'
  | 'abAnswers'
  | 'worldState'
  | 'summary'
  | 'currentQuestionIndex'
  | 'currentQuestion'
  | 'journeyLength'
  | 'journeyHistory'
  | 'events'
  | 'currentEvent'
> & {
  abInteraction: JourneyStoreState['abAnswers'];
  mapState: JourneyStoreState['worldState'];
};

export type RelationshipSession = {
  id: string;
  status: SessionStatus;
  host_id: string;
  partner_id: string | null;
  created_at: string;
  relationship_stage: string | null;
  goal: string | null;
};

export type RelationshipSessionState = {
  session_id: string;
  shared_state: RelationshipSharedState;
  updated_at: string;
};
