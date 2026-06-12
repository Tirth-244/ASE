// =============================================================================
// Clip Controller
// =============================================================================
// Handles HTTP requests for clip generation and management.
// =============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as clipService from '../services/clip.service';
import { clipQueue } from '../queues';
import { logger } from '../config/logger';

/**
 * POST /api/projects/:id/clips
 * Generates clips for a project with the specified preset.
 */
export async function generateClips(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const projectId = req.params.id as string;
    const { preset = 'SHORT_30', effects = {}, template = 'Default' } = req.body;

    const result = await clipService.generateClips(
      projectId,
      req.user.id,
      preset,
      effects,
      template,
    );
    const clips = result.clips;

    // Enqueue clip processing jobs
    for (const clip of clips) {
      await clipQueue.add(
        'process-clip',
        {
          clipId: clip.id,
          projectId,
          userId: req.user.id,
        },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100 },
        },
      );
    }

    logger.info(`${clips.length} clip jobs enqueued for project ${projectId}`);

    res.status(202).json({
      success: true,
      clips_generated: result.clips_generated,
      mode: result.mode,
      data: clips,
      message: `${clips.length} clips are being generated.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id/clips
 * Lists all clips for a project.
 */
export async function getClips(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const clips = await clipService.getProjectClips(req.params.id as string, req.user.id);

    res.json({
      success: true,
      data: clips,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/clips/:id
 * Updates a clip's settings (effects, timing, order).
 */
export async function updateClip(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const clip = await clipService.updateClip(req.params.id as string, req.user.id, req.body);

    res.json({
      success: true,
      data: clip,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/clips/:id
 * Deletes a clip.
 */
export async function deleteClip(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await clipService.deleteClip(req.params.id as string, req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
