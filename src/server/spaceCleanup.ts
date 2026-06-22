import { prisma } from './prisma';

const INACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 分钟无活跃视为过期

export async function cleanupExpiredTemporarySpaces(now = new Date()) {
  const inactiveThreshold = new Date(now.getTime() - INACTIVE_THRESHOLD_MS);

  // 1. 按 expiresAt 过期的空间
  const expiredSpaces = await prisma.relationshipSpace.findMany({
    where: {
      type: 'temporary',
      status: { in: ['waiting', 'active'] },
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  // 2. 长时间无活跃的空间：所有 active 成员 lastSeenAt 都超过阈值（或从未有心跳）
  const inactiveSpaces = await prisma.relationshipSpace.findMany({
    where: {
      type: 'temporary',
      status: { in: ['waiting', 'active'] },
    },
    select: {
      id: true,
      createdAt: true,
      members: {
        where: { status: 'active' },
        select: { lastSeenAt: true },
      },
    },
  });

  const inactiveSpaceIds = inactiveSpaces
    .filter((space) => {
      // 没有任何 active 成员时，按创建时间判断是否过期
      if (space.members.length === 0) {
        return space.createdAt <= inactiveThreshold;
      }
      // 所有 active 成员都超过阈值视为无活跃
      return space.members.every((member) => {
        if (!member.lastSeenAt) return true;
        return member.lastSeenAt <= inactiveThreshold;
      });
    })
    .map((space) => space.id);

  const spaceIdsToDelete = [...new Set([...expiredSpaces.map((space) => space.id), ...inactiveSpaceIds])];
  if (spaceIdsToDelete.length === 0) {
    return { deletedSpaces: 0, deletedExplorations: 0, deletedSessions: 0 };
  }

  // 收集需要一并删除的 legacy Session IDs
  const explorations = await prisma.explorationSession.findMany({
    where: { spaceId: { in: spaceIdsToDelete } },
    select: { legacySessionId: true },
  });
  const legacySessionIds = explorations
    .map((exploration) => exploration.legacySessionId)
    .filter((id): id is string => Boolean(id));

  const deletedExplorations = await prisma.explorationSession.count({
    where: { spaceId: { in: spaceIdsToDelete } },
  });

  // 物理删除空间（级联删除 members、exploration states、discoveries、summaries 等）
  await prisma.$transaction(async (transaction) => {
    await transaction.relationshipSpace.deleteMany({ where: { id: { in: spaceIdsToDelete } } });
    if (legacySessionIds.length > 0) {
      await transaction.session.deleteMany({ where: { id: { in: legacySessionIds } } });
    }
  });

  return {
    deletedSpaces: spaceIdsToDelete.length,
    deletedExplorations,
    deletedSessions: legacySessionIds.length,
  };
}
