// =============================================================================
// Clip Service
// =============================================================================
// Business logic for generating and managing video clips.
// Handles clip creation from moments, effect application, and ordering.
// =============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import { ClipEffects } from '../types';

/** Duration mapping for clip presets (in seconds) */
const PRESET_DURATIONS: Record<string, number> = {
  SHORT_15: 15,
  SHORT_30: 30,
  HIGHLIGHT_60: 60,
};

/**
 * Creates clips for a project based on the specified preset.
 * Selects the top moments that fit within the target duration.
 */
export async function generateClips(
  projectId: string,
  userId: string,
  preset: string,
  effects: Partial<ClipEffects> = {},
  template: string = 'Default',
) {
  // Verify project ownership and analysis completion
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      analysis: {
        include: {
          moments: { orderBy: { score: 'desc' } },
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  if (!project.analysis || project.analysis.status !== 'COMPLETED') {
    throw new BadRequestError('Video analysis must be completed before generating clips.');
  }

  const targetDuration = PRESET_DURATIONS[preset] || 60;
  const moments = project.analysis.moments;
  let isFallback = false;

  let selectedMoments = selectMomentsForDuration(moments, targetDuration);

  // Implement fallback logic
  if (selectedMoments.length < 4) {
    logger.info(`AI confidence low or insufficient moments found. Using fallback highlights.`);
    isFallback = true;
    selectedMoments = generateFallbackHighlights(project.duration || 120, 4, targetDuration);
  }

  // Default effects configuration
  const defaultEffects: ClipEffects = {
    autoZoom: true,
    dynamicCrop: true,
    slowMotion: false,
    slowMotionFactor: 0.5,
    transitions: 'fade',
    captions: true,
    scoreboard: false,
    ...effects,
  };

  // Create a clip for each selected moment
  const clips = await Promise.all(
    selectedMoments.map(async (moment, index) => {
      return prisma.clip.create({
        data: {
          projectId,
          presetType: preset as any,
          startTime: moment.startTime,
          endTime: moment.endTime,
          duration: moment.endTime - moment.startTime,
          effects: defaultEffects as any,
          order: index,
          status: 'PENDING',
          isFallback,
          template,
        },
      });
    }),
  );

  // Update project status
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'GENERATING_CLIPS' },
  });

  logger.info(
    `Created ${clips.length} clips for project ${projectId} (${preset})`,
  );

  return { mode: isFallback ? 'fallback_highlights' : 'ai_highlights', clips_generated: clips.length, clips };
}

/**
 * Generates fallback highlights by dividing the video evenly.
 */
function generateFallbackHighlights(videoDuration: number, minClips: number, clipDuration: number): Array<{ startTime: number; endTime: number; score: number }> {
  const clips = [];
  const spacing = Math.max(clipDuration, videoDuration / minClips);
  
  for (let i = 0; i < minClips; i++) {
    const startTime = i * spacing;
    if (startTime >= videoDuration) break;
    
    clips.push({
      startTime,
      endTime: Math.min(startTime + clipDuration, videoDuration),
      score: 0.5 // Fallback generic score
    });
  }
  return clips;
}

/**
 * Selects the best moments that fit within a target duration.
 * Greedy algorithm: takes highest-scored moments until duration is filled.
 */
function selectMomentsForDuration(
  moments: Array<{ startTime: number; endTime: number; score: number }>,
  targetDuration: number,
): Array<{ startTime: number; endTime: number; score: number }> {
  const selected: typeof moments = [];
  let totalDuration = 0;

  for (const moment of moments) {
    const momentDuration = moment.endTime - moment.startTime;

    if (totalDuration + momentDuration <= targetDuration) {
      selected.push(moment);
      totalDuration += momentDuration;
    }

    if (totalDuration >= targetDuration) break;
  }

  // Sort selected moments chronologically for smooth playback
  return selected.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Gets all clips for a project.
 */
export async function getProjectClips(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return prisma.clip.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });
}

/**
 * Updates a clip's effects, timing, or order.
 * Used by the timeline editor for drag-and-drop reordering.
 */
export async function updateClip(
  clipId: string,
  userId: string,
  updates: {
    startTime?: number;
    endTime?: number;
    effects?: Partial<ClipEffects>;
    order?: number;
    title?: string;
  },
) {
  // Verify ownership through project
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { project: { select: { userId: true } } },
  });

  if (!clip || clip.project.userId !== userId) {
    throw new NotFoundError('Clip');
  }

  const duration =
    updates.startTime !== undefined && updates.endTime !== undefined
      ? updates.endTime - updates.startTime
      : clip.duration;

  return prisma.clip.update({
    where: { id: clipId },
    data: {
      ...updates,
      duration,
      effects: updates.effects
        ? { ...(clip.effects as Record<string, unknown>), ...updates.effects }
        : undefined,
    },
  });
}

/**
 * Deletes a clip.
 */
export async function deleteClip(clipId: string, userId: string) {
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { project: { select: { userId: true } } },
  });

  if (!clip || clip.project.userId !== userId) {
    throw new NotFoundError('Clip');
  }

  await prisma.clip.delete({ where: { id: clipId } });
  return { message: 'Clip deleted successfully' };
}
