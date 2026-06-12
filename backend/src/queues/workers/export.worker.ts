// =============================================================================
// Export Worker
// =============================================================================
// BullMQ worker that processes video export/rendering jobs.
// Takes a processed clip and renders the final output file.
// =============================================================================

import { Worker, Job } from 'bullmq';
import path from 'path';
import fs from 'fs/promises';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { renderFinalExport, applyVerticalCrop, applyZoomEffect, applyCameraShake, applyFlashTransition, generateAssSubtitles, addAssCaptions } from '../../utils/ffmpeg';
import { ensureExportDir } from '../../utils/helpers';
import { sendSSEEvent } from '../../index';

interface ExportJobData {
  exportId: string;
  clipId: string;
  userId: string;
}

/**
 * Processes an export rendering job.
 * Renders the clip at the requested resolution and quality.
 */
async function processExport(job: Job<ExportJobData>): Promise<void> {
  const { exportId, clipId } = job.data;

  logger.info(`[Export Worker] Processing export ${exportId}`);

  try {
    // Get export and clip data
    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      include: {
        clip: {
          include: { project: true },
        },
      },
    });

    if (!exportRecord || !exportRecord.clip.filePath) {
      throw new Error(`Export ${exportId} or clip file not found`);
    }

    // Update status to rendering
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'RENDERING',
        startedAt: new Date(),
      },
    });

    await job.updateProgress(10);
    sendSSEEvent(job.data.userId, { type: 'export_progress', data: { exportId, progress: 10, status: 'RENDERING' } });

    // Prepare output directory
    const exportDir = await ensureExportDir(exportRecord.clip.projectId);
    const extension = exportRecord.format.toLowerCase();
    const outputPath = path.join(exportDir, `export_${exportId}.${extension}`);

    // Update status to encoding
    await prisma.export.update({
      where: { id: exportId },
      data: { status: 'ENCODING', progress: 30 },
    });

    await job.updateProgress(30);
    sendSSEEvent(job.data.userId, { type: 'export_progress', data: { exportId, progress: 30, status: 'ENCODING' } });

    let currentFilePath = exportRecord.clip.filePath;
    const isShortsTemplate = exportRecord.clip.template === 'TikTok Viral' || exportRecord.clip.template === 'Instagram Reels' || exportRecord.clip.template === 'Phonk Edit';

    if (isShortsTemplate) {
      const croppedPath = outputPath.replace('.mp4', '_cropped.mp4');
      await applyVerticalCrop(currentFilePath, croppedPath);
      currentFilePath = croppedPath;
      
      const zoomedPath = outputPath.replace('.mp4', '_zoomed.mp4');
      await applyZoomEffect(currentFilePath, zoomedPath);
      currentFilePath = zoomedPath;
    }

    if (exportRecord.clip.template === 'Phonk Edit') {
      const flashPath = outputPath.replace('.mp4', '_flash.mp4');
      await applyFlashTransition(currentFilePath, flashPath);
      currentFilePath = flashPath;

      const shakePath = outputPath.replace('.mp4', '_shake.mp4');
      await applyCameraShake(currentFilePath, shakePath);
      currentFilePath = shakePath;
    }

    // Apply Subtitles (Karaoke .ass)
    if (exportRecord.clip.captions && Array.isArray(exportRecord.clip.captions)) {
      const assPath = path.join(exportDir, `subs_${exportId}.ass`);
      // Assuming captions is an array of { word, start, end }
      await generateAssSubtitles(exportRecord.clip.captions as any, assPath);
      
      const subbedPath = outputPath.replace('.mp4', '_subbed.mp4');
      await addAssCaptions(currentFilePath, assPath, subbedPath);
      currentFilePath = subbedPath;
    }

    // Render the final export
    await renderFinalExport(
      currentFilePath,
      outputPath,
      isShortsTemplate ? '1080x1920' : exportRecord.resolution,
      exportRecord.quality,
    );

    // Clean up temporary files if any
    if (currentFilePath !== exportRecord.clip.filePath && currentFilePath !== outputPath) {
      await fs.unlink(currentFilePath).catch(() => {});
    }

    await job.updateProgress(80);
    sendSSEEvent(job.data.userId, { type: 'export_progress', data: { exportId, progress: 80, status: 'ENCODING' } });

    // Get file size
    const stats = await fs.stat(outputPath);

    // Update export record with completed status
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        filePath: outputPath,
        fileSize: BigInt(stats.size),
        completedAt: new Date(),
      },
    });

    // Check if all clips for this project are exported
    const projectId = exportRecord.clip.projectId;
    const pendingExports = await prisma.export.count({
      where: {
        projectId,
        status: { not: 'COMPLETED' },
      },
    });

    if (pendingExports === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'COMPLETED' },
      });
      sendSSEEvent(job.data.userId, { type: 'project_status', data: { projectId, status: 'COMPLETED' } });
    }

    await job.updateProgress(100);
    sendSSEEvent(job.data.userId, { type: 'export_progress', data: { exportId, progress: 100, status: 'COMPLETED' } });
    logger.info(`[Export Worker] ✅ Export ${exportId} complete: ${outputPath}`);
  } catch (error) {
    logger.error(`[Export Worker] ❌ Export ${exportId} failed:`, error);

    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'FAILED',
        error: (error as Error).message,
      },
    });
    
    sendSSEEvent(job.data.userId, { type: 'export_progress', data: { exportId, status: 'FAILED' } });

    throw error;
  }
}

/**
 * Creates and starts the export worker.
 */
export function startExportWorker(): Worker {
  const worker = new Worker('exports', processExport, {
    connection: createRedisConnection() as any,
    concurrency: 1, // One export at a time (CPU intensive)
  });

  worker.on('completed', (job) => {
    logger.info(`[Export Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Export Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    logger.error('[Export Worker] Worker error:', err);
  });

  logger.info('✅ Export worker started');
  return worker;
}
