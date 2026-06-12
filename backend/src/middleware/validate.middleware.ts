// =============================================================================
// Request Validation Middleware
// =============================================================================
// Uses Zod schemas to validate request body, query params, and URL params.
// Returns 422 with detailed error messages on validation failure.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Creates a validation middleware for request body.
 * Usage: `router.post('/endpoint', validateBody(schema), handler)`
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(422).json({
          success: false,
          message: 'Validation failed',
          data: errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Creates a validation middleware for query parameters.
 * Usage: `router.get('/endpoint', validateQuery(schema), handler)`
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(422).json({
          success: false,
          error: 'Invalid query parameters',
          data: errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Creates a validation middleware for URL parameters.
 * Usage: `router.get('/:id', validateParams(schema), handler)`
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(422).json({
          success: false,
          error: 'Invalid URL parameters',
          data: errors,
        });
        return;
      }
      next(error);
    }
  };
}
