import type { RelationshipSharedState } from '../../types/session';
import type { ExplorationDetailResult, ExplorationListResult, ExplorationStateResult, SpaceApiResult, SpaceLibraryResult, SpaceManagementResult, UnbindSpaceResult } from '../../types/space';
import { supabase } from '../../lib/supabase';
import { createParticipantId } from '../session/sessionService';

async function createHeaders() {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`;
  return headers;
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: await createHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function getJson<T>(url: string) {
  const response = await fetch(url, { headers: await createHeaders() });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export async function createTemporarySpace(sharedState: RelationshipSharedState) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/create-temporary', { participantId, sharedState });
}

export async function createPersistentSpace(sharedState: RelationshipSharedState, userId: string) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/create-persistent', { participantId, userId, sharedState });
}

export async function upgradeTemporarySpace(spaceId: string, userId: string) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/upgrade-temporary', { spaceId, participantId, userId });
}

export async function joinRelationshipSpace(inviteCode: string, userId?: string) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/join', { inviteCode: inviteCode.trim().toUpperCase(), participantId, userId });
}

export async function createPersistentExploration(spaceId: string, sharedState: RelationshipSharedState, userId: string) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/explorations/create', { spaceId, participantId, userId, sharedState });
}

export async function loadExplorationSharedState(explorationId: string) {
  return getJson<ExplorationStateResult>(`/api/spaces/explorations/state/${encodeURIComponent(explorationId)}`);
}

export async function loadExplorationDetail(explorationId: string) {
  return getJson<ExplorationDetailResult>(`/api/spaces/explorations/detail/${encodeURIComponent(explorationId)}`);
}

export async function listSpaceExplorations(spaceId: string) {
  return getJson<ExplorationListResult>(`/api/spaces/explorations/${encodeURIComponent(spaceId)}`);
}

export async function loadSpaceManagement(spaceId: string) {
  return getJson<SpaceManagementResult>(`/api/spaces/manage/${encodeURIComponent(spaceId)}`);
}

export async function loadSpaceLibrary(spaceId: string) {
  return getJson<SpaceLibraryResult>(`/api/spaces/library/${encodeURIComponent(spaceId)}`);
}

export async function sendSpaceHeartbeat(spaceId: string, userId: string) {
  return postJson<{ ok: boolean }>('/api/spaces/heartbeat', { spaceId, userId });
}

export async function unbindPersistentSpace(spaceId: string, userId: string) {
  const participantId = createParticipantId();
  return postJson<UnbindSpaceResult>('/api/spaces/unbind', { spaceId, participantId, userId });
}
