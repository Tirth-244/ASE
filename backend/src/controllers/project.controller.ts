// =============================================================================
// Project Controller
// =============================================================================
// Handles HTTP requests for project CRUD operations.
// =============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import fs from 'fs';
import path from 'path';
import * as projectService from '../services/project.service';

/**
 * POST /api/projects
 * Creates a new project from a YouTube URL.
 */
export async function createProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { youtubeUrl } = req.body;
    const project = await projectService.createProject(req.user.id, youtubeUrl);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects
 * Lists all projects for the authenticated user.
 */
export async function listProjects(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await projectService.listProjects(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result.projects,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id
 * Gets a project by ID with all related data.
 */
export async function getProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const project = await projectService.getProjectById(req.params.id as string, req.user.id);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:id
 * Deletes a project and all associated data.
 */
export async function deleteProject(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await projectService.deleteProject(req.params.id as string, req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id/stream
 * Streams the source video or a specific clip for preview.
 */
export async function streamProjectVideo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const project = await projectService.getProjectById(req.params.id as string, req.user.id);
    
    // Determine the video path (either full project video or clip)
    let videoPath = project.videoPath;
    
    // If a clip ID is provided in query, stream that instead
    if (req.query.clipId) {
      const clip = project.clips?.find((c) => c.id === req.query.clipId);
      if (clip && clip.filePath) {
        videoPath = clip.filePath;
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      res.status(404).json({ success: false, message: 'Video file not found' });
      return;
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
}
