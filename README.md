# 🏟️ AI Sports Editor

A production-ready, full-stack AI web application for transforming sports videos into viral YouTube Shorts. Powered by AI scene detection, smart clip generation, and professional editing tools.

## Architecture

```
Frontend (Next.js 14) → Backend (Express) → AI Service (FastAPI)
                              ↓                    ↓
                         PostgreSQL           YOLO + Whisper
                         Redis/BullMQ         PySceneDetect
                                              Gemini/OpenAI
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion, Zustand |
| Backend API | Node.js, Express, TypeScript, Prisma ORM |
| AI Service | Python, FastAPI, YOLOv8, Whisper, PySceneDetect |
| Database | PostgreSQL 16 |
| Queue | Redis 7, BullMQ |
| Video | FFmpeg, yt-dlp |
| AI Models | Google Gemini / OpenAI GPT-4o |
| Infrastructure | Docker, Docker Compose, Nginx |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- API key for Gemini or OpenAI

### 1. Clone and Configure

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 2. Development Mode

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- AI Service: http://localhost:8000

### 3. Production Mode

```bash
docker compose up --build -d
```

Application available at http://localhost

## Project Structure

```
video_editor/
├── frontend/          # Next.js 14 application
├── backend/           # Express API + BullMQ workers
├── ai-service/        # Python FastAPI microservice
├── nginx/             # Reverse proxy configuration
├── docker-compose.yml # Production orchestration
└── docker-compose.dev.yml # Development overrides
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/projects | Create project from YouTube URL |
| GET | /api/projects | List projects |
| POST | /api/projects/:id/analyze | Start AI analysis |
| POST | /api/projects/:id/clips | Generate clips |
| POST | /api/clips/:id/export | Export clip |
| GET | /api/exports | Export history |

## Features

- ✅ YouTube URL input with metadata fetching
- ✅ AI-powered scene detection (PySceneDetect)
- ✅ Speech-to-text transcription (Whisper)
- ✅ Sports action detection (YOLOv8)
- ✅ Moment scoring with LLM (Gemini/OpenAI)
- ✅ Smart clip generation (15s, 30s, 60s presets)
- ✅ Video effects (crop, zoom, slow-mo, captions)
- ✅ Timeline editor with drag-and-drop
- ✅ 1080x1920 YouTube Shorts export
- ✅ Real-time progress via SSE
- ✅ AI title, hashtag, and description generation
- ✅ Dark theme with glassmorphism UI
- ✅ Mobile responsive design
- ✅ JWT authentication
- ✅ Docker deployment

## Environment Variables

See `.env.example` for all required configuration.

## License

MIT
