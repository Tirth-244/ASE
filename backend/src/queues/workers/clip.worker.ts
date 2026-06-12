// =============================================================================
// Clip Worker
// =============================================================================
// BullMQ worker that processes clip generation jobs.
// Applies video effects using FFmpeg: crop, zoom, captions, transitions.
// =============================================================================

import { Worker, Job } from 'bullmq';
import path from 'path';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import {
  extractClip,
  applyVerticalCrop,
  applySlowMotion,
  addCaptions,
  applyZoomEffect,
} from '../../utils/ffmpeg';
import { ensureTempDir, ensureProjectDir } from '../../utils/helpers';

interface ClipJobData {
  clipId: string;
  projectId: string;
  userId: string;
}

/**
 * Processes a clip generation job.
 * Extracts the clip, applies effects, and saves the final file.
 */
async function processClip(job: Job<ClipJobData>): Promise<void> {
  const { clipId, projectId } = job.data;

  logger.info(`[Clip Worker] Processing clip ${clipId}`);

  try {
    // Get clip and project data
    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      include: {
        project: {
          include: {
            analysis: {
              include: { moments: true },
            },
          },
        },
      },
    });

    if (!clip || !clip.project.videoPath) {
      throw new Error(`Clip ${clipId} or video not found`);
    }

    await prisma.clip.update({
      where: { id: clipId },
      data: { status: 'PROCESSING' },
    });

    const tempDir = await ensureTempDir(projectId);
    const projectDir = await ensureProjectDir(projectId);
    const effects = (clip.effects as Record<string, unknown>) || {};

    // Step 1: Extract the raw clip
    await job.updateProgress(10);
    const rawClipPath = path.join(tempDir, `clip_${clipId}_raw.mp4`);
    await extractClip(clip.project.videoPath, rawClipPath, clip.startTime, clip.endTime);

    let currentPath = rawClipPath;

    // Step 2: Apply dynamic vertical crop (9:16)
    if (effects.dynamicCrop) {
      await job.updateProgress(30);
      const croppedPath = path.join(tempDir, `clip_${clipId}_cropped.mp4`);
      await applyVerticalCrop(currentPath, croppedPath);
      currentPath = croppedPath;
    }

    // Step 3: Apply slow motion
    if (effects.slowMotion) {
      await job.updateProgress(50);
      const slowPath = path.join(tempDir, `clip_${clipId}_slow.mp4`);
      const factor = (effects.slowMotionFactor as number) || 0.5;
      await applySlowMotion(currentPath, slowPath, factor);
      currentPath = slowPath;
    }

    // Step 4: Apply auto zoom (Ken Burns effect)
    if (effects.autoZoom) {
      await job.updateProgress(65);
      // Only apply if we haven't already cropped (zoom works better on original aspect)
      if (!effects.dynamicCrop) {
        const zoomPath = path.join(tempDir, `clip_${clipId}_zoom.mp4`);
        await applyZoomEffect(currentPath, zoomPath);
        currentPath = zoomPath;
      }
    }

    // Step 5: Add animated captions
    if (effects.captions && clip.project.analysis?.moments) {
      await job.updateProgress(80);
      const captionedPath = path.join(tempDir, `clip_${clipId}_captioned.mp4`);

      // Get transcript segments that fall within this clip's time range
      const transcript = clip.project.analysis.transcript as any;
      const segments = transcript?.segments || [];

      const clipCaptions = segments
        .filter(
          (seg: any) =>
            seg.start >= clip.startTime &&
            seg.end <= clip.endTime &&
            seg.text.trim(),
        )
        .map((seg: any) => ({
          text: seg.text.trim(),
          startTime: seg.start - clip.startTime,
          endTime: seg.end - clip.startTime,
        }));

      if (clipCaptions.length > 0) {
        await addCaptions(currentPath, captionedPath, clipCaptions);
        currentPath = captionedPath;
      }
    }

    // Step 6: Move final clip to project storage
    await job.updateProgress(95);
    const finalPath = path.join(projectDir, `clip_${clipId}.mp4`);

    const fs = await import('fs/promises');
    await fs.copyFile(currentPath, finalPath);

    // Update clip record
    await prisma.clip.update({
      where: { id: clipId },
      data: {
        filePath: finalPath,
        status: 'READY',
      },
    });

    await job.updateProgress(100);
    logger.info(`[Clip Worker] ✅ Clip ${clipId} ready: ${finalPath}`);
  } catch (error) {
    logger.error(`[Clip Worker] ❌ Clip ${clipId} failed:`, error);

    await prisma.clip.update({
      where: { id: clipId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

/**
 * Creates and starts the clip generation worker.
 */
export function startClipWorker(): Worker {
  const worker = new Worker('clips', processClip, {
    connection: createRedisConnection() as any,
    concurrency: 2, // Process 2 clips concurrently
  });

  worker.on('completed', (job) => {
    logger.info(`[Clip Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Clip Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    logger.error('[Clip Worker] Worker error:', err);
  });

  logger.info('✅ Clip worker started');
  return worker;
}
