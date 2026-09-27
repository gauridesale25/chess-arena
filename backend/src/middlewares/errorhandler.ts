import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// ── Global Error Handler ────────────────────────────────────────────
// Catches any unhandled errors from route handlers.
// In production: returns a generic message (no stack traces leaked).
// In development: logs the full error for debugging.

const isDev = process.env.NODE_ENV !== 'production';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ err, path: req.path, method: req.method }, 'unhandled error');

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal Server Error',
  });
};
