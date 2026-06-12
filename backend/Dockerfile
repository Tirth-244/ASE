# =============================================================================
# Backend Dockerfile - Express API Server
# =============================================================================

# --- Stage: Dependencies ---
FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# --- Stage: Development ---
FROM node:20 AS dev
WORKDIR /app

# Install FFmpeg and yt-dlp for video processing
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip && \
    rm -rf /var/lib/apt/lists/* && \
    pip3 install --break-system-packages yt-dlp

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000
CMD ["npx", "tsx", "watch", "src/index.ts"]

# --- Stage: Builder ---
FROM node:20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate && npm run build

# --- Stage: Production Runner ---
FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install FFmpeg and yt-dlp (required at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip wget && \
    rm -rf /var/lib/apt/lists/* && \
    pip3 install --break-system-packages yt-dlp

# Create non-root user
RUN groupadd --system --gid 1001 appuser && \
    useradd --system --uid 1001 -g appuser appuser

# Create storage directories
RUN mkdir -p /app/storage/videos /app/storage/exports /app/storage/temp && \
    chown -R appuser:appuser /app/storage

# Copy production dependencies and built code
COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=appuser:appuser /app/prisma ./prisma
COPY --chown=appuser:appuser package.json ./

USER appuser

EXPOSE 4000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
