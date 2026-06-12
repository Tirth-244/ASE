// =============================================================================
// Server Entry Point
// =============================================================================
// Bootstraps the Express server with all middleware, routes, queue workers,
// SSE endpoints, and graceful shutdown handling.
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

// Patch BigInt serialization for JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { disconnectRedis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import routes from './routes';
import { closeQueues } from './queues';
import { startAnalysisWorker } from './queues/workers/analysis.worker';
import { startClipWorker } from './queues/workers/clip.worker';
import { startExportWorker } from './queues/workers/export.worker';

const app = express();
app.set('trust proxy', 1);

// =============================================================================
// Middleware
// =============================================================================

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(
  morgan('short', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }),
);

// Rate limiting
app.use('/api/', apiLimiter);

// Static file serving for exports
app.use(
  '/exports',
  express.static(env.EXPORT_STORAGE_PATH, {
    maxAge: '24h',
    setHeaders: (res) => {
      res.setHeader('Content-Disposition', 'attachment');
    },
  }),
);

// =============================================================================
// Health Check
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-sports-editor-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// =============================================================================
// SSE Endpoint for Real-time Progress Updates
// =============================================================================

/** Connected SSE clients mapped by userId */
const sseClients = new Map<string, express.Response[]>();

app.get('/api/events/:userId', (req, res) => {
  const { userId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Register client
  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  sseClients.get(userId)!.push(res);

  logger.debug(`SSE client connected: ${userId}`);

  // Clean up on disconnect
  req.on('close', () => {
    const clients = sseClients.get(userId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index >= 0) clients.splice(index, 1);
      if (clients.length === 0) sseClients.delete(userId);
    }
    logger.debug(`SSE client disconnected: ${userId}`);
  });

  // Keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.on('close', () => clearInterval(keepAlive));
});

/**
 * Sends an SSE event to a specific user's connected clients.
 */
export function sendSSEEvent(userId: string, event: { type: string; data: unknown }): void {
  const clients = sseClients.get(userId);
  if (clients) {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    clients.forEach((client) => client.write(message));
  }
}

// =============================================================================
// API Routes
// =============================================================================

app.use('/api', routes);

// =============================================================================
// Error Handling
// =============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// Server Start
// =============================================================================

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start queue workers
    const analysisWorker = startAnalysisWorker();
    const clipWorker = startClipWorker();
    const exportWorker = startExportWorker();

    // Start HTTP server
    const server = app.listen(env.APP_PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║       🏟️  AI Sports Editor Backend          ║
║──────────────────────────────────────────────║
║  Server:    http://localhost:${env.APP_PORT}           ║
║  Env:       ${env.NODE_ENV.padEnd(33)}║
║  Workers:   analysis, clips, exports         ║
╚══════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close workers
        await Promise.all([
          analysisWorker.close(),
          clipWorker.close(),
          exportWorker.close(),
        ]);

        // Close queues
        await closeQueues();

        // Close database
        await disconnectDatabase();

        // Close Redis
        await disconnectRedis();

        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
