import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Catches any error passed to next(err) or thrown in a route handler.
const isDev = process.env.NODE_ENV !== "production";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error({ err, path: req.path, method: req.method }, "unhandled error");

  res.status(err.status || 500).json({
    error: isDev ? err.message : "Internal Server Error",
  });
};
