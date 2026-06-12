// =============================================================================
// Export Service
// =============================================================================
// Manages the export pipeline: creating export jobs, tracking progress,
// and managing exported file downloads.
// =============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env';

/**
 * Creates an export job for a clip.
 */
export async function createExport(
  clipId: string,
  userId: string,
  options: {
    format?: string;
    resolution?: string;
    quality?: string;
  } = {},
) {
  // Verify clip ownership
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { project: { select: { id: true, userId: true } } },
  });

  if (!clip || clip.project.userId !== userId) {
    throw new NotFoundError('Clip');
  }

  if (clip.status !== 'READY') {
    throw new BadRequestError('Clip must be processed before exporting.');
  }

  const exportRecord = await prisma.export.create({
    data: {
      projectId: clip.project.id,
      clipId,
      format: (options.format as any) || 'MP4',
      resolution: options.resolution || '1080x1920',
      quality: options.quality || 'high',
      status: 'PENDING',
    },
  });

  logger.info(`Export created: ${exportRecord.id} for clip ${clipId}`);
  return exportRecord;
}

/**
 * Gets export details including download information.
 */
export async function getExport(exportId: string, userId: string) {
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
    include: {
      project: { select: { userId: true, title: true } },
      clip: { select: { presetType: true, duration: true } },
    },
  });

  if (!exportRecord || exportRecord.project.userId !== userId) {
    throw new NotFoundError('Export');
  }

  return exportRecord;
}

/**
 * Lists export history for a user with pagination.
 */
export async function listExports(
  userId: string,
  options: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [exports, total] = await Promise.all([
    prisma.export.findMany({
      where: { project: { userId } },
      include: {
        project: { select: { title: true, thumbnail: true } },
        clip: { select: { presetType: true, duration: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.export.count({ where: { project: { userId } } }),
  ]);

  return {
    exports,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Updates export progress and status.
 * Called by the export queue worker during rendering.
 */
export async function updateExportProgress(
  exportId: string,
  status: string,
  progress: number,
  additionalData?: Record<string, unknown>,
) {
  return prisma.export.update({
    where: { id: exportId },
    data: {
      status: status as any,
      progress,
      ...additionalData,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
  });
}

/**
 * Gets the file path for downloading an export.
 * Verifies the file exists on disk before returning.
 */
export async function getExportFilePath(exportId: string, userId: string): Promise<string> {
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
    include: { project: { select: { userId: true } } },
  });

  if (!exportRecord || exportRecord.project.userId !== userId) {
    throw new NotFoundError('Export');
  }

  if (exportRecord.status !== 'COMPLETED' || !exportRecord.filePath) {
    throw new BadRequestError('Export is not ready for download.');
  }

  // Verify file exists
  try {
    await fs.access(exportRecord.filePath);
  } catch {
    throw new NotFoundError('Export file');
  }

  return exportRecord.filePath;
}
