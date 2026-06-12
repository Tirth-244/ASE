// =============================================================================
// Database Configuration - Prisma Client Singleton
// =============================================================================
// Uses the singleton pattern to prevent multiple PrismaClient instances
// during development hot-reloads and in serverless/container environments.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

// Extend global type to store the Prisma singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton PrismaClient instance.
 * In development, it's cached on `globalThis` to survive hot-reloads.
 * In production, a single instance is created per process.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

// Cache the client in development to avoid reconnection on hot-reload
if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Verify database connectivity at startup.
 * Exits the process if the database is unreachable.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

/**
 * Gracefully disconnect the Prisma client.
 * Called during shutdown to clean up connection pool.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
