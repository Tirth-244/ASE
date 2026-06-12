// =============================================================================
// Utility Functions
// =============================================================================

import { clsx, type ClassValue } from 'clsx';

/**
 * Combines class names with conditional logic (Tailwind-friendly).
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formats seconds to mm:ss or hh:mm:ss display.
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
 * Formats a file size in bytes to human-readable format.
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Returns a relative time string (e.g., "2 hours ago").
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 43200) return `${Math.floor(diffMins / 1440)}d ago`;
  return past.toLocaleDateString();
}

/**
 * Maps project status to display label and color.
 */
export function getStatusConfig(status: string): { label: string; color: string; className: string } {
  const configs: Record<string, { label: string; color: string; className: string }> = {
    PENDING: { label: 'Pending', color: 'gray', className: 'badge-info' },
    DOWNLOADING: { label: 'Downloading', color: 'blue', className: 'badge-info' },
    DOWNLOADED: { label: 'Downloaded', color: 'blue', className: 'badge-info' },
    ANALYZING: { label: 'Analyzing', color: 'purple', className: 'badge-info' },
    ANALYZED: { label: 'Analyzed', color: 'green', className: 'badge-success' },
    GENERATING_CLIPS: { label: 'Generating', color: 'orange', className: 'badge-warning' },
    CLIPS_READY: { label: 'Clips Ready', color: 'green', className: 'badge-success' },
    EXPORTING: { label: 'Exporting', color: 'orange', className: 'badge-warning' },
    COMPLETED: { label: 'Completed', color: 'green', className: 'badge-success' },
    FAILED: { label: 'Failed', color: 'red', className: 'badge-error' },
  };

  return configs[status] || { label: status, color: 'gray', className: 'badge-info' };
}

/**
 * Validates a YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]{11}/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]{11}/,
  ];
  return patterns.some((p) => p.test(url));
}
