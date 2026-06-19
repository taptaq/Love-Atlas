import { prisma } from './prisma';

export async function cleanupExpiredTemporarySpaces(now = new Date()) {
  const expiredSpaces = await prisma.relationshipSpace.findMany({
    where: {
      type: 'temporary',
      status: { in: ['waiting', 'active'] },
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  const spaceIds = expiredSpaces.map((space) => space.id);
  if (spaceIds.length === 0) return { expiredSpaces: 0, expiredExplorations: 0, expiredMembers: 0 };

  const [explorations, members] = await prisma.$transaction([
    prisma.explorationSession.updateMany({
      where: { spaceId: { in: spaceIds }, status: { in: ['draft', 'active'] } },
      data: { status: 'expired', completedAt: now },
    }),
    prisma.relationshipSpaceMember.updateMany({
      where: { spaceId: { in: spaceIds }, status: 'active' },
      data: { status: 'left', leftAt: now },
    }),
    prisma.relationshipSpace.updateMany({
      where: { id: { in: spaceIds } },
      data: { status: 'expired' },
    }),
  ]);

  return {
    expiredSpaces: spaceIds.length,
    expiredExplorations: explorations.count,
    expiredMembers: members.count,
  };
}
