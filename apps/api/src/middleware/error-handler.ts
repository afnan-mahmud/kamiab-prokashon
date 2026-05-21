import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/api-response.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.');
      if (!details[key]) details[key] = [];
      details[key]!.push(issue.message);
    }
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', details);
    return;
  }

  if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack });

    if (err.name === 'CastError') {
      sendError(res, 'Invalid ID format', 400, 'INVALID_ID');
      return;
    }

    if ('code' in err && err.code === 11000) {
      sendError(res, 'Duplicate value — resource already exists', 409, 'DUPLICATE_KEY');
      return;
    }
  }

  logger.error('Unhandled error', { err });
  sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}
