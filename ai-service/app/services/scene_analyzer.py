# =============================================================================
# Scene Analyzer Service
# =============================================================================
# Uses LLM (Gemini or OpenAI) to analyze video scenes and score moments.
# Combines visual analysis of frames with transcript context.
# =============================================================================

import asyncio
import base64
import json
from pathlib import Path
from typing import List, Dict, Any
from loguru import logger
from app.config import settings


# System prompt for the LLM scene analysis
ANALYSIS_PROMPT = """You are an expert sports video analyst. Analyze the provided video frames and transcript to identify exciting moments in this sports video.

For each exciting moment you identify, classify it as one of these types:
- GOAL: A goal is scored
- SKILL: Impressive technical skill (dribble, trick, pass)
- CELEBRATION: Players celebrating
- CROWD_REACTION: Crowd going wild
- FUNNY_MOMENT: Humorous or unexpected moment
- LAST_MINUTE_ACTION: Dramatic action in final minutes
- SAVE: Goalkeeper or defensive save
- HIGHLIGHT: General highlight moment

For each moment, provide:
1. type: The moment type from the list above
2. start_time: Estimated start time in seconds
3. end_time: Estimated end time in seconds
4. score: Excitement score from 0.0 to 1.0 (1.0 = most exciting). Calculate using weighted formula: 0.30 * audio_peak + 0.20 * speech_excitement + 0.15 * motion + 0.15 * scene_change + 0.10 * OCR + 0.10 * AI_semantics. Prioritize these keywords: Goal, Amazing, Incredible, What a save, Six, Four, Wicket, Knockout, Penalty, Champion, Final, Hat-trick, Winner, Record, Last over, Last minute.
5. confidence: Your confidence in this detection from 0.0 to 1.0
6. description: A brief, engaging description of what happens

Respond with a JSON object containing a "moments" array. Example:
{
  "moments": [
    {
      "type": "GOAL",
      "start_time": 45.0,
      "end_time": 55.0,
      "score": 0.95,
      "confidence": 0.85,
      "description": "Spectacular long-range goal from outside the box"
    }
  ]
}

Focus on the most exciting 5-15 moments. Be selective — only high-quality moments."""


async def analyze_scenes(
    frame_paths: List[str],
    transcript: str,
    scenes: List[Dict[str, float]],
) -> List[Dict[str, Any]]:
    """
    Analyzes video scenes using LLM to identify and score exciting moments.

    Sends key frames and transcript to the configured AI provider
    for multimodal analysis.

    Args:
        frame_paths: Paths to extracted key frames (sent as images to LLM).
        transcript: Full transcript text for context.
        scenes: Scene boundary information.

    Returns:
        List of detected moments with type, timing, score, and description.
    """
    if settings.ai_provider == "gemini":
        return await _analyze_with_gemini(frame_paths, transcript, scenes)
    else:
        return await _analyze_with_openai(frame_paths, transcript, scenes)


async def _analyze_with_gemini(
    frame_paths: List[str],
    transcript: str,
    scenes: List[Dict[str, float]],
) -> List[Dict[str, Any]]:
    """Analyzes scenes using Google Gemini."""
    try:
        import google.generativeai as genai
        from PIL import Image

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)

        # Prepare content with images and text
        content = [ANALYSIS_PROMPT]

        # Add scene information
        if scenes:
            content.append(f"\nScene boundaries: {json.dumps(scenes[:20])}")

        # Add transcript
        if transcript:
            content.append(f"\nTranscript excerpt:\n{transcript[:3000]}")

        # Add frames (limit to 10 for API limits)
        selected_frames = frame_paths[:10]
        for frame_path in selected_frames:
            try:
                img = Image.open(frame_path)
                content.append(img)
            except Exception as e:
                logger.warning(f"Failed to load frame {frame_path}: {e}")

        # Generate analysis
        response = await asyncio.to_thread(
            model.generate_content,
            content,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        # Parse response
        result = json.loads(response.text)
        moments = result.get("moments", [])
        
        if len(moments) < 4:
            logger.warning(f"Gemini only found {len(moments)} moments. Triggering fallback.")
            return _fallback_moments(scenes)

        logger.info(f"Gemini identified {len(moments)} moments")
        return moments

    except Exception as e:
        logger.error(f"Gemini analysis error: {e}")
        return _fallback_moments(scenes)


async def _analyze_with_openai(
    frame_paths: List[str],
    transcript: str,
    scenes: List[Dict[str, float]],
) -> List[Dict[str, Any]]:
    """Analyzes scenes using OpenAI GPT-4 Vision."""
    try:
        import openai

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        # Build message content with images
        content = [{"type": "text", "text": ANALYSIS_PROMPT}]

        if scenes:
            content.append({
                "type": "text",
                "text": f"\nScene boundaries: {json.dumps(scenes[:20])}",
            })

        if transcript:
            content.append({
                "type": "text",
                "text": f"\nTranscript excerpt:\n{transcript[:3000]}",
            })

        # Add frames as base64 images (limit to 8 for token limits)
        selected_frames = frame_paths[:8]
        for frame_path in selected_frames:
            try:
                with open(frame_path, "rb") as f:
                    img_base64 = base64.b64encode(f.read()).decode("utf-8")
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img_base64}",
                        "detail": "low",
                    },
                })
            except Exception as e:
                logger.warning(f"Failed to encode frame {frame_path}: {e}")

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=4000,
        )

        result = json.loads(response.choices[0].message.content)
        moments = result.get("moments", [])

        if len(moments) < 4:
            logger.warning(f"OpenAI only found {len(moments)} moments. Triggering fallback.")
            return _fallback_moments(scenes)

        logger.info(f"OpenAI identified {len(moments)} moments")
        return moments

    except Exception as e:
        logger.error(f"OpenAI analysis error: {e}")
        return _fallback_moments(scenes)


def _fallback_moments(scenes: List[Dict[str, float]]) -> List[Dict[str, Any]]:
    """
    Fallback: creates generic highlight moments from scene boundaries
    when LLM analysis fails or finds too few clips.
    """
    moments = []
    
    # If no scenes are provided, create 4 generic chunks
    if not scenes or len(scenes) == 0:
        for i in range(4):
            start = i * 15.0
            moments.append({
                "type": "HIGHLIGHT",
                "start_time": start,
                "end_time": start + 10.0,
                "score": 0.5,
                "confidence": 0.3,
                "description": f"Fallback Highlight {i + 1}"
            })
        return moments

    for i, scene in enumerate(scenes[:10]):
        moments.append({
            "type": "HIGHLIGHT",
            "start_time": scene["start"],
            "end_time": scene["end"],
            "score": max(0.3, 1.0 - (i * 0.08)),
            "confidence": 0.3,
            "description": f"Scene {i + 1} - potential highlight moment",
        })
        
    # Ensure at least 4 moments are returned if we have scenes
    while len(moments) < 4:
        moments.append({
            "type": "HIGHLIGHT",
            "start_time": 0.0,
            "end_time": 5.0,
            "score": 0.3,
            "confidence": 0.1,
            "description": f"Extra Fallback {len(moments) + 1}"
        })
        
    return moments
