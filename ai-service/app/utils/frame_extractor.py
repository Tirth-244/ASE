# =============================================================================
# Frame Extractor Utility
# =============================================================================
# Extracts key frames from videos using FFmpeg subprocess.
# =============================================================================

import asyncio
import subprocess
import os
from typing import List
from pathlib import Path
from loguru import logger


async def extract_frames(
    video_path: str,
    interval: float = 2.0,
) -> List[str]:
    """
    Extracts frames from a video at specified time intervals.

    Uses FFmpeg to extract one frame every N seconds, saving as JPEG.
    Runs in a thread pool to avoid blocking the async event loop.

    Args:
        video_path: Path to the input video file.
        interval: Time between extracted frames in seconds.

    Returns:
        Sorted list of paths to the extracted frame images.
    """
    return await asyncio.to_thread(_extract_frames_sync, video_path, interval)


def _extract_frames_sync(video_path: str, interval: float) -> List[str]:
    """Synchronous frame extraction using FFmpeg."""
    # Create output directory next to the video
    video_dir = os.path.dirname(video_path)
    video_name = os.path.splitext(os.path.basename(video_path))[0]
    output_dir = os.path.join(video_dir, f"{video_name}_frames")
    os.makedirs(output_dir, exist_ok=True)

    output_pattern = os.path.join(output_dir, "frame_%04d.jpg")

    try:
        # Run FFmpeg to extract frames
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vf", f"fps=1/{interval}",
            "-q:v", "2",  # High quality JPEG
            output_pattern,
            "-y",  # Overwrite existing files
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
        )

        if result.returncode != 0:
            logger.warning(f"FFmpeg warning: {result.stderr[:500]}")

        # Collect extracted frame paths
        frames = sorted([
            os.path.join(output_dir, f)
            for f in os.listdir(output_dir)
            if f.startswith("frame_") and f.endswith(".jpg")
        ])

        logger.info(f"Extracted {len(frames)} frames from {video_path}")
        return frames

    except subprocess.TimeoutExpired:
        logger.error("Frame extraction timed out")
        return []
    except Exception as e:
        logger.error(f"Frame extraction error: {e}")
        return []
