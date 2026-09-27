import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../utils/env";

// ── JWT Auth Middleware ──────────────────────────────────────────────
// Protects REST routes that require a logged-in user.
// Expects: Authorization: Bearer <token>
// Sets: req.user = { userId: number }

// Extend Express Request to include our user data.
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number };
    req.user = { userId: decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
