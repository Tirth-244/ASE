// =============================================================================
// Project Service
// =============================================================================
// Business logic for managing video editing projects.
// Handles project CRUD, YouTube URL validation, and metadata fetching.
// =============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import { isValidYouTubeUrl, extractVideoId, fetchVideoMetadata } from '../utils/youtube';
import { PaginationQuery } from '../types';

/**
 * Creates a new project from a YouTube URL.
 * Validates the URL and fetches video metadata before creating.
 */
export async function createProject(userId: string, youtubeUrl: string) {
  // Validate YouTube URL format
  if (!isValidYouTubeUrl(youtubeUrl)) {
    throw new BadRequestError('Invalid YouTube URL. Please provide a valid YouTube video link.');
  }

  const youtubeId = extractVideoId(youtubeUrl);
  if (!youtubeId) {
    throw new BadRequestError('Could not extract video ID from URL.');
  }

  // Fetch video metadata from YouTube
  logger.info(`Fetching metadata for YouTube video: ${youtubeId}`);
  const metadata = await fetchVideoMetadata(youtubeUrl);

  // Create the project with metadata
  const project = await prisma.project.create({
    data: {
      userId,
      youtubeUrl,
      youtubeId,
      title: metadata.title,
      description: metadata.description,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      metadata: metadata as any,
      status: 'PENDING',
    },
  });

  logger.info(`Project created: ${project.id} for user ${userId}`);
  return project;
}

/**
 * Gets a project by ID, ensuring it belongs to the requesting user.
 */
export async function getProjectById(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      analysis: {
        include: {
          moments: {
            orderBy: { score: 'desc' },
          },
        },
      },
      clips: {
        orderBy: { order: 'asc' },
      },
      exports: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  return project;
}

/**
 * Lists all projects for a user with pagination.
 */
export async function listProjects(
  userId: string,
  pagination: PaginationQuery = {},
) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: {
        analysis: { select: { status: true, progress: true } },
        _count: { select: { clips: true, exports: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.project.count({ where: { userId } }),
  ]);

  return {
    projects,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Deletes a project and all associated data (cascading).
 */
export async function deleteProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  await prisma.project.delete({ where: { id: projectId } });
  logger.info(`Project deleted: ${projectId}`);

  return { message: 'Project deleted successfully' };
}

/**
 * Updates a project's status.
 * Used by queue workers to track processing progress.
 */
export async function updateProjectStatus(
  projectId: string,
  status: string,
  additionalData?: Record<string, unknown>,
) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      status: status as any,
      ...additionalData,
    },
  });
}
