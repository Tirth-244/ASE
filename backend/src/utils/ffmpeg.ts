// =============================================================================
// FFmpeg Utility - Video Processing Wrapper
// =============================================================================
// Provides high-level functions for video manipulation using FFmpeg:
// frame extraction, cropping, transitions, captions, and encoding.
// =============================================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../config/logger';
import { ClipEffects } from '../types';

const execAsync = promisify(exec);

/**
 * Extracts a clip from a source video between start and end times.
 */
export async function extractClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
): Promise<void> {
  const duration = endTime - startTime;

  await execAsync(
    `ffmpeg -ss ${startTime} -i "${inputPath}" -t ${duration} ` +
      `-c:v libx264 -c:a aac -preset fast -y "${outputPath}"`,
    { timeout: 120000 },
  );

  logger.info(`Clip extracted: ${startTime}s-${endTime}s → ${outputPath}`);
}

/**
 * Applies 9:16 vertical crop for YouTube Shorts (1080x1920).
 * Centers the crop on detected action or center of frame.
 */
export async function applyVerticalCrop(
  inputPath: string,
  outputPath: string,
  focusX?: number, // 0.0–1.0 horizontal focus point
): Promise<void> {
  // Calculate crop position - center by default
  const cropX = focusX !== undefined ? `iw*${focusX}-ih*9/32` : '(iw-ih*9/16)/2';

  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "crop=ih*9/16:ih:${cropX}:0,scale=1080:1920" ` +
      `-c:v libx264 -c:a aac -preset fast -y "${outputPath}"`,
    { timeout: 120000 },
  );

  logger.info(`Vertical crop applied: ${outputPath}`);
}

/**
 * Applies slow motion effect by changing the playback speed.
 * @param factor - Speed factor (0.5 = half speed, 0.25 = quarter speed)
 */
export async function applySlowMotion(
  inputPath: string,
  outputPath: string,
  factor: number = 0.5,
): Promise<void> {
  const videoSpeed = factor;
  const audioSpeed = factor;

  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "setpts=${1 / videoSpeed}*PTS" ` +
      `-af "atempo=${audioSpeed}" ` +
      `-c:v libx264 -c:a aac -preset fast -y "${outputPath}"`,
    { timeout: 120000 },
  );

  logger.info(`Slow motion (${factor}x) applied: ${outputPath}`);
}

/**
 * Adds animated text captions to the video.
 * Captions are rendered with a semi-transparent background for readability.
 */
export async function addCaptions(
  inputPath: string,
  outputPath: string,
  captions: Array<{ text: string; startTime: number; endTime: number }>,
  fontPath?: string,
): Promise<void> {
  if (captions.length === 0) {
    // No captions to add — just copy
    await fs.copyFile(inputPath, outputPath);
    return;
  }

  // Build drawtext filter chain for each caption segment
  const drawTextFilters = captions
    .map((cap, i) => {
      const escapedText = cap.text.replace(/'/g, "'\\''").replace(/:/g, '\\:');
      return (
        `drawtext=text='${escapedText}':` +
        `fontsize=42:fontcolor=white:` +
        `borderw=3:bordercolor=black:` +
        `x=(w-text_w)/2:y=h-h/6:` +
        `enable='between(t,${cap.startTime},${cap.endTime})'` +
        (fontPath ? `:fontfile='${fontPath}'` : '')
      );
    })
    .join(',');

  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "${drawTextFilters}" ` +
      `-c:v libx264 -c:a copy -preset fast -y "${outputPath}"`,
    { timeout: 180000 },
  );

  logger.info(`Captions added (${captions.length} segments): ${outputPath}`);
}

/**
 * Applies a Ken Burns-style zoom effect on the video.
 * Creates a subtle zoom-in animation for visual interest.
 */
export async function applyZoomEffect(
  inputPath: string,
  outputPath: string,
  zoomStart: number = 1.0,
  zoomEnd: number = 1.15,
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "scale=8000:-1,` +
      `zoompan=z='${zoomStart}+(${zoomEnd}-${zoomStart})*on/duration':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=1:s=1080x1920:fps=30" ` +
      `-c:v libx264 -c:a aac -preset fast -y "${outputPath}"`,
    { timeout: 180000 },
  );

  logger.info(`Zoom effect applied: ${outputPath}`);
}

/**
 * Adds a transition between two clips (crossfade).
 */
export async function addTransition(
  clip1Path: string,
  clip2Path: string,
  outputPath: string,
  transitionType: string = 'fade',
  duration: number = 0.5,
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${clip1Path}" -i "${clip2Path}" ` +
      `-filter_complex ` +
      `"[0:v][1:v]xfade=transition=${transitionType}:duration=${duration}:offset=0[v];` +
      `[0:a][1:a]acrossfade=d=${duration}[a]" ` +
      `-map "[v]" -map "[a]" ` +
      `-c:v libx264 -c:a aac -preset fast -y "${outputPath}"`,
    { timeout: 120000 },
  );

  logger.info(`Transition (${transitionType}) added: ${outputPath}`);
}

/**
 * Renders the final export with all effects applied.
 * Composes the complete clip with specified resolution and quality.
 */
