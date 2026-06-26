import type { RelationshipSharedState } from '../../types/session';
import type { ExplorationDetailResult, ExplorationListResult, ExplorationStateResult, MyPersistentSpaceResult, SpaceApiResult, SpaceLibraryResult, SpaceManagementResult, UnbindSpaceResult } from '../../types/space';
import { requestAuthPopover } from '../../components/auth/AuthButton';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../auth/useAuthStore';
import { createParticipantId } from '../session/sessionService';

let authFailurePrompted = false;

// 登录成功后重置标记，允许后续再次提示
useAuthStore.subscribe((state) => {
  if (state.user) authFailurePrompted = false;
});

function handleAuthFailure() {
  const { user, signOut } = useAuthStore.getState();
  if (user) {
    void signOut();
  }
  if (user && !authFailurePrompted) {
    authFailurePrompted = true;
    requestAuthPopover();
  }
}

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
  if (response.status === 401) {
    handleAuthFailure();
    throw new Error('登录已过期，请重新登录后再试。');
  }
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<T>;
}

async function getJson<T>(url: string) {
  const response = await fetch(url, { headers: await createHeaders() });
  if (response.status === 401) {
    handleAuthFailure();
    throw new Error('登录已过期，请重新登录后再试。');
  }
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
  } catch {}
  return text || `Request failed with status ${response.status}`;
}

export async function createTemporarySpace(sharedState: RelationshipSharedState) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/create-temporary', { participantId, sharedState });
}

export async function createPersistentSpace(sharedState: RelationshipSharedState, userId: string) {
  const participantId = createParticipantId();
  return postJson<SpaceApiResult>('/api/spaces/create-persistent', { participantId, userId, sharedState });
}

// 查询当前用户已有的活跃专属关系空间，存在则返回，避免重复创建报错
export async function findMyPersistentSpace() {
  return getJson<MyPersistentSpaceResult>('/api/spaces/my-persistent');
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

export async function listSpaceExplorations(spaceId: string, page = 1, pageSize = 20) {
  return getJson<ExplorationListResult>(`/api/spaces/explorations/${encodeURIComponent(spaceId)}?page=${page}&pageSize=${pageSize}`);
}

export async function loadSpaceManagement(spaceId: string) {
  return getJson<SpaceManagementResult>(`/api/spaces/manage/${encodeURIComponent(spaceId)}`);
}

export async function loadSpaceLibrary(spaceId: string) {
  return getJson<SpaceLibraryResult>(`/api/spaces/library/${encodeURIComponent(spaceId)}`);
}

export async function sendSpaceHeartbeat(spaceId: string, userId?: string) {
  const participantId = createParticipantId();
  return postJson<{ ok: boolean }>('/api/spaces/heartbeat', { spaceId, userId, participantId });
}

export async function unbindPersistentSpace(spaceId: string, userId: string) {
  const participantId = createParticipantId();
  return postJson<UnbindSpaceResult>('/api/spaces/unbind', { spaceId, participantId, userId });
}

export async function leaveSpace(spaceId: string, userId?: string) {
  const participantId = createParticipantId();
  return postJson<{ ok: boolean }>('/api/spaces/leave', { spaceId, participantId, userId });
}
