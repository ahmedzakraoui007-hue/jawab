import { PrismaClient } from '@prisma/client';

// Standard Prisma-in-dev-with-hot-reload singleton pattern — without it,
// tsx watch's restarts would each create a new PrismaClient and exhaust
// the Postgres connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
