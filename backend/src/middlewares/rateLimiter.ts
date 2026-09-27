import { Request, Response, NextFunction } from "express";

interface RateLimitInfo {
  requestCount: number;
  resetTime: number;
}

// In-memory cache for IP request tracking
const ipCache = new Map<string, RateLimitInfo>();

// Clean up expired cache entries periodically to avoid memory leakage
setInterval(() => {
  const now = Date.now();
  for (const [ip, info] of ipCache.entries()) {
    if (now > info.resetTime) {
      ipCache.delete(ip);
    }
  }
}, 5 * 60 * 1000); // run every 5 minutes

/**
 * Express Middleware to rate-limit AI Coach requests.
 * Standard limit: 5 requests per minute per IP address.
 * Bypassed if the request includes a custom client-side API key header.
 */
export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const hasClientGeminiKey = req.headers["x-gemini-key"];
  const hasClientGrokKey = req.headers["x-grok-key"];

  // Bypassed if client supplies their own API Key
  if (hasClientGeminiKey || hasClientGrokKey) {
    next();
    return;
  }

  // Get client IP address
  const ip = (req.ip || req.socket.remoteAddress || "unknown-ip") as string;
  const now = Date.now();
  const limitWindowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  const clientInfo = ipCache.get(ip);

  if (!clientInfo || now > clientInfo.resetTime) {
    // Initialize or reset window for this IP
    ipCache.set(ip, {
      requestCount: 1,
      resetTime: now + limitWindowMs,
    });
    next();
  } else {
    // Within current window
    if (clientInfo.requestCount >= maxRequests) {
      res.status(429).json({
        error: "Too many coach requests. Please wait a minute, or enter your own Gemini/Grok API Key in Settings to get unlimited analysis!"
      });
      return;
    }

    clientInfo.requestCount += 1;
    next();
  }
};
