# =============================================================================
# Audio Analyzer Service
# =============================================================================
# Analyzes audio using librosa for beat detection, energy levels, and tempo.
# Used to synchronize highlights with music beat drops.
# =============================================================================

import asyncio
from typing import Dict, Any
from loguru import logger


async def analyze_audio(audio_path: str) -> Dict[str, Any]:
    """
    Analyzes audio for beat detection and energy levels.

    Uses librosa to extract:
    - Beat timestamps for music synchronization
    - Energy levels over time for dynamic editing
    - Overall tempo (BPM) for rhythm matching

    Args:
        audio_path: Path to the audio file.

    Returns:
        Dictionary with beats, energy levels, and tempo.
    """
    return await asyncio.to_thread(_analyze_audio_sync, audio_path)


def _analyze_audio_sync(audio_path: str) -> Dict[str, Any]:
    """Synchronous audio analysis implementation."""
    try:
        import librosa
        import numpy as np

        logger.info(f"Loading audio: {audio_path}")

        # Load audio file
        y, sr = librosa.load(audio_path, sr=22050, mono=True)

        # Beat detection
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        # Energy (RMS) over time
        rms = librosa.feature.rms(y=y)[0]
        rms_times = librosa.frames_to_time(range(len(rms)), sr=sr)

        # Normalize energy to 0-1 range
        rms_normalized = rms / (rms.max() + 1e-8)

        # Sample energy at 1-second intervals for efficiency
        energy_levels = []
        for t in range(0, int(rms_times[-1]), 1):
            idx = int(t * len(rms) / rms_times[-1])
            if idx < len(rms_normalized):
                energy_levels.append({
                    "time": float(t),
                    "level": round(float(rms_normalized[idx]), 4),
                })

        result = {
            "beats": [round(float(b), 3) for b in beat_times],
            "energy": energy_levels,
            "tempo": round(float(tempo) if not isinstance(tempo, np.ndarray) else float(tempo[0]), 1),
        }

        logger.info(
            f"Audio analysis complete: {len(result['beats'])} beats, "
            f"tempo={result['tempo']} BPM"
        )
        return result

    except ImportError:
        logger.warning("librosa not available, returning empty analysis")
        return {"beats": [], "energy": [], "tempo": 120.0}
    except Exception as e:
        logger.error(f"Audio analysis error: {e}")
        return {"beats": [], "energy": [], "tempo": 120.0}
