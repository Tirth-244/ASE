// =============================================================================
// Error Handling Middleware
// =============================================================================
// Global error handler that catches all unhandled errors and returns
// consistent API responses. Also defines custom error classes.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Custom application error with HTTP status code.
 * Throw this from controllers/services for expected errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** 400 Bad Request */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

/** 401 Unauthorized */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/** 403 Forbidden */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

/** 404 Not Found */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/** 409 Conflict */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

/** 422 Unprocessable Entity */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 422);
  }
}

/**
 * Global error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 *
 * - Operational errors (AppError): Returns the error message to client
 * - Programming errors: Logs the full stack and returns a generic message
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.statusCode}] ${err.message}`, { stack: err.stack });
    } else {
      logger.warn(`[${err.statusCode}] ${err.message}`);
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Prisma known errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string; meta?: Record<string, unknown> };

    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists.',
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
      return;
    }
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      data: (err as unknown as { errors: unknown[] }).errors,
    });
    return;
  }

  // Unknown/programming errors — log full details, return generic message
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred. Please try again later.',
  });
}

/**
 * Middleware for handling 404 routes (no matching handler found).
 * Register this AFTER all route definitions but BEFORE errorHandler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}
