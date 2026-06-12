# =============================================================================
# API Schemas - Request/Response Models
# =============================================================================
# Pydantic models for validating API requests and formatting responses.
# =============================================================================

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ---------- Request Models ----------

class ExtractFramesRequest(BaseModel):
    """Request to extract frames from a video."""
    video_path: str = Field(..., description="Path to the video file")
    interval: float = Field(2.0, description="Extract one frame every N seconds")


class DetectScenesRequest(BaseModel):
    """Request to detect scene boundaries."""
    video_path: str = Field(..., description="Path to the video file")
    threshold: float = Field(27.0, description="Content detection threshold")


class TranscribeRequest(BaseModel):
    """Request to transcribe audio."""
    audio_path: str = Field(..., description="Path to the audio file (WAV)")


class DetectActionsRequest(BaseModel):
    """Request to detect sports actions in frames."""
    frame_paths: List[str] = Field(..., description="Paths to extracted frames")
    video_path: str = Field(..., description="Path to the source video")


class AnalyzeScenesRequest(BaseModel):
    """Request to analyze scenes with LLM for moment scoring."""
    frame_paths: List[str] = Field(..., description="Paths to key frames")
    transcript: str = Field("", description="Full transcript text")
    scenes: List[Dict[str, float]] = Field(default_factory=list, description="Scene boundaries")


class AnalyzeAudioRequest(BaseModel):
    """Request to analyze audio for beat detection."""
    audio_path: str = Field(..., description="Path to the audio file")


class GenerateContentRequest(BaseModel):
    """Request to generate AI content (title, hashtags, etc.)."""
    type: str = Field(..., description="Content type: title, hashtags, description, thumbnail_suggestion")
    context: Dict[str, Any] = Field(default_factory=dict, description="Context for generation")


# ---------- Response Models ----------

class FrameExtractionResponse(BaseModel):
    """Response with extracted frame paths."""
    frames: List[str]
    count: int


class SceneDetectionResponse(BaseModel):
    """Response with detected scene boundaries."""
    scenes: List[Dict[str, float]]


class TranscriptionSegment(BaseModel):
    """A single transcription segment with timing."""
    start: float
    end: float
    text: str
    confidence: float = 0.0


class TranscriptionResponse(BaseModel):
    """Response with transcription results."""
    text: str
    segments: List[TranscriptionSegment]
    language: str


class ActionDetection(BaseModel):
    """A single action detection result."""
    label: str
    confidence: float
    bbox: List[float]


class FrameDetection(BaseModel):
    """Action detections for a single frame."""
    frame_index: int
    timestamp: float
    actions: List[ActionDetection]


class ActionDetectionResponse(BaseModel):
    """Response with action detection results."""
    detections: List[FrameDetection]


class MomentResult(BaseModel):
    """A detected exciting moment."""
    type: str
    start_time: float
    end_time: float
    score: float
    confidence: float
    description: str


class SceneAnalysisResponse(BaseModel):
    """Response with moment analysis results."""
    moments: List[MomentResult]


class AudioAnalysisResponse(BaseModel):
    """Response with audio analysis results."""
    beats: List[float]
    energy: List[Dict[str, float]]
    tempo: float


class ContentGenerationResponse(BaseModel):
    """Response with generated content."""
    result: Any
