// =============================================================================
// Redis Configuration
// =============================================================================
// Creates and exports a shared IORedis connection used by BullMQ queues,
// caching, and pub/sub for real-time events.
// =============================================================================

import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Shared Redis connection instance.
 * Used by BullMQ workers, queue producers, and SSE event publishing.
 */
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    // Exponential backoff: 50ms, 100ms, 200ms, ..., max 30s
    const delay = Math.min(times * 50, 30000);
    logger.warn(`Redis connection retry #${times}, waiting ${delay}ms`);
    return delay;
  },
});

// Connection event handlers
redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (error: Error) => {
  logger.error('❌ Redis connection error:', error.message);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Creates a new Redis connection for BullMQ subscribers.
 * BullMQ requires separate connections for producers and subscribers.
 */
export function createRedisConnection(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

/**
 * Gracefully close the Redis connection during shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}
