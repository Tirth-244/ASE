# =============================================================================
# Scene Detector Service
# =============================================================================
# Detects scene boundaries using PySceneDetect's content-aware algorithm.
# =============================================================================

import asyncio
from typing import List, Dict
from loguru import logger


async def detect_scenes(
    video_path: str,
    threshold: float = 27.0,
) -> List[Dict[str, float]]:
    """
    Detects scene boundaries in a video using PySceneDetect.

    Args:
        video_path: Path to the input video file.
        threshold: Content detection sensitivity (lower = more scenes detected).

    Returns:
        List of scene dictionaries with start, end, and duration in seconds.
    """
    # Run in thread pool to avoid blocking the event loop
    return await asyncio.to_thread(_detect_scenes_sync, video_path, threshold)


def _detect_scenes_sync(video_path: str, threshold: float) -> List[Dict[str, float]]:
    """Synchronous scene detection implementation."""
    try:
        from scenedetect import detect, ContentDetector

        scene_list = detect(video_path, ContentDetector(threshold=threshold))

        scenes = []
        for scene in scene_list:
            start_time = scene[0].get_seconds()
            end_time = scene[1].get_seconds()
            scenes.append({
                "start": round(start_time, 2),
                "end": round(end_time, 2),
                "duration": round(end_time - start_time, 2),
            })

        logger.info(f"Detected {len(scenes)} scenes in {video_path}")
        return scenes

    except ImportError:
        logger.warning("PySceneDetect not available, using fallback segmentation")
        return _fallback_segmentation(video_path)
    except Exception as e:
        logger.error(f"Scene detection error: {e}")
        return _fallback_segmentation(video_path)


def _fallback_segmentation(video_path: str) -> List[Dict[str, float]]:
    """
    Fallback: splits video into fixed-length segments when PySceneDetect fails.
    Creates 10-second segments as a reasonable default.
    """
    try:
        import subprocess
        import json

        # Get video duration using ffprobe
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", video_path],
            capture_output=True, text=True,
        )
        data = json.loads(result.stdout)
        duration = float(data["format"]["duration"])

        segment_length = 10.0
        scenes = []
        current = 0.0

        while current < duration:
            end = min(current + segment_length, duration)
            scenes.append({
                "start": round(current, 2),
                "end": round(end, 2),
                "duration": round(end - current, 2),
            })
            current = end

        logger.info(f"Fallback segmentation: {len(scenes)} segments")
        return scenes

    except Exception as e:
        logger.error(f"Fallback segmentation failed: {e}")
        return []
