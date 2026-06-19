import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

const originalSupabaseUrl = process.env.VITE_SUPABASE_URL;
const originalSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
delete process.env.VITE_SUPABASE_URL;
delete process.env.VITE_SUPABASE_ANON_KEY;

const { handleSessionApi } = await import('../src/server/sessionApi');
const { handleSpaceApi } = await import('../src/server/spaceApi');
const { prisma } = await import('../src/server/prisma');

type Handler = typeof handleSpaceApi;

class MockResponse extends EventEmitter {
  statusCode = 200;
  headers: Record<string, unknown> = {};
  body = '';
  setHeader(key: string, value: unknown) {
    this.headers[key] = value;
  }
  end(value = '') {
    this.body += value;
    this.emit('finish');
  }
}

function mockRequest(method: string, url: string, body?: unknown) {
  const request = method === 'GET' ? Readable.from([]) : Readable.from([JSON.stringify(body ?? {})]);
  Object.assign(request, { method, url, headers: {} });
  return request;
}

async function call(handler: Handler, method: string, url: string, body?: unknown) {
  const response = new MockResponse();
  await handler(mockRequest(method, url, body), response as never);
  const parsed = response.body ? JSON.parse(response.body) : null;
  if (response.statusCode >= 400) throw new Error(`${method} ${url} failed: ${response.body}`);
  return parsed;
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const sharedState = {
  currentStep: 'summary',
  relationshipStage: 'stable',
  goal: 'space smoke',
  journeyHistory: [{
    question: { id: 'q1', question: 'A?' },
    answers: { answerA: 'a', answerB: 'b' },
    completedAt: new Date().toISOString(),
  }],
  currentQuestion: { id: 'q2', question: 'B?' },
  abAnswers: { answerA: 'aa', answerB: 'bb', revealVisible: true },
  mirrorEvent: { completed: true, decision: 'tap', memorySeed: 'seed' },
  currentEvent: { id: 'e1', title: 'Mirror', prompt: 'p' },
  events: [{ id: 'e1', title: 'Mirror', prompt: 'p' }],
  summary: { resonance: 'summary', discoveries: ['d1'], worldChanges: ['w1'], events: ['e1'] },
};

try {
  const userId = randomUUID();
  const participantId = randomUUID();
  const created = await call(handleSpaceApi, 'POST', '/api/spaces/create-persistent', { userId, participantId, sharedState });
  assert(created.space.id, 'persistent space should be created');
  assert(created.exploration.id, 'exploration should be created');

  await call(handleSessionApi, 'POST', '/api/session/state', { sessionId: created.session.id, sharedState });
  const detail = await call(handleSpaceApi, 'GET', `/api/spaces/explorations/detail/${created.exploration.id}`);
  assert(detail.abInteractions.length >= 2, 'AB interactions should be persisted');
  assert(detail.mirrorEvents.length >= 1, 'mirror events should be persisted');
  assert(detail.summaries.length >= 1, 'summaries should be persisted');

  const list = await call(handleSpaceApi, 'GET', `/api/spaces/explorations/${created.space.id}`);
  assert(list.explorations.length >= 1, 'exploration history should be listed');

  await call(handleSpaceApi, 'POST', '/api/spaces/heartbeat', { spaceId: created.space.id, userId });
  const manage = await call(handleSpaceApi, 'GET', `/api/spaces/manage/${created.space.id}`);
  assert(manage.members.some((member: { user_id: string; last_seen_at: string | null }) => member.user_id === userId && member.last_seen_at), 'heartbeat should update last_seen_at');
  const library = await call(handleSpaceApi, 'GET', `/api/spaces/library/${created.space.id}`);
  assert(library.summaries.length >= 1, 'space library should include summaries');

  const unbound = await call(handleSpaceApi, 'POST', '/api/spaces/unbind', { spaceId: created.space.id, userId, participantId });
  assert(unbound.space.status === 'unbound', 'space should be unbound');

  const temporary = await call(handleSpaceApi, 'POST', '/api/spaces/create-temporary', { participantId: randomUUID(), sharedState });
  assert(temporary.space.type === 'temporary', 'temporary space should be created');
  const upgraded = await call(handleSpaceApi, 'POST', '/api/spaces/upgrade-temporary', { spaceId: temporary.space.id, userId, participantId: temporary.space.created_by_participant_id });
  assert(upgraded.space.type === 'persistent', 'temporary space should be upgraded');

  console.log(JSON.stringify({ ok: true, persistentSpaceId: created.space.id, temporarySpaceId: temporary.space.id, upgradedSpaceId: upgraded.space.id }, null, 2));
} finally {
  if (originalSupabaseUrl) process.env.VITE_SUPABASE_URL = originalSupabaseUrl;
  if (originalSupabaseAnonKey) process.env.VITE_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
  await prisma.$disconnect();
}
