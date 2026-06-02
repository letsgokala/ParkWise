import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Ensure env (and therefore DATABASE_URL) is loaded before the client is built.
void env;

// Reuse a single PrismaClient across hot reloads in development to avoid
// exhausting the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['error', 'warn'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
