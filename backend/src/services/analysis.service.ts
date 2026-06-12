// =============================================================================
// Analysis Service
// =============================================================================
// Orchestrates the AI video analysis pipeline by coordinating with
// the Python AI microservice for scene detection, transcription,
// action detection, and moment scoring.
// =============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError } from '../middleware/error.middleware';

/**
 * Creates a new analysis record for a project.
 */
export async function createAnalysis(projectId: string) {
  // Check if analysis already exists
  const existing = await prisma.analysis.findUnique({
    where: { projectId },
  });

  if (existing) {
    // Reset existing analysis for re-processing
    return prisma.analysis.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING',
        progress: 0,
        transcript: null as any,
        scenes: null as any,
        audioData: null as any,
        error: null,
        startedAt: new Date(),
        completedAt: null,
      },
    });
  }

  return prisma.analysis.create({
    data: {
      projectId,
      status: 'PENDING',
      startedAt: new Date(),
    },
  });
}

/**
 * Gets analysis results for a project.
 */
export async function getAnalysis(projectId: string, userId: string) {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  const analysis = await prisma.analysis.findUnique({
    where: { projectId },
    include: {
      moments: {
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!analysis) {
    throw new NotFoundError('Analysis');
  }

  return analysis;
}

/**
 * Updates analysis progress and status.
 * Called by queue workers during processing.
 */
export async function updateAnalysisProgress(
  analysisId: string,
  status: string,
  progress: number,
  data?: Record<string, unknown>,
) {
  return prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status: status as any,
      progress,
      ...data,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
  });
}

/**
 * Saves detected moments from AI analysis.
 * Replaces any existing moments for the analysis.
 */
export async function saveMoments(
  analysisId: string,
  moments: Array<{
    type: string;
    startTime: number;
    endTime: number;
    score: number;
    confidence: number;
    description?: string;
    thumbnailPath?: string;
    metadata?: Record<string, unknown>;
  }>,
) {
  // Delete existing moments first
  await prisma.moment.deleteMany({ where: { analysisId } });

  // Create new moments
  const created = await prisma.moment.createMany({
    data: moments.map((m) => ({
      analysisId,
      type: m.type as any,
      startTime: m.startTime,
      endTime: m.endTime,
      score: m.score,
      confidence: m.confidence,
      description: m.description,
      thumbnailPath: m.thumbnailPath,
      metadata: m.metadata as any,
    })),
  });

  logger.info(`Saved ${created.count} moments for analysis ${analysisId}`);
  return created;
}

/**
 * Gets the top moments for a project, sorted by score.
 */
export async function getProjectMoments(
  projectId: string,
  userId: string,
  limit: number = 20,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return prisma.moment.findMany({
    where: {
      analysis: { projectId },
    },
    orderBy: { score: 'desc' },
    take: limit,
  });
}
