import type { RelationshipSession, RelationshipSharedState } from './session';

export type RelationshipSpaceType = 'temporary' | 'persistent';
export type RelationshipSpaceStatus = 'waiting' | 'active' | 'completed' | 'archived' | 'unbound';
export type ExplorationStatus = 'draft' | 'active' | 'completed' | 'abandoned';
export type SpaceRole = 'owner' | 'partner' | null;

export type RelationshipSpace = {
  id: string;
  type: RelationshipSpaceType;
  status: RelationshipSpaceStatus;
  invite_code: string;
  name: string | null;
  companion: boolean;
  created_by_user_id: string | null;
  created_by_participant_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExplorationSession = {
  id: string;
  space_id: string;
  legacy_session_id: string | null;
  mode: RelationshipSpaceType;
  status: ExplorationStatus;
  relationship_stage: string | null;
  goal: string | null;
  current_step: string;
  created_at: string;
  updated_at: string;
};

export type SpaceApiResult = {
  space: RelationshipSpace;
  exploration: ExplorationSession;
  session: RelationshipSession;
  role: Exclude<SpaceRole, null>;
};

export type ExplorationListResult = {
  explorations: ExplorationSession[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ExplorationStateResult = {
  sharedState: RelationshipSharedState | null;
};

export type StructuredAbInteraction = {
  id: string;
  question_id: string;
  question_text: string;
  host_answer: string | null;
  partner_answer: string | null;
  result: unknown;
  created_at: string;
  completed_at: string | null;
};

export type StructuredSessionSummary = {
  id: string;
  summary_text: string;
  highlights: unknown;
  suggestions: unknown;
  generated_from: unknown;
  created_at: string;
};

export type ExplorationDetailResult = {
  exploration: ExplorationSession | null;
  abInteractions: StructuredAbInteraction[];
  summaries: StructuredSessionSummary[];
};

export type UnbindSpaceResult = {
  space: RelationshipSpace;
};

export type SpaceMemberDetail = {
  id: string;
  role: Exclude<SpaceRole, null>;
  status: string;
  participant_id: string | null;
  user_id: string | null;
  joined_at: string | null;
  left_at: string | null;
  last_seen_at: string | null;
};

export type SpaceManagementResult = {
  space: RelationshipSpace;
  members: SpaceMemberDetail[];
  explorationCount: number;
  latestExploration: ExplorationSession | null;
};

export type SpaceDiscoveryItem = {
  id: string;
  session_id: string;
  space_id: string | null;
  exploration_id: string | null;
  source_type: string;
  source_id: string | null;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
};

export type SpaceSummaryItem = {
  id: string;
  session_id: string;
  space_id: string | null;
  exploration_id: string | null;
  summary_text: string;
  highlights: unknown;
  suggestions: unknown;
  generated_from: unknown;
  created_at: string;
};

export type SpaceLibraryResult = {
  discoveries: SpaceDiscoveryItem[];
  summaries: SpaceSummaryItem[];
};

export type CreateSpacePayload = {
  sharedState: RelationshipSharedState;
  userId?: string;
};

export type MyPersistentSpaceResult = {
  space: RelationshipSpace | null;
  exploration?: ExplorationSession | null;
  session?: RelationshipSession | null;
  role?: Exclude<SpaceRole, null>;
};
