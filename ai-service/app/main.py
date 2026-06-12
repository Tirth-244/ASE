# =============================================================================
# AI Service - FastAPI Application Entry Point
# =============================================================================
# Initializes the FastAPI app with CORS, API key auth, and all routes.
# =============================================================================

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from loguru import logger
import sys

from app.config import settings
from app.api.routes import router


# ---------- Logging Setup ----------
logger.remove()
logger.add(
    sys.stdout,
    level=settings.log_level.upper(),
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>",
)


# ---------- Lifespan Events ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for model preloading."""
    logger.info("🚀 AI Sports Editor - AI Service starting...")
    logger.info(f"AI Provider: {settings.ai_provider}")
    logger.info(f"Whisper Mode: {settings.whisper_mode} ({settings.whisper_model_size})")
    yield
    logger.info("AI Service shutting down...")


# ---------- App Initialization ----------
app = FastAPI(
    title="AI Sports Editor - AI Service",
    description="Python microservice for AI-powered sports video analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (backend service calls this internally)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- API Key Authentication ----------
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Depends(api_key_header)):
    """Verifies the internal API key for service-to-service auth."""
    if api_key != settings.ai_service_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


# ---------- Routes ----------
app.include_router(router, prefix="/api/v1", dependencies=[Depends(verify_api_key)])


# ---------- Health Check ----------
@app.get("/health")
async def health_check():
    """Health check endpoint (no auth required)."""
    return {
        "status": "healthy",
        "service": "ai-sports-editor-ai-service",
        "ai_provider": settings.ai_provider,
        "whisper_mode": settings.whisper_mode,
    }
