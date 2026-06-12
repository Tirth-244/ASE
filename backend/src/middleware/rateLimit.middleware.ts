// =============================================================================
// Rate Limiting Middleware
// =============================================================================
// Protects API endpoints from abuse with configurable rate limits.
// =============================================================================

import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * General API rate limiter.
 * Allows `RATE_LIMIT_MAX_REQUESTS` requests per `RATE_LIMIT_WINDOW_MS`.
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

/**
 * Stricter rate limiter for authentication endpoints.
 * Prevents brute-force login attempts: 10 requests per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

/**
 * Rate limiter for resource-intensive operations (analysis, export).
 * 5 requests per hour to prevent abuse of expensive AI processing.
 */
export const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Processing limit reached. Please try again in an hour.',
  },
});
