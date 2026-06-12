// =============================================================================
// AI Service Client
// =============================================================================
// HTTP client for communicating with the Python FastAPI AI microservice.
// Handles frame extraction, scene detection, transcription, action detection,
// scene analysis, and content generation requests.
// =============================================================================

import { env } from '../config/env';
import { logger } from '../config/logger';

const AI_BASE_URL = env.AI_SERVICE_URL;
const AI_API_KEY = env.AI_SERVICE_API_KEY;

/**
 * Makes an authenticated request to the AI microservice.
 */
async function aiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  timeoutMs: number = 300000, // 5 min default for AI operations
): Promise<T> {
  const url = `${AI_BASE_URL}${endpoint}`;

  logger.debug(`AI request: ${endpoint}`, { body: { ...body, videoPath: '...' } });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI service error (${response.status}): ${error}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`AI service request timed out after ${timeoutMs / 1000}s`);
    }
    logger.error(`AI service request failed: ${endpoint}`, error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// AI Service Endpoints
// ---------------------------------------------------------------------------

/**
 * Extracts key frames from a video for analysis.
 */
export async function extractFrames(videoPath: string, interval: number = 2) {
  return aiRequest<{ frames: string[]; count: number }>(
    '/api/v1/extract-frames',
    { video_path: videoPath, interval },
    600000, // 10 min timeout
  );
}

/**
 * Detects scene boundaries using PySceneDetect.
 */
export async function detectScenes(videoPath: string) {
  return aiRequest<{
    scenes: Array<{ start: number; end: number; duration: number }>;
  }>('/api/v1/detect-scenes', { video_path: videoPath }, 300000);
}

/**
 * Transcribes audio using Whisper.
 */
export async function transcribeAudio(audioPath: string) {
  return aiRequest<{
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      confidence: number;
    }>;
    language: string;
  }>('/api/v1/transcribe', { audio_path: audioPath }, 600000);
}

/**
 * Detects sports actions in frames using YOLO.
 */
export async function detectActions(
  framePaths: string[],
  videoPath: string,
) {
  return aiRequest<{
    detections: Array<{
      frame_index: number;
      timestamp: number;
      actions: Array<{
        label: string;
        confidence: number;
        bbox: [number, number, number, number];
      }>;
    }>;
  }>('/api/v1/detect-actions', {
    frame_paths: framePaths,
    video_path: videoPath,
  }, 600000);
}

/**
 * Analyzes scenes with LLM for moment scoring and description.
 */
export async function analyzeScenes(
  framePaths: string[],
  transcript: string,
  scenes: Array<{ start: number; end: number }>,
) {
  return aiRequest<{
    moments: Array<{
      type: string;
      start_time: number;
      end_time: number;
      score: number;
      confidence: number;
      description: string;
    }>;
  }>('/api/v1/analyze-scenes', {
    frame_paths: framePaths,
    transcript,
    scenes,
  }, 300000);
}

/**
 * Analyzes audio for beat detection and energy levels.
 */
export async function analyzeAudio(audioPath: string) {
  return aiRequest<{
    beats: number[];
    energy: Array<{ time: number; level: number }>;
    tempo: number;
  }>('/api/v1/analyze-audio', { audio_path: audioPath }, 120000);
}

/**
 * Generates AI content: titles, hashtags, descriptions.
 */
export async function generateContent(
  type: 'title' | 'hashtags' | 'description' | 'thumbnail_suggestion',
  context: {
    videoTitle?: string;
    transcript?: string;
    moments?: Array<{ type: string; description: string }>;
    sport?: string;
  },
) {
  return aiRequest<{
    result: string | string[];
  }>('/api/v1/generate-content', { type, context }, 60000);
}

/**
 * Health check for the AI service.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
