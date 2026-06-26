import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prisma } from './prisma';

type ApiBody = Record<string, unknown>;

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {} as ApiBody;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as ApiBody;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

function normalizeSession(session: {
  id: string;
  status: string;
  hostId: string;
  partnerId: string | null;
  createdAt: Date;
  relationshipStage: string | null;
  goal: string | null;
}) {
  return {
    id: session.id,
    status: session.status,
    host_id: session.hostId,
    partner_id: session.partnerId,
    created_at: session.createdAt.toISOString(),
    relationship_stage: session.relationshipStage,
    goal: session.goal,
  };
}

function getSharedRecord(sharedState: unknown) {
  return sharedState && typeof sharedState === 'object' ? sharedState as Record<string, unknown> : null;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function createSessionId() {
  return randomUUID().slice(0, 8).toUpperCase();
}

async function persistStructuredState(params: { sessionId: string; sharedState: unknown }) {
  const exploration = await prisma.explorationSession.findUnique({ where: { legacySessionId: params.sessionId } });
  if (!exploration) return;

  const shared = getSharedRecord(params.sharedState);
  if (!shared) return;

  const spaceId = exploration.spaceId;
  const explorationId = exploration.id;
  const history = asArray(shared.journeyHistory);
  const currentQuestion = asRecord(shared.currentQuestion);
  const abAnswers = asRecord(shared.abAnswers);
  const summary = asRecord(shared.summary);

  // 预构建批量插入数据，避免在事务中串行 await
  const abInteractionData: Prisma.AbInteractionCreateManyInput[] = [];

  for (const [index, item] of history.entries()) {
    const historyItem = asRecord(item);
    const question = asRecord(historyItem?.question);
    const answers = asRecord(historyItem?.answers);
    if (!question || !answers) continue;
    const completedAt = historyItem?.completedAt ? new Date(asString(historyItem.completedAt)) : null;
    abInteractionData.push({
      sessionId: params.sessionId,
      spaceId,
      explorationId,
      questionId: asString(question.id) || `history-${index}`,
      questionText: asString(question.question) || asString(question.title) || 'Relationship question',
      hostAnswer: asString(answers.answerA) || null,
      partnerAnswer: asString(answers.answerB) || null,
      hostAnsweredAt: completedAt,
      partnerAnsweredAt: completedAt,
      result: toJsonValue(answers),
      completedAt,
    });
  }

  if (currentQuestion && abAnswers && (asString(abAnswers.answerA) || asString(abAnswers.answerB))) {
    abInteractionData.push({
      sessionId: params.sessionId,
      spaceId,
      explorationId,
      questionId: asString(currentQuestion.id) || 'current',
      questionText: asString(currentQuestion.question) || asString(currentQuestion.title) || 'Relationship question',
      hostAnswer: asString(abAnswers.answerA) || null,
      partnerAnswer: asString(abAnswers.answerB) || null,
      hostAnsweredAt: null,
      partnerAnsweredAt: null,
      result: toJsonValue(abAnswers),
      completedAt: abAnswers.revealVisible ? new Date() : null,
    });
  }

  const hasSummary = summary && (asString(summary.resonance) || asArray(summary.discoveries).length > 0 || asArray(summary.events).length > 0);

  await prisma.$transaction(async (transaction) => {
    // 删除旧记录
    await transaction.abInteraction.deleteMany({ where: { explorationId } });
    await transaction.sessionSummary.deleteMany({ where: { explorationId } });

    // 批量插入 AB 互动记录（替代串行 create）
    if (abInteractionData.length > 0) {
      await transaction.abInteraction.createMany({ data: abInteractionData });
    }

    if (hasSummary) {
      await transaction.sessionSummary.create({
        data: {
          sessionId: params.sessionId,
          spaceId,
          explorationId,
          summaryText: asString(summary.resonance) || 'Relationship exploration summary',
          highlights: toJsonValue(asArray(summary.discoveries)),
          suggestions: toJsonValue(asArray(summary.worldChanges)),
          generatedFrom: toJsonValue(summary),
        },
      });
    }
  }, { maxWait: 10000, timeout: 20000 });
}

export async function handleSessionApi(request: IncomingMessage, response: ServerResponse) {
  if (!request.url?.startsWith('/api/session')) return false;

  try {
    const body = request.method === 'GET' ? {} : await readBody(request);

    if (request.method === 'POST' && request.url === '/api/session/create') {
      const id = String(body.id ?? '').trim().toUpperCase() || createSessionId();
      const hostId = String(body.hostId ?? '');
      const sharedState = body.sharedState ?? {};
      const session = await prisma.session.create({
        data: {
          id,
          hostId,
          status: 'waiting',
          relationshipStage: typeof sharedState === 'object' && sharedState && 'relationshipStage' in sharedState ? String(sharedState.relationshipStage ?? '') || null : null,
          goal: typeof sharedState === 'object' && sharedState && 'goal' in sharedState ? String(sharedState.goal ?? '') || null : null,
          state: {
            create: {
              sharedState,
            },
          },
        },
      });
      sendJson(response, 200, { session: normalizeSession(session) });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/session/join') {
      const id = String(body.sessionId ?? '').trim().toUpperCase();
      const partnerId = String(body.partnerId ?? '');
      const session = await prisma.session.update({
        where: { id },
        data: { partnerId, status: 'active' },
      });
      sendJson(response, 200, { session: normalizeSession(session) });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/session/state/')) {
      const sessionId = decodeURIComponent(request.url.replace('/api/session/state/', ''));
      const state = await prisma.sessionState.findUnique({ where: { sessionId } });
      sendJson(response, 200, { sharedState: state?.sharedState ?? null });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/session/state') {
      const sessionId = String(body.sessionId ?? '');
      const sharedState = body.sharedState ?? {};
      const relationshipStage = typeof sharedState === 'object' && sharedState && 'relationshipStage' in sharedState ? String(sharedState.relationshipStage ?? '') || null : null;
      const goal = typeof sharedState === 'object' && sharedState && 'goal' in sharedState ? String(sharedState.goal ?? '') || null : null;

      await prisma.sessionState.upsert({
        where: { sessionId },
        update: { sharedState, updatedAt: new Date() },
        create: { sessionId, sharedState },
      });
      const exploration = await prisma.explorationSession.findUnique({ where: { legacySessionId: sessionId } });
      if (exploration) {
        await prisma.explorationState.upsert({
          where: { explorationId: exploration.id },
          update: { sharedState, updatedAt: new Date() },
          create: { explorationId: exploration.id, sharedState },
        });
        await prisma.explorationSession.update({
          where: { id: exploration.id },
          data: { relationshipStage, goal, currentStep: typeof sharedState === 'object' && sharedState && 'currentStep' in sharedState ? String(sharedState.currentStep ?? 'home') : 'home' },
        });
      }
      await persistStructuredState({ sessionId, sharedState });
      await prisma.session.update({
        where: { id: sessionId },
        data: { relationshipStage, goal },
      });
      sendJson(response, 200, { ok: true });
      return true;
    }

    sendJson(response, 404, { error: 'Unknown session API route' });
    return true;
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'Session API error' });
    return true;
  }
}
