import { cleanupExpiredTemporarySpaces } from '../src/server/spaceCleanup';
import { prisma } from '../src/server/prisma';

try {
  const result = await cleanupExpiredTemporarySpaces();
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
