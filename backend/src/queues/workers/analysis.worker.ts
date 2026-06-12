// =============================================================================
// Analysis Worker
// =============================================================================
// BullMQ worker that processes video analysis jobs.
// Orchestrates the full AI pipeline: download → extract → analyze → score.
// =============================================================================

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import * as aiService from '../../services/ai.service';
import * as analysisService from '../../services/analysis.service';
import { downloadVideo } from '../../utils/youtube';
import { extractFrames } from '../../utils/ffmpeg';
import { ensureProjectDir, ensureTempDir } from '../../utils/helpers';

interface AnalysisJobData {
  projectId: string;
  analysisId: string;
  userId: string;
}

/**
 * Processes a video analysis job through the full AI pipeline.
 *
 * Pipeline stages:
 * 1. Download video from YouTube
 * 2. Extract key frames for visual analysis
 * 3. Detect scene boundaries (PySceneDetect)
 * 4. Transcribe audio (Whisper)
 * 5. Detect sports actions (YOLO)
 * 6. Analyze and score moments (LLM)
 */
async function processAnalysis(job: Job<AnalysisJobData>): Promise<void> {
  const { projectId, analysisId } = job.data;

  logger.info(`[Analysis Worker] Starting analysis for project ${projectId}`);

  try {
    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const projectDir = await ensureProjectDir(projectId);
    const tempDir = await ensureTempDir(projectId);

    // ── Stage 1: Download Video ──────────────────────────────────
    await job.updateProgress(5);
    await analysisService.updateAnalysisProgress(analysisId, 'EXTRACTING_FRAMES', 5);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'DOWNLOADING' },
    });

    let videoPath = project.videoPath;
    let audioPath = project.audioPath;

    if (!videoPath || !audioPath) {
      const paths = await downloadVideo(project.youtubeUrl, projectDir, projectId);
      videoPath = paths.videoPath;
      audioPath = paths.audioPath;

      await prisma.project.update({
        where: { id: projectId },
        data: {
          videoPath,
          audioPath,
          status: 'DOWNLOADED',
        },
      });
    }

    await job.updateProgress(15);

    // ── Stage 2: Extract Frames ──────────────────────────────────
    await analysisService.updateAnalysisProgress(analysisId, 'EXTRACTING_FRAMES', 20);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'ANALYZING' },
    });

    const framesDir = `${tempDir}/frames`;
    const framePaths = await extractFrames(videoPath!, framesDir, 2);

    logger.info(`[Analysis Worker] Extracted ${framePaths.length} frames`);
    await job.updateProgress(30);

    // ── Stage 3: Scene Detection ─────────────────────────────────
    await analysisService.updateAnalysisProgress(analysisId, 'DETECTING_SCENES', 35);

    let scenes: Array<{ start: number; end: number; duration: number }> = [];
    try {
      const sceneResult = await aiService.detectScenes(videoPath!);
      scenes = sceneResult.scenes;
      logger.info(`[Analysis Worker] Detected ${scenes.length} scenes`);
    } catch (error) {
      logger.warn('[Analysis Worker] Scene detection failed, continuing:', error);
    }

    await job.updateProgress(45);

    // ── Stage 4: Transcribe Audio ────────────────────────────────
    await analysisService.updateAnalysisProgress(analysisId, 'TRANSCRIBING', 50);

    let transcript = { text: '', segments: [] as any[], language: 'en' };
    try {
      transcript = await aiService.transcribeAudio(audioPath!);
      logger.info(`[Analysis Worker] Transcribed ${transcript.segments.length} segments`);
    } catch (error) {
      logger.warn('[Analysis Worker] Transcription failed, continuing:', error);
    }

    await job.updateProgress(60);

    // ── Stage 5: Action Detection (YOLO) ─────────────────────────
    await analysisService.updateAnalysisProgress(analysisId, 'DETECTING_ACTIONS', 65);

    let actionDetections: any[] = [];
    try {
      const actionResult = await aiService.detectActions(framePaths, videoPath!);
      actionDetections = actionResult.detections;
      logger.info(`[Analysis Worker] Detected actions in ${actionDetections.length} frames`);
    } catch (error) {
      logger.warn('[Analysis Worker] Action detection failed, continuing:', error);
    }

    await job.updateProgress(75);

    // ── Stage 6: AI Scene Analysis & Moment Scoring ──────────────
    await analysisService.updateAnalysisProgress(analysisId, 'SCORING_MOMENTS', 80);

    let moments: Array<{
      type: string;
      start_time: number;
      end_time: number;
      score: number;
      confidence: number;
      description: string;
    }> = [];

    try {
      const analysisResult = await aiService.analyzeScenes(
        framePaths.slice(0, 50), // Limit frames sent to LLM
        transcript.text,
        scenes.map((s) => ({ start: s.start, end: s.end })),
      );
      moments = analysisResult.moments;
      logger.info(`[Analysis Worker] Scored ${moments.length} moments`);
    } catch (error) {
      logger.warn('[Analysis Worker] Scene analysis failed, continuing:', error);
    }

    await job.updateProgress(90);

    // ── Stage 7: Audio Analysis ──────────────────────────────────
    let audioData: any = null;
    try {
      audioData = await aiService.analyzeAudio(audioPath!);
      logger.info(`[Analysis Worker] Audio analysis complete (tempo: ${audioData.tempo} BPM)`);
    } catch (error) {
      logger.warn('[Analysis Worker] Audio analysis failed, continuing:', error);
    }

    // ── Save Results ─────────────────────────────────────────────
    await analysisService.updateAnalysisProgress(analysisId, 'COMPLETED', 100, {
      transcript: transcript as any,
      scenes: scenes as any,
      audioData: audioData as any,
    });

    // Save detected moments
    if (moments.length > 0) {
      await analysisService.saveMoments(
        analysisId,
        moments.map((m) => ({
          type: m.type.toUpperCase().replace(/ /g, '_'),
          startTime: m.start_time,
          endTime: m.end_time,
          score: m.score,
          confidence: m.confidence,
          description: m.description,
        })),
      );
    }

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'ANALYZED' },
    });

    await job.updateProgress(100);
    logger.info(`[Analysis Worker] ✅ Analysis complete for project ${projectId}`);
  } catch (error) {
    logger.error(`[Analysis Worker] ❌ Analysis failed for project ${projectId}:`, error);

    // Update status to failed
    await analysisService.updateAnalysisProgress(analysisId, 'FAILED', 0, {
      error: (error as Error).message,
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'FAILED' },
    });

    throw error; // Re-throw for BullMQ retry logic
  }
}

/**
 * Creates and starts the analysis worker.
 */
export function startAnalysisWorker(): Worker {
  const worker = new Worker('analysis', processAnalysis, {
    connection: createRedisConnection() as any,
    concurrency: 1, // Process one video at a time (resource intensive)
    limiter: {
      max: 2,
      duration: 60000, // Max 2 jobs per minute
    },
  });

  worker.on('completed', (job) => {
    logger.info(`[Analysis Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Analysis Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    logger.error('[Analysis Worker] Worker error:', err);
  });

  logger.info('✅ Analysis worker started');
  return worker;
}
