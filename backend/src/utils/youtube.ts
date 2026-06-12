// =============================================================================
// YouTube Utility - yt-dlp Wrapper
// =============================================================================
// Provides functions to fetch video metadata and download videos
// from YouTube using yt-dlp as a child process.
// =============================================================================

import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../config/logger';
import { VideoMetadata } from '../types';

const execAsync = promisify(exec);

/**
 * Validates that a string is a proper YouTube URL.
 * Supports youtube.com/watch, youtu.be, and youtube.com/shorts formats.
 */
export function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]{11}/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]{11}/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]{11}/,
  ];
  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Extracts the YouTube video ID from various URL formats.
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetches video metadata from YouTube without downloading the video.
 * Uses yt-dlp's --dump-json flag for fast metadata extraction.
 */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  logger.info(`Fetching metadata for: ${url}`);

  try {
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-download --no-playlist "${url}"`,
      { timeout: 30000 }, // 30 second timeout
    );

    const info = JSON.parse(stdout);

    return {
      id: info.id,
      title: info.title || 'Untitled',
      description: info.description || '',
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
      duration: info.duration || 0,
      uploader: info.uploader || info.channel || 'Unknown',
      viewCount: info.view_count || 0,
      uploadDate: info.upload_date || '',
      tags: info.tags || [],
    };
  } catch (error) {
    logger.error('Failed to fetch video metadata:', error);
    throw new Error(`Failed to fetch video metadata: ${(error as Error).message}`);
  }
}

/**
 * Downloads a YouTube video to the specified output directory.
 * Downloads both video (mp4) and audio (wav) separately for processing.
 *
 * @returns Object with paths to downloaded video and audio files
 */
export async function downloadVideo(
  url: string,
  outputDir: string,
  projectId: string,
): Promise<{ videoPath: string; audioPath: string }> {
  logger.info(`Downloading video for project ${projectId}`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const videoPath = path.join(outputDir, `${projectId}.mp4`);
  const audioPath = path.join(outputDir, `${projectId}.wav`);

  try {
    // Download video (best quality mp4)
    await execAsync(
      `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ` +
        `--merge-output-format mp4 ` +
        `--no-playlist ` +
        `-o "${videoPath}" ` +
        `"${url}"`,
      { timeout: 600000 }, // 10 minute timeout for large videos
    );

    logger.info(`Video downloaded: ${videoPath}`);

    // Extract audio as WAV for transcription
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`,
      { timeout: 300000 }, // 5 minute timeout
    );

    logger.info(`Audio extracted: ${audioPath}`);

    return { videoPath, audioPath };
  } catch (error) {
    logger.error('Failed to download video:', error);
    // Clean up partial downloads
    await fs.unlink(videoPath).catch(() => {});
    await fs.unlink(audioPath).catch(() => {});
    throw new Error(`Failed to download video: ${(error as Error).message}`);
  }
}

/**
 * Downloads the video thumbnail to the specified path.
 */
export async function downloadThumbnail(
  url: string,
  outputPath: string,
): Promise<string> {
  try {
    await execAsync(
      `yt-dlp --write-thumbnail --skip-download --convert-thumbnails jpg ` +
        `-o "${outputPath}" --no-playlist "${url}"`,
      { timeout: 30000 },
    );
    return `${outputPath}.jpg`;
  } catch (error) {
    logger.warn('Failed to download thumbnail:', error);
    return '';
  }
}
