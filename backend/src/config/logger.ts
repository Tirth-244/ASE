// =============================================================================
// Logger Configuration - Winston
// =============================================================================
// Structured logging with JSON format in production and colorized
// console output in development. Includes request correlation IDs.
// =============================================================================

import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Custom format for development: colorized, human-readable output.
 */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${stack || message}${metaStr}`;
  }),
);

/**
 * Production format: structured JSON for log aggregation services.
 */
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Application logger instance.
 * - Development: Colorized console output
 * - Production: JSON-structured logs to stdout
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'ai-sports-editor' },
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  // Don't exit on uncaught exceptions — let the error handler deal with it
  exitOnError: false,
});
