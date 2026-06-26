import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { cleanupExpiredTemporarySpaces } from './spaceCleanup';
import { prisma } from './prisma';

type ApiBody = Record<string, unknown>;
type SpaceType = 'temporary' | 'persistent';
type SpaceRole = 'owner' | 'partner';

type AuthUser = { id: string; email?: string };

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {} as ApiBody;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as ApiBody;
}

function readBearerToken(request: IncomingMessage) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
}

async function readAuthUser(request: IncomingMessage): Promise<AuthUser | null> {
  const token = readBearerToken(request);
  if (!token || !isSupabaseAuthConfigured) return null;
  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey as string,
        authorization: `Bearer ${token}`,
      },
    });
    if (!authResponse.ok) return null;
    const user = await authResponse.json() as AuthUser;
    return user?.id ? user : null;
  } catch (error) {
    console.error('Supabase auth validation failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

function resolveUserId(authUser: AuthUser | null, bodyUserId: string | undefined) {
  if (authUser?.id) return authUser.id;
  if (!isSupabaseAuthConfigured && bodyUserId) return bodyUserId;
  return undefined;
}

function requireUserId(authUser: AuthUser | null, bodyUserId: string | undefined) {
  const userId = resolveUserId(authUser, bodyUserId);
  if (!userId) throw new Error('Authentication required');
  return userId;
}

// 校验临时空间成员身份：participantId 必须匹配空间中的活跃成员
async function assertTemporarySpaceMember(spaceId: string, participantId: string | undefined) {
  if (!participantId) throw new Error('Participant ID is required for temporary spaces');
  const member = await prisma.relationshipSpaceMember.findFirst({
    where: { spaceId, participantId, status: 'active' },
    select: { id: true },
  });
  if (!member) throw new Error('You are not a member of this space');
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

function createInviteCode() {
  return randomUUID().slice(0, 8).toUpperCase();
}

function createLegacySessionId() {
  return randomUUID().slice(0, 8).toUpperCase();
}

function readSharedValue(sharedState: unknown, key: string) {
  if (!sharedState || typeof sharedState !== 'object' || !(key in sharedState)) return null;
  const value = (sharedState as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeLegacySession(session: {
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

function normalizeSpace(space: {
  id: string;
  type: string;
  status: string;
  inviteCode: string;
  name: string | null;
  createdByUserId: string | null;
  createdByParticipantId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: space.id,
    type: space.type,
    status: space.status,
    invite_code: space.inviteCode,
    name: space.name,
    created_by_user_id: space.createdByUserId,
    created_by_participant_id: space.createdByParticipantId,
    expires_at: space.expiresAt?.toISOString() ?? null,
    created_at: space.createdAt.toISOString(),
    updated_at: space.updatedAt.toISOString(),
  };
}

function normalizeExploration(exploration: {
  id: string;
  spaceId: string;
  legacySessionId: string | null;
  mode: string;
  status: string;
  relationshipStage: string | null;
  goal: string | null;
  currentStep: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: exploration.id,
    space_id: exploration.spaceId,
    legacy_session_id: exploration.legacySessionId,
    mode: exploration.mode,
    status: exploration.status,
    relationship_stage: exploration.relationshipStage,
    goal: exploration.goal,
    current_step: exploration.currentStep,
    created_at: exploration.createdAt.toISOString(),
    updated_at: exploration.updatedAt.toISOString(),
  };
}

async function assertCanUsePersistentSpace(userId: string) {
  const existing = await prisma.relationshipSpaceMember.findFirst({
    where: {
      userId,
      spaceType: 'persistent',
      status: 'active',
    },
  });
  if (existing) throw new Error('This user already has an active persistent relationship space');
}

async function assertCanReadSpace(spaceId: string, authUser: AuthUser | null) {
  const space = await prisma.relationshipSpace.findUnique({
    where: { id: spaceId },
    include: { members: { where: { status: 'active' } } },
  });
  if (!space) throw new Error('Space not found');
  if (space.type === 'persistent' && isSupabaseAuthConfigured) {
    const userId = requireUserId(authUser, undefined);
    if (!space.members.some((member) => member.userId === userId)) throw new Error('Only active space members can access this space');
  }
  return space;
}

async function createSpaceWithExploration(params: {
  type: SpaceType;
  role: SpaceRole;
  participantId?: string;
  userId?: string;
  sharedState: unknown;
}) {
  if (params.type === 'persistent' && !params.userId) throw new Error('Persistent spaces require a userId');
  if (params.type === 'temporary' && !params.participantId) throw new Error('Temporary spaces require a participantId');
  if (params.type === 'persistent' && params.userId) await assertCanUsePersistentSpace(params.userId);

  const inviteCode = createInviteCode();
  const legacySessionId = inviteCode;
  const relationshipStage = readSharedValue(params.sharedState, 'relationshipStage');
  const goal = readSharedValue(params.sharedState, 'goal');
  const expiresAt = params.type === 'temporary' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

  return prisma.$transaction(async (transaction) => {
    const space = await transaction.relationshipSpace.create({
      data: {
        type: params.type,
        status: 'waiting',
        inviteCode,
        name: params.type === 'temporary' ? '临时探索空间' : '专属关系空间',
        createdByUserId: params.userId,
        createdByParticipantId: params.participantId,
        expiresAt,
      },
    });

    const legacySession = await transaction.session.create({
      data: {
        id: legacySessionId,
        hostId: params.participantId ?? params.userId ?? '',
        status: 'waiting',
        relationshipStage,
        goal,
        state: {
          create: {
            sharedState: params.sharedState ?? {},
          },
        },
      },
    });

    const exploration = await transaction.explorationSession.create({
      data: {
        spaceId: space.id,
        legacySessionId: legacySession.id,
        mode: params.type,
        status: 'draft',
        relationshipStage,
        goal,
        currentStep: 'home',
        state: {
          create: {
            sharedState: params.sharedState ?? {},
          },
        },
      },
    });

    await transaction.relationshipSpaceMember.create({
      data: {
        spaceId: space.id,
        spaceType: params.type,
        userId: params.userId,
        participantId: params.participantId,
        role: params.role,
        status: 'active',
      },
    });

    return { space, exploration, legacySession };
  }, { maxWait: 10000, timeout: 20000 });
}

export async function handleSpaceApi(request: IncomingMessage, response: ServerResponse) {
  if (!request.url?.startsWith('/api/spaces')) return false;

  try {
    const body = request.method === 'GET' ? {} : await readBody(request);
    const authUser = await readAuthUser(request);

    if (request.method === 'POST' && request.url === '/api/spaces/cleanup-expired') {
      const result = await cleanupExpiredTemporarySpaces();
      sendJson(response, 200, result);
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/create-temporary') {
      const participantId = String(body.participantId ?? '');
      const sharedState = body.sharedState ?? {};
      const { space, exploration, legacySession } = await createSpaceWithExploration({ type: 'temporary', role: 'owner', participantId, sharedState });
      sendJson(response, 200, { space: normalizeSpace(space), exploration: normalizeExploration(exploration), session: normalizeLegacySession(legacySession), role: 'owner' });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/upgrade-temporary') {
      const spaceId = String(body.spaceId ?? '');
      const participantId = String(body.participantId ?? '') || undefined;
      const userId = requireUserId(authUser, String(body.userId ?? '') || undefined);
      await assertCanUsePersistentSpace(userId);
      const space = await prisma.relationshipSpace.findUnique({
        where: { id: spaceId },
        include: { explorations: { orderBy: { createdAt: 'desc' }, take: 1 }, members: { where: { status: 'active' } } },
      });
      if (!space) throw new Error('Space not found');
      if (space.type !== 'temporary') throw new Error('Only temporary spaces can be upgraded');
      if (space.expiresAt && space.expiresAt.getTime() < Date.now()) throw new Error('This temporary space has expired');
      if (!space.members.some((member) => member.participantId === participantId)) throw new Error('Only active temporary space members can upgrade this space');

      const result = await prisma.$transaction(async (transaction) => {
        const upgradedSpace = await transaction.relationshipSpace.update({
          where: { id: space.id },
          data: { type: 'persistent', status: 'active', createdByUserId: userId, expiresAt: null, name: '专属关系空间' },
        });
        await transaction.relationshipSpaceMember.updateMany({
          where: { spaceId: space.id, participantId, status: 'active' },
          data: { userId, spaceType: 'persistent', role: 'owner', lastSeenAt: new Date() },
        });
        await transaction.explorationSession.updateMany({
          where: { spaceId: space.id },
          data: { mode: 'persistent' },
        });
        const exploration = await transaction.explorationSession.findFirst({ where: { spaceId: space.id }, orderBy: { createdAt: 'desc' } });
        const legacySession = exploration?.legacySessionId ? await transaction.session.findUnique({ where: { id: exploration.legacySessionId } }) : null;
        return { upgradedSpace, exploration, legacySession };
      }, { maxWait: 10000, timeout: 20000 });

      if (!result.exploration || !result.legacySession) throw new Error('Upgraded space has no active exploration');
      sendJson(response, 200, { space: normalizeSpace(result.upgradedSpace), exploration: normalizeExploration(result.exploration), session: normalizeLegacySession(result.legacySession), role: 'owner' });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/create-persistent') {
      const userId = requireUserId(authUser, String(body.userId ?? '') || undefined);
      const participantId = String(body.participantId ?? '') || undefined;
      const sharedState = body.sharedState ?? {};
      const { space, exploration, legacySession } = await createSpaceWithExploration({ type: 'persistent', role: 'owner', userId, participantId, sharedState });
      sendJson(response, 200, { space: normalizeSpace(space), exploration: normalizeExploration(exploration), session: normalizeLegacySession(legacySession), role: 'owner' });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/join') {
      const inviteCode = String(body.inviteCode ?? '').trim().toUpperCase();
      const participantId = String(body.participantId ?? '') || undefined;
      let userId = resolveUserId(authUser, String(body.userId ?? '') || undefined);
      const space = await prisma.relationshipSpace.findUnique({
        where: { inviteCode },
        include: { explorations: { orderBy: { createdAt: 'desc' }, take: 1 }, members: { where: { status: 'active' } } },
      });

      if (!space) throw new Error('Space not found');
      if (space.type === 'persistent') userId = requireUserId(authUser, String(body.userId ?? '') || undefined);
      if (space.type === 'persistent' && userId) await assertCanUsePersistentSpace(userId);
      if (space.members.length >= 2 && !space.members.some((member) => member.userId === userId || member.participantId === participantId)) throw new Error('This space already has two active members');
      if (space.expiresAt && space.expiresAt.getTime() < Date.now()) throw new Error('This temporary space has expired');

      const exploration = space.explorations[0];
      if (!exploration?.legacySessionId) throw new Error('Space has no active exploration');

      const result = await prisma.$transaction(async (transaction) => {
        const member = await transaction.relationshipSpaceMember.upsert({
          where: participantId ? { spaceId_participantId: { spaceId: space.id, participantId } } : { spaceId_userId: { spaceId: space.id, userId: userId ?? '' } },
          update: { status: 'active', lastSeenAt: new Date() },
          create: {
            spaceId: space.id,
            spaceType: space.type,
            userId,
            participantId,
            role: 'partner',
            status: 'active',
          },
        });

        const updatedSpace = await transaction.relationshipSpace.update({ where: { id: space.id }, data: { status: 'active' } });
        const updatedLegacySession = await transaction.session.update({ where: { id: exploration.legacySessionId ?? '' }, data: { partnerId: participantId ?? userId ?? '', status: 'active' } });
        const updatedExploration = await transaction.explorationSession.update({ where: { id: exploration.id }, data: { status: 'active' } });
        return { member, updatedSpace, updatedLegacySession, updatedExploration };
      }, { maxWait: 10000, timeout: 20000 });

      sendJson(response, 200, { space: normalizeSpace(result.updatedSpace), exploration: normalizeExploration(result.updatedExploration), session: normalizeLegacySession(result.updatedLegacySession), role: result.member.role });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/explorations/create') {
      const spaceId = String(body.spaceId ?? '');
      const participantId = String(body.participantId ?? '') || undefined;
      const userId = requireUserId(authUser, String(body.userId ?? '') || undefined);
      const sharedState = body.sharedState ?? {};
      const space = await prisma.relationshipSpace.findUnique({
        where: { id: spaceId },
        include: { members: { where: { status: 'active' } } },
      });
      if (!space) throw new Error('Space not found');
      if (space.type !== 'persistent') throw new Error('Only persistent spaces can create multiple explorations');
      if (!space.members.some((member) => member.userId === userId || member.participantId === participantId)) throw new Error('Only active space members can create explorations');

      const legacySessionId = createLegacySessionId();
      const relationshipStage = readSharedValue(sharedState, 'relationshipStage');
      const goal = readSharedValue(sharedState, 'goal');
      const result = await prisma.$transaction(async (transaction) => {
        const legacySession = await transaction.session.create({
          data: {
            id: legacySessionId,
            hostId: participantId ?? userId ?? '',
            partnerId: space.members.find((member) => member.participantId !== participantId && member.userId !== userId)?.participantId ?? null,
            status: 'active',
            relationshipStage,
            goal,
            state: { create: { sharedState } },
          },
        });
        const exploration = await transaction.explorationSession.create({
          data: {
            spaceId: space.id,
            legacySessionId: legacySession.id,
            mode: 'persistent',
            status: 'active',
            relationshipStage,
            goal,
            currentStep: 'home',
            state: { create: { sharedState } },
          },
        });
        return { legacySession, exploration };
      }, { maxWait: 10000, timeout: 20000 });

      sendJson(response, 200, { space: normalizeSpace(space), exploration: normalizeExploration(result.exploration), session: normalizeLegacySession(result.legacySession), role: 'owner' });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/spaces/by-invite/')) {
      const inviteCode = decodeURIComponent(request.url.replace('/api/spaces/by-invite/', '')).trim().toUpperCase();
      const space = await prisma.relationshipSpace.findUnique({
        where: { inviteCode },
        include: { explorations: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      sendJson(response, 200, { space: space ? normalizeSpace(space) : null, exploration: space?.explorations[0] ? normalizeExploration(space.explorations[0]) : null });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/spaces/library/')) {
      const spaceId = decodeURIComponent(request.url.replace('/api/spaces/library/', ''));
      await assertCanReadSpace(spaceId, authUser);
      const [discoveries, summaries] = await Promise.all([
        prisma.discovery.findMany({ where: { spaceId }, orderBy: { createdAt: 'desc' }, take: 100 }),
        prisma.sessionSummary.findMany({ where: { spaceId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      ]);
      sendJson(response, 200, {
        discoveries: discoveries.map((item) => ({
          id: item.id,
          session_id: item.sessionId,
          space_id: item.spaceId,
          exploration_id: item.explorationId,
          source_type: item.sourceType,
          source_id: item.sourceId,
          title: item.title,
          content: item.content,
          tags: item.tags,
          created_at: item.createdAt.toISOString(),
        })),
        summaries: summaries.map((item) => ({
          id: item.id,
          session_id: item.sessionId,
          space_id: item.spaceId,
          exploration_id: item.explorationId,
          summary_text: item.summaryText,
          highlights: item.highlights,
          suggestions: item.suggestions,
          generated_from: item.generatedFrom,
          created_at: item.createdAt.toISOString(),
        })),
      });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/spaces/manage/')) {
      const spaceId = decodeURIComponent(request.url.replace('/api/spaces/manage/', ''));
      const [space, explorationCount, latestExploration] = await Promise.all([
        prisma.relationshipSpace.findUnique({
          where: { id: spaceId },
          include: { members: { orderBy: { joinedAt: 'asc' } } },
        }),
        prisma.explorationSession.count({ where: { spaceId } }),
        prisma.explorationSession.findFirst({ where: { spaceId }, orderBy: { createdAt: 'desc' } }),
      ]);
      if (!space) throw new Error('Space not found');
      const authUserId = resolveUserId(authUser, undefined);
      if (space.type === 'persistent' && isSupabaseAuthConfigured && !space.members.some((member) => member.userId === authUserId && member.status === 'active')) {
        throw new Error('Only active space members can manage this space');
      }
      sendJson(response, 200, {
        space: normalizeSpace(space),
        members: space.members.map((member) => ({
          id: member.id,
          role: member.role,
          status: member.status,
          participant_id: member.participantId,
          user_id: member.userId,
          joined_at: member.joinedAt?.toISOString() ?? null,
          left_at: member.leftAt?.toISOString() ?? null,
          last_seen_at: member.lastSeenAt?.toISOString() ?? null,
        })),
        explorationCount,
        latestExploration: latestExploration ? normalizeExploration(latestExploration) : null,
      });
      return true;
    }

    if (request.method === 'GET' && request.url === '/api/spaces/explorations/state') {
      sendJson(response, 400, { error: 'Exploration ID is required' });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/spaces/explorations/state/')) {
      const explorationId = decodeURIComponent(request.url.replace('/api/spaces/explorations/state/', ''));
      const exploration = await prisma.explorationSession.findUnique({ where: { id: explorationId } });
      if (!exploration) {
        sendJson(response, 404, { error: 'Exploration not found' });
        return true;
      }
      await assertCanReadSpace(exploration.spaceId, authUser);
      const state = await prisma.explorationState.findUnique({ where: { explorationId } });
      sendJson(response, 200, { sharedState: state?.sharedState ?? null });
      return true;
    }

    if (request.method === 'GET' && request.url === '/api/spaces/explorations/detail') {
      sendJson(response, 400, { error: 'Exploration ID is required' });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/spaces/explorations/detail/')) {
      const explorationId = decodeURIComponent(request.url.replace('/api/spaces/explorations/detail/', ''));
      const [exploration, abInteractions, summaries] = await Promise.all([
        prisma.explorationSession.findUnique({ where: { id: explorationId } }),
        prisma.abInteraction.findMany({ where: { explorationId }, orderBy: { createdAt: 'asc' } }),
        prisma.sessionSummary.findMany({ where: { explorationId }, orderBy: { createdAt: 'desc' } }),
      ]);
      if (!exploration) {
        sendJson(response, 404, { error: 'Exploration not found' });
        return true;
      }
      await assertCanReadSpace(exploration.spaceId, authUser);
      sendJson(response, 200, {
        exploration: exploration ? normalizeExploration(exploration) : null,
        abInteractions: abInteractions.map((item) => ({
          id: item.id,
          question_id: item.questionId,
          question_text: item.questionText,
          host_answer: item.hostAnswer,
          partner_answer: item.partnerAnswer,
          result: item.result,
          created_at: item.createdAt.toISOString(),
          completed_at: item.completedAt?.toISOString() ?? null,
        })),
        summaries: summaries.map((item) => ({
          id: item.id,
          summary_text: item.summaryText,
          highlights: item.highlights,
          suggestions: item.suggestions,
          generated_from: item.generatedFrom,
          created_at: item.createdAt.toISOString(),
        })),
      });
      return true;
    }

    if (request.method === 'GET' && request.url.startsWith('/api/spaces/explorations/')) {
      const rawPath = request.url.replace('/api/spaces/explorations/', '');
      const [spaceIdPart, queryPart] = rawPath.split('?');
      const spaceId = decodeURIComponent(spaceIdPart);
      await assertCanReadSpace(spaceId, authUser);
      const params = new URLSearchParams(queryPart ?? '');
      const page = Math.max(1, Number(params.get('page') ?? '1'));
      const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize') ?? '20')));
      const [explorations, total] = await Promise.all([
        prisma.explorationSession.findMany({
          where: { spaceId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.explorationSession.count({ where: { spaceId } }),
      ]);
      sendJson(response, 200, {
        explorations: explorations.map(normalizeExploration),
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/heartbeat') {
      const spaceId = String(body.spaceId ?? '');
      const userId = resolveUserId(authUser, String(body.userId ?? '') || undefined);
      const participantId = String(body.participantId ?? '') || undefined;
      // 重新激活成员（包括 left 状态，支持页面刷新后恢复在线状态）
      const updated = await prisma.relationshipSpaceMember.updateMany({
        where: {
          spaceId,
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(participantId ? [{ participantId }] : []),
          ],
        },
        data: { status: 'active', lastSeenAt: new Date() },
      });
      if (updated.count === 0) throw new Error('Only space members can update presence');
      sendJson(response, 200, { ok: true });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/unbind') {
      const spaceId = String(body.spaceId ?? '');
      const userId = requireUserId(authUser, String(body.userId ?? '') || undefined);
      const participantId = String(body.participantId ?? '') || undefined;
      const space = await prisma.relationshipSpace.findUnique({
        where: { id: spaceId },
        include: { members: { where: { status: 'active' } } },
      });
      if (!space) throw new Error('Space not found');
      if (space.type !== 'persistent') throw new Error('Only persistent spaces can be unbound');
      if (!space.members.some((member) => member.userId === userId || member.participantId === participantId)) throw new Error('Only active space members can unbind this space');

      const updatedSpace = await prisma.$transaction(async (transaction) => {
        await transaction.relationshipSpaceMember.updateMany({
          where: { spaceId: space.id, status: 'active' },
          data: { status: 'left', leftAt: new Date() },
        });
        await transaction.explorationSession.updateMany({
          where: { spaceId: space.id, status: { in: ['draft', 'active'] } },
          data: { status: 'abandoned', completedAt: new Date() },
        });
        return transaction.relationshipSpace.update({ where: { id: space.id }, data: { status: 'unbound' } });
      }, { maxWait: 10000, timeout: 20000 });

      sendJson(response, 200, { space: normalizeSpace(updatedSpace) });
      return true;
    }

    if (request.method === 'POST' && request.url === '/api/spaces/leave') {
      const spaceId = String(body.spaceId ?? '');
      const userId = resolveUserId(authUser, String(body.userId ?? '') || undefined);
      const participantId = String(body.participantId ?? '') || undefined;
      const space = await prisma.relationshipSpace.findUnique({
        where: { id: spaceId },
        include: { members: { where: { status: 'active' } }, explorations: { select: { id: true, legacySessionId: true } } },
      });
      if (!space) throw new Error('Space not found');
      const leavingMember = space.members.find((member) => member.userId === userId || member.participantId === participantId);
      if (!leavingMember) throw new Error('Only active space members can leave this space');

      const remainingActive = space.members.length - 1;

      await prisma.$transaction(async (transaction) => {
        // 仅标记离开的成员为 left，不影响其他成员
        await transaction.relationshipSpaceMember.update({
          where: { id: leavingMember.id },
          data: { status: 'left', leftAt: new Date() },
        });

        if (remainingActive <= 0) {
          // 所有成员都已离开
          if (space.type === 'temporary') {
            // 临时空间：直接销毁所有数据库记录
            // 先收集 legacy session IDs（RelationshipSpace 删除后 ExplorationSession 也会被级联删除，legacySessionId 会变 null）
            const legacySessionIds = space.explorations
              .map((e) => e.legacySessionId)
              .filter((id): id is string => Boolean(id));

            // 删除 RelationshipSpace（级联删除 members, explorations, exploration states, abInteractions, presentMoments, mapStates, discoveries, summaries）
            await transaction.relationshipSpace.delete({ where: { id: space.id } });

            // 手动删除 legacy Session 记录（Session 表不会被 RelationshipSpace 级联删除）
            // Session 删除后会级联删除 SessionState, SessionParticipant, SessionFlowProgress 等
            if (legacySessionIds.length > 0) {
              await transaction.session.deleteMany({ where: { id: { in: legacySessionIds } } });
            }
          } else {
            // 专属空间：标记为 archived（保留历史记录）
            await transaction.relationshipSpace.update({ where: { id: space.id }, data: { status: 'archived' } });
            await transaction.explorationSession.updateMany({
              where: { spaceId: space.id, status: { in: ['draft', 'active'] } },
              data: { status: 'abandoned', completedAt: new Date() },
            });
          }
        } else {
          // 还有成员在场，空间回到 waiting 状态（等待新成员加入）
          await transaction.relationshipSpace.update({ where: { id: space.id }, data: { status: 'waiting' } });
        }
      }, { maxWait: 10000, timeout: 20000 });

      sendJson(response, 200, { ok: true });
      return true;
    }

    sendJson(response, 404, { error: 'Unknown space API route' });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Space API error';
    console.error('[spaceApi] request failed:', request.method, request.url, message);
    if (message.includes('Authentication required')) {
      sendJson(response, 401, { error: message });
    } else if (message.includes('Space not found') || message.includes('Exploration not found')) {
      sendJson(response, 404, { error: message });
    } else if (message.includes('Only active space members') || message.includes('You are not a member')) {
      sendJson(response, 403, { error: message });
    } else {
      sendJson(response, 500, { error: message });
    }
    return true;
  }
}
