# =============================================================================
# Content Generator Service
# =============================================================================
# Uses LLM to generate AI-powered content: titles, hashtags, descriptions,
# and thumbnail suggestions for sports video clips.
# =============================================================================

import asyncio
import json
from typing import Any, Dict
from loguru import logger
from app.config import settings


# Content generation prompts
PROMPTS = {
    "title": """Generate 5 catchy, viral YouTube Shorts titles for a sports video.
The titles should be:
- Under 60 characters each
- Include relevant emojis
- Use power words that drive clicks
- Be specific to the sport and action described

Context: {context}

Return as JSON: {{"titles": ["title1", "title2", ...]}}""",

    "hashtags": """Generate 15-20 relevant hashtags for a sports YouTube Short.
Include a mix of:
- High-traffic general sports hashtags
- Sport-specific hashtags
- Trending hashtags
- Niche hashtags for reach

Context: {context}

Return as JSON: {{"hashtags": ["#hashtag1", "#hashtag2", ...]}}""",

    "description": """Write an engaging YouTube Shorts description for a sports video.
Include:
- A hook in the first line
- Brief description of the highlights
- Call to action (subscribe, like)
- Relevant hashtags at the end
- Under 200 words

Context: {context}

Return as JSON: {{"description": "full description text"}}""",

    "thumbnail_suggestion": """Suggest the best thumbnail for a sports YouTube Short.
Describe:
- The ideal frame/moment to capture
- Text overlay suggestions (max 3-4 words)
- Color treatment (brightness, contrast)
- Composition tips

Context: {context}

Return as JSON: {{"suggestion": "detailed thumbnail description", "text_overlay": "SHORT TEXT", "timestamp": 0.0}}""",
}


async def generate_content(content_type: str, context: Dict[str, Any]) -> Any:
    """
    Generates AI content based on the specified type.

    Args:
        content_type: Type of content to generate (title, hashtags, description, thumbnail_suggestion).
        context: Context dictionary with video information.

    Returns:
        Generated content (string or list depending on type).
    """
    prompt_template = PROMPTS.get(content_type)
    if not prompt_template:
        raise ValueError(f"Unknown content type: {content_type}")

    # Format context for prompt
    context_str = json.dumps(context, indent=2, default=str)
    prompt = prompt_template.format(context=context_str)

    if settings.ai_provider == "gemini":
        return await _generate_with_gemini(prompt, content_type)
    else:
        return await _generate_with_openai(prompt, content_type)


async def _generate_with_gemini(prompt: str, content_type: str) -> Any:
    """Generates content using Google Gemini."""
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)

        response = await asyncio.to_thread(
            model.generate_content,
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        result = json.loads(response.text)
        return _extract_result(result, content_type)

    except Exception as e:
        logger.error(f"Gemini content generation error: {e}")
        return _fallback_content(content_type)


async def _generate_with_openai(prompt: str, content_type: str) -> Any:
    """Generates content using OpenAI."""
    try:
        import openai

        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1000,
        )

        result = json.loads(response.choices[0].message.content)
        return _extract_result(result, content_type)

    except Exception as e:
        logger.error(f"OpenAI content generation error: {e}")
        return _fallback_content(content_type)


def _extract_result(result: dict, content_type: str) -> Any:
    """Extracts the relevant field from the LLM response."""
    if content_type == "title":
        return result.get("titles", ["Sports Highlight"])
    elif content_type == "hashtags":
        return result.get("hashtags", ["#sports", "#highlights"])
    elif content_type == "description":
        return result.get("description", "Check out this amazing sports moment!")
    elif content_type == "thumbnail_suggestion":
        return result.get("suggestion", "Use the most action-packed frame")
    return result


def _fallback_content(content_type: str) -> Any:
    """Fallback content when AI generation fails."""
    fallbacks = {
        "title": ["🔥 Amazing Sports Moment!", "😱 You Won't Believe This Play!"],
        "hashtags": ["#sports", "#highlights", "#viral", "#shorts", "#amazing"],
        "description": "Check out this incredible sports moment! 🏆 Like & Subscribe for more!",
        "thumbnail_suggestion": "Select the frame with the most dramatic action",
    }
    return fallbacks.get(content_type, "")