export async function renderFinalExport(
  inputPath: string,
  outputPath: string,
  resolution: string = '1080x1920',
  quality: string = 'high',
): Promise<void> {
  const [width, height] = resolution.split('x').map(Number);

  // Quality presets mapping to CRF values
  const crfMap: Record<string, number> = {
    low: 28,
    medium: 23,
    high: 18,
    ultra: 14,
  };

  const crf = crfMap[quality] || 18;

  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black" ` +
      `-c:v libx264 -crf ${crf} -preset slow ` +
      `-c:a aac -b:a 192k ` +
      `-movflags +faststart ` +
      `-y "${outputPath}"`,
    { timeout: 600000 }, // 10 minutes for final render
  );

  logger.info(`Final export rendered: ${outputPath} (${resolution}, ${quality})`);
}

/**
 * Gets video duration and metadata using ffprobe.
 */
export async function getVideoInfo(
  filePath: string,
): Promise<{ duration: number; width: number; height: number; fps: number }> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate ` +
      `-of json "${filePath}"`,
  );

  const data = JSON.parse(stdout);
  const stream = data.streams?.[0] || {};
  const fpsStr = stream.r_frame_rate || '30/1';
  const [fpsNum, fpsDen] = fpsStr.split('/').map(Number);

  return {
    duration: parseFloat(data.format?.duration || '0'),
    width: stream.width || 1920,
    height: stream.height || 1080,
    fps: fpsDen ? fpsNum / fpsDen : 30,
  };
}

/**
 * Extracts frames from a video at specified intervals.
 * Used for AI scene analysis.
 */
export async function extractFrames(
  inputPath: string,
  outputDir: string,
  interval: number = 1, // Extract one frame per N seconds
): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });

  const outputPattern = path.join(outputDir, 'frame_%04d.jpg');

  await execAsync(
    `ffmpeg -i "${inputPath}" -vf "fps=1/${interval}" -q:v 2 "${outputPattern}" -y`,
    { timeout: 600000 },
  );

  // List extracted frames
  const files = await fs.readdir(outputDir);
  const frames = files
    .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
    .sort()
    .map((f) => path.join(outputDir, f));

  logger.info(`Extracted ${frames.length} frames from ${inputPath}`);
  return frames;
}

/**
 * Applies a camera shake effect using the crop filter and sin/cos waves.
 */
export async function applyCameraShake(
  inputPath: string,
  outputPath: string,
  intensity: number = 0.05,
): Promise<void> {
  const cropW = `iw*(1-${intensity * 2})`;
  const cropH = `ih*(1-${intensity * 2})`;
  const xExp = `(iw-${cropW})/2+((iw-${cropW})/2)*sin(t*15)`;
  const yExp = `(ih-${cropH})/2+((ih-${cropH})/2)*cos(t*10)`;

  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "crop=${cropW}:${cropH}:${xExp}:${yExp},scale=iw:ih" ` +
      `-c:v libx264 -c:a copy -preset fast -y "${outputPath}"`,
    { timeout: 180000 },
  );

  logger.info(`Camera shake applied: ${outputPath}`);
}

/**
 * Applies a white flash transition (often used in edits like Phonk).
 */
export async function applyFlashTransition(
  inputPath: string,
  outputPath: string,
  duration: number = 0.3,
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "fade=t=in:st=0:d=${duration}:color=white" ` +
      `-c:v libx264 -c:a copy -preset fast -y "${outputPath}"`,
    { timeout: 180000 },
  );
  logger.info(`Flash transition applied: ${outputPath}`);
}

/**
 * Generates an Advanced SubStation Alpha (.ass) file with Karaoke styling.
 */
export async function generateAssSubtitles(
  words: Array<{ word: string; start: number; end: number }>,
  assFilePath: string,
): Promise<void> {
  const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,100,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,10,10,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatTime = (seconds: number) => {
    const d = new Date(seconds * 1000);
    const h = String(d.getUTCHours()).padStart(1, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0').slice(0, 2);
    return `${h}:${m}:${s}.${ms}`;
  };

  let events = '';
  // Group words into phrases (e.g. 5 words per phrase)
  const chunkSize = 5;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    const start = formatTime(chunk[0].start);
    const end = formatTime(chunk[chunk.length - 1].end);
    
    let text = '';
    for (const w of chunk) {
      const durationMs = Math.floor((w.end - w.start) * 1000 / 10);
      // {\k<duration>} is the karaoke effect tag in ASS
      text += `{\\k${durationMs}}${w.word} `;
    }
    
    events += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text.trim()}\n`;
  }

  await fs.writeFile(assFilePath, assHeader + events, 'utf-8');
  logger.info(`Generated ASS subtitles: ${assFilePath}`);
}

/**
 * Burns ASS subtitles into the video.
 */
export async function addAssCaptions(
  inputPath: string,
  assFilePath: string,
  outputPath: string,
): Promise<void> {
  // ffmpeg requires absolute paths for ASS filters, and needs escaping
  const escapedAssPath = assFilePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  
  await execAsync(
    `ffmpeg -i "${inputPath}" ` +
      `-vf "ass='${escapedAssPath}'" ` +
      `-c:v libx264 -c:a copy -preset fast -y "${outputPath}"`,
    { timeout: 180000 },
  );
  logger.info(`ASS Captions burned into video: ${outputPath}`);
}

