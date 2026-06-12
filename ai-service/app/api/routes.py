# =============================================================================
# API Routes - AI Service Endpoints
# =============================================================================
# All AI processing endpoints. Each route delegates to a specialized service.
# =============================================================================

from fastapi import APIRouter, HTTPException
from loguru import logger

from app.api.schemas import (
    ExtractFramesRequest, FrameExtractionResponse,
    DetectScenesRequest, SceneDetectionResponse,
    TranscribeRequest, TranscriptionResponse,
    DetectActionsRequest, ActionDetectionResponse,
    AnalyzeScenesRequest, SceneAnalysisResponse,
    AnalyzeAudioRequest, AudioAnalysisResponse,
    GenerateContentRequest, ContentGenerationResponse,
)
from app.services.scene_detector import detect_scenes
from app.services.transcriber import transcribe_audio
from app.services.action_detector import detect_actions
from app.services.scene_analyzer import analyze_scenes
from app.services.audio_analyzer import analyze_audio
from app.services.content_generator import generate_content
from app.utils.frame_extractor import extract_frames

router = APIRouter()


@router.post("/extract-frames", response_model=FrameExtractionResponse)
async def extract_frames_endpoint(request: ExtractFramesRequest):
    """Extracts key frames from a video at specified intervals."""
    try:
        logger.info(f"Extracting frames from {request.video_path} (interval={request.interval}s)")
        frames = await extract_frames(request.video_path, request.interval)
        return FrameExtractionResponse(frames=frames, count=len(frames))
    except Exception as e:
        logger.error(f"Frame extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-scenes", response_model=SceneDetectionResponse)
async def detect_scenes_endpoint(request: DetectScenesRequest):
    """Detects scene boundaries using PySceneDetect."""
    try:
        logger.info(f"Detecting scenes in {request.video_path}")
        scenes = await detect_scenes(request.video_path, request.threshold)
        return SceneDetectionResponse(scenes=scenes)
    except Exception as e:
        logger.error(f"Scene detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_endpoint(request: TranscribeRequest):
    """Transcribes audio using Whisper."""
    try:
        logger.info(f"Transcribing {request.audio_path}")
        result = await transcribe_audio(request.audio_path)
        return result
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-actions", response_model=ActionDetectionResponse)
async def detect_actions_endpoint(request: DetectActionsRequest):
    """Detects sports actions in video frames using YOLO."""
    try:
        logger.info(f"Detecting actions in {len(request.frame_paths)} frames")
        detections = await detect_actions(request.frame_paths, request.video_path)
        return ActionDetectionResponse(detections=detections)
    except Exception as e:
        logger.error(f"Action detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-scenes", response_model=SceneAnalysisResponse)
async def analyze_scenes_endpoint(request: AnalyzeScenesRequest):
    """Analyzes scenes with LLM to identify and score exciting moments."""
    try:
        logger.info(f"Analyzing {len(request.frame_paths)} frames with LLM")
        moments = await analyze_scenes(
            request.frame_paths,
            request.transcript,
            request.scenes,
        )
        return SceneAnalysisResponse(moments=moments)
    except Exception as e:
        logger.error(f"Scene analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-audio", response_model=AudioAnalysisResponse)
async def analyze_audio_endpoint(request: AnalyzeAudioRequest):
    """Analyzes audio for beat detection and energy levels."""
    try:
        logger.info(f"Analyzing audio: {request.audio_path}")
        result = await analyze_audio(request.audio_path)
        return result
    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-content", response_model=ContentGenerationResponse)
async def generate_content_endpoint(request: GenerateContentRequest):
    """Generates AI content: titles, hashtags, descriptions."""
    try:
        logger.info(f"Generating content: {request.type}")
        result = await generate_content(request.type, request.context)
        return ContentGenerationResponse(result=result)
    except Exception as e:
        logger.error(f"Content generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
