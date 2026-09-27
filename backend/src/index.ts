import { createServer } from "http";
import url from "url";
import jwt from "jsonwebtoken";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { GameManager } from "./GameManager";
import prisma from "./utils/prisma";
import { env } from "./utils/env";
import logger, { wsLog } from "./utils/logger";

// ══════════════════════════════════════════════════════════════════════
//  Server Setup
//  Both Express (HTTP) and WebSocket share a single HTTP server.
//  This means one port for everything — simpler in production
//  behind a reverse proxy (nginx, CloudFlare, etc).
// ══════════════════════════════════════════════════════════════════════

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const gameManager = new GameManager();

// ══════════════════════════════════════════════════════════════════════
//  WebSocket Connection Handler
//  Every connection MUST have a valid JWT token.
//  No guest play — unauthenticated connections are rejected.
// ══════════════════════════════════════════════════════════════════════

wss.on("connection", async (ws: WebSocket, req) => {
  try {
    const parsedUrl = url.parse(req.url || "", true);
    const token = parsedUrl.query.token as string;

    // No token = no connection. Close with code 4001.
    if (!token) {
      ws.close(4001, "Authentication required");
      return;
    }

    // Verify the JWT and look up the user in the database.
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      ws.close(4001, "User not found");
      return;
    }

    // Hand the authenticated socket to the GameManager.
    gameManager.addUser(ws, {
      userId: user.id,
      name: user.Email,
    });
  } catch (err) {
    // JWT expired, malformed, or DB error — reject the connection.
    wsLog.warn({ err }, "WS auth failed");
    ws.close(4001, "Unauthorized: Invalid or expired token");
  }
});

// ══════════════════════════════════════════════════════════════════════
//  Start Server
// ══════════════════════════════════════════════════════════════════════

server.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
  logger.info(`WebSocket available at ws://localhost:${env.PORT}/ws`);
});

// ══════════════════════════════════════════════════════════════════════
//  Graceful Shutdown
//  On SIGTERM/SIGINT (e.g. docker stop, Ctrl+C):
//  1. Stop accepting new connections
//  2. Let GameManager clean up active games
//  3. Disconnect from DB
//  4. Exit
// ══════════════════════════════════════════════════════════════════════

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);

  // Stop GameManager heartbeat and timers.
  gameManager.shutdown();

  // Close WebSocket server (stops accepting new connections).
  wss.close(() => {
    wsLog.info("WebSocket server closed");
  });

  // Close HTTP server.
  server.close(async () => {
    logger.info("HTTP server closed");

    // Disconnect from database.
    await prisma.$disconnect();
    logger.info("Database disconnected — goodbye");
    process.exit(0);
  });

  // Force exit after 10 seconds if something hangs.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Make gameManager accessible for the health endpoint.
export { gameManager };
