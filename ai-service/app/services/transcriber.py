# =============================================================================
# Transcriber Service
# =============================================================================
# Speech-to-text using faster-whisper (local) or OpenAI Whisper API.
# =============================================================================

import asyncio
from typing import Dict, Any
from loguru import logger
from app.config import settings


async def transcribe_audio(audio_path: str) -> Dict[str, Any]:
    """
    Transcribes audio to text with timestamps.

    Uses faster-whisper for local processing or OpenAI Whisper API
    based on the WHISPER_MODE configuration.

    Args:
        audio_path: Path to the audio file (WAV format preferred).

    Returns:
        Dictionary with full text, timed segments, and detected language.
    """
    if settings.whisper_mode == "api":
        return await _transcribe_with_api(audio_path)
    else:
        return await asyncio.to_thread(_transcribe_local, audio_path)


def _transcribe_local(audio_path: str) -> Dict[str, Any]:
    """Transcribes using faster-whisper (local model)."""
    try:
        from faster_whisper import WhisperModel

        logger.info(f"Loading Whisper model ({settings.whisper_model_size})...")
        model = WhisperModel(
            settings.whisper_model_size,
            device="cpu",
            compute_type="int8",
        )

        segments_gen, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
        )

        segments = []
        full_text = []

        for segment in segments_gen:
            words = []
            if hasattr(segment, 'words') and segment.words:
                for word in segment.words:
                    words.append({
                        "start": round(word.start, 2),
                        "end": round(word.end, 2),
                        "word": word.word.strip(),
                    })

            segments.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
                "confidence": round(segment.avg_logprob, 4) if segment.avg_logprob else 0.0,
                "words": words,
            })
            full_text.append(segment.text.strip())

        result = {
            "text": " ".join(full_text),
            "segments": segments,
            "language": info.language or "en",
        }

        logger.info(f"Transcribed {len(segments)} segments, language: {result['language']}")
        return result

    except ImportError:
        logger.warning("faster-whisper not available, returning empty transcript")
        return {"text": "", "segments": [], "language": "en"}
    except Exception as e:
        logger.error(f"Local transcription error: {e}")
        return {"text": "", "segments": [], "language": "en"}


async def _transcribe_with_api(audio_path: str) -> Dict[str, Any]:
    """Transcribes using OpenAI Whisper API."""
    try:
        import openai

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        with open(audio_path, "rb") as audio_file:
            # Use the verbose_json format to get word-level timestamps
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"],
            )

        segments = []
        if hasattr(response, 'segments') and response.segments:
            for seg in response.segments:
                segments.append({
                    "start": round(seg.get("start", 0), 2),
                    "end": round(seg.get("end", 0), 2),
                    "text": seg.get("text", "").strip(),
                    "confidence": round(seg.get("avg_logprob", 0), 4),
                    "words": seg.get("words", []),
                })

        return {
            "text": response.text if hasattr(response, 'text') else str(response),
            "segments": segments,
            "language": getattr(response, 'language', 'en'),
        }

    except Exception as e:
        logger.error(f"API transcription error: {e}")
        return {"text": "", "segments": [], "language": "en"}
