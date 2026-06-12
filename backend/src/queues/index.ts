// =============================================================================
// Queue Definitions
// =============================================================================
// Defines all BullMQ queues used in the application.
// Each queue handles a specific type of background processing job.
// =============================================================================

import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

/** Queue for video analysis jobs (scene detection, transcription, etc.) */
export const analysisQueue = new Queue('analysis', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/** Queue for clip generation jobs (FFmpeg processing) */
export const clipQueue = new Queue('clips', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/** Queue for export rendering jobs (final MP4 output) */
export const exportQueue = new Queue('exports', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Gracefully close all queues during shutdown.
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    analysisQueue.close(),
    clipQueue.close(),
    exportQueue.close(),
  ]);
  logger.info('All queues closed');
}

logger.info('✅ BullMQ queues initialized: analysis, clips, exports');
