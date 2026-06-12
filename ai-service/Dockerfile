# =============================================================================
# AI Service Dockerfile - Python FastAPI Microservice
# =============================================================================

# --- Stage: Base with system deps ---
FROM python:3.11-slim AS base

# Install system dependencies: FFmpeg, build tools for ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Stage: Development ---
FROM base AS dev
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    rm -rf /usr/local/lib/python3.11/site-packages/nvidia/
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- Stage: Production Builder ---
FROM base AS builder
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    rm -rf /usr/local/lib/python3.11/site-packages/nvidia/

# --- Stage: Production Runner ---
FROM base AS runner

# Create non-root user
RUN groupadd --system appuser && useradd --system -g appuser appuser

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Create storage directories
RUN mkdir -p /app/storage /app/models && \
    chown -R appuser:appuser /app

COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

# Use multiple workers in production for better throughput
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
