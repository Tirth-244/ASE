// =============================================================================
// Analysis Controller
// =============================================================================
// Handles HTTP requests for video analysis operations.
// Triggers analysis jobs and returns results.
// =============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as analysisService from '../services/analysis.service';
import { analysisQueue } from '../queues';
import { logger } from '../config/logger';

/**
 * POST /api/projects/:id/analyze
 * Starts the AI analysis pipeline for a project.
 * Enqueues the analysis job and returns immediately.
 */
export async function startAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const projectId = req.params.id as string;

    // Create or reset analysis record
    const analysis = await analysisService.createAnalysis(projectId);

    // Enqueue the analysis job
    const job = await analysisQueue.add(
      'analyze-video',
      {
        projectId,
        analysisId: analysis.id,
        userId: req.user.id,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    logger.info(`Analysis job ${job.id} enqueued for project ${projectId}`);

    res.status(202).json({
      success: true,
      data: {
        analysisId: analysis.id,
        jobId: job.id,
        status: 'PENDING',
        message: 'Analysis started. Use SSE endpoint to track progress.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id/analysis
 * Returns the analysis results for a project.
 */
export async function getAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const analysis = await analysisService.getAnalysis(req.params.id as string, req.user.id);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id/moments
 * Returns the detected moments for a project.
 */
export async function getMoments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const moments = await analysisService.getProjectMoments(
      req.params.id as string,
      req.user.id,
      limit,
    );

    res.json({
      success: true,
      data: moments,
    });
  } catch (error) {
    next(error);
  }
}
