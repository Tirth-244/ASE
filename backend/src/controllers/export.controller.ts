// =============================================================================
// Export Controller
// =============================================================================
// Handles HTTP requests for export operations and file downloads.
// =============================================================================

import { Response, NextFunction } from 'express';
import path from 'path';
import { AuthenticatedRequest } from '../types';
import * as exportService from '../services/export.service';
import { exportQueue } from '../queues';
import { logger } from '../config/logger';

/**
 * POST /api/clips/:id/export
 * Starts an export job for a clip.
 */
export async function startExport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const clipId = req.params.id as string;
    const { format, resolution, quality } = req.body;

    const exportRecord = await exportService.createExport(clipId, req.user.id, {
      format,
      resolution,
      quality,
    });

    // Enqueue the export job
    const job = await exportQueue.add(
      'render-export',
      {
        exportId: exportRecord.id,
        clipId,
        userId: req.user.id,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 50 },
      },
    );

    logger.info(`Export job ${job.id} enqueued for clip ${clipId}`);

    res.status(202).json({
      success: true,
      data: {
        exportId: exportRecord.id,
        jobId: job.id,
        status: 'PENDING',
        message: 'Export started. Track progress via SSE.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/exports/:id
 * Gets export status and details.
 */
export async function getExport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const exportRecord = await exportService.getExport(req.params.id as string, req.user.id);

    res.json({
      success: true,
      data: exportRecord,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/exports
 * Lists export history for the authenticated user.
 */
export async function listExports(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = req.query;

    const result = await exportService.listExports(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: result.exports,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/exports/:id/download
 * Downloads the exported file.
 */
export async function downloadExport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const filePath = await exportService.getExportFilePath(
      req.params.id as string,
      req.user.id,
    );

    const filename = path.basename(filePath);
    res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
}
