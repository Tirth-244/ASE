// =============================================================================
// Helper Utilities
// =============================================================================
// General-purpose utility functions used across the backend.
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env';

/**
 * Generates a unique ID for resources.
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Creates a directory path for a project's storage.
 * Ensures the directory exists before returning the path.
 */
export async function ensureProjectDir(projectId: string): Promise<string> {
  const dir = path.join(env.VIDEO_STORAGE_PATH, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Creates a directory path for project exports.
 */
export async function ensureExportDir(projectId: string): Promise<string> {
  const dir = path.join(env.EXPORT_STORAGE_PATH, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Creates a temporary directory for intermediate processing files.
 */
export async function ensureTempDir(projectId: string): Promise<string> {
  const dir = path.join(env.TEMP_STORAGE_PATH, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Cleans up temporary files for a project after processing.
 */
export async function cleanupTempDir(projectId: string): Promise<void> {
  const dir = path.join(env.TEMP_STORAGE_PATH, projectId);
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Formats duration in seconds to a human-readable string.
 * e.g., 3661 → "1:01:01"
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formats file size in bytes to a human-readable string.
 * e.g., 1048576 → "1.00 MB"
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Sanitizes a filename by removing special characters.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

/**
 * Returns the file extension from a path (lowercase, without dot).
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace('.', '');
}

/**
 * Delays execution for the specified milliseconds.
 * Useful for rate limiting and retry logic.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
