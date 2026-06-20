import type { RelationshipSession, RelationshipSharedState } from '../../types/session';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 非安全上下文（如局域网 HTTP 访问）下的回退方案
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createParticipantId() {
  const key = 'relationship-os-participant-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = generateUUID();
  localStorage.setItem(key, id);
  return id;
}

export function createSessionId() {
  return generateUUID().slice(0, 8).toUpperCase();
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function getJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export async function createRelationshipSession(sharedState: RelationshipSharedState) {
  const hostId = createParticipantId();
  const id = createSessionId();
  const { session } = await postJson<{ session: RelationshipSession }>('/api/session/create', { id, hostId, sharedState });
  return session;
}

export async function joinRelationshipSession(sessionId: string) {
  const partnerId = createParticipantId();
  const id = sessionId.trim().toUpperCase();
  const { session } = await postJson<{ session: RelationshipSession }>('/api/session/join', { sessionId: id, partnerId });
  return session;
}

export async function saveRelationshipSharedState(sessionId: string, sharedState: RelationshipSharedState) {
  await postJson<{ ok: true }>('/api/session/state', { sessionId, sharedState });
}

export async function loadRelationshipSharedState(sessionId: string) {
  const { sharedState } = await getJson<{ sharedState: RelationshipSharedState | null }>(`/api/session/state/${encodeURIComponent(sessionId)}`);
  return sharedState;
}
