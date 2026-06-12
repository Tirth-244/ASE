// =============================================================================
// TypeScript Type Definitions
// =============================================================================
// Shared types used across the backend application.
// =============================================================================

import { Request } from 'express';

/**
 * Authenticated user payload extracted from JWT token.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Express Request with authenticated user attached by auth middleware.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/**
 * Standard API response envelope.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Pagination query parameters.
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Job status for queue processing.
 */
export interface JobStatus {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Video metadata fetched from YouTube via yt-dlp.
 */
export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  viewCount: number;
  uploadDate: string;
  tags: string[];
}

/**
 * AI analysis request sent to the Python microservice.
 */
export interface AnalysisRequest {
  projectId: string;
  videoPath: string;
  audioPath?: string;
  options?: {
    detectScenes?: boolean;
    transcribe?: boolean;
    detectActions?: boolean;
    analyzeWithLLM?: boolean;
  };
}

/**
 * Clip generation configuration.
 */
export interface ClipConfig {
  startTime: number;
  endTime: number;
  preset: 'SHORT_15' | 'SHORT_30' | 'HIGHLIGHT_60' | 'CUSTOM';
  effects: ClipEffects;
}

/**
 * Visual and audio effects to apply to a clip.
 */
export interface ClipEffects {
  autoZoom: boolean;
  dynamicCrop: boolean; // 9:16 vertical crop
  slowMotion: boolean;
  slowMotionFactor?: number; // 0.25 = 4x slower
  transitions: 'none' | 'fade' | 'dissolve' | 'wipe';
  captions: boolean;
  scoreboard: boolean;
  musicTrack?: string;
}

/**
 * Export configuration for final rendering.
 */
export interface ExportConfig {
  format: 'MP4' | 'WEBM' | 'MOV';
  resolution: string; // e.g., "1080x1920"
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: number;
}

/**
 * Server-Sent Event for real-time progress updates.
 */
export interface SSEEvent {
  type: string;
  projectId: string;
  data: Record<string, unknown>;
}
