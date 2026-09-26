import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { env } from "./utils/env";
import logger from "./utils/logger";
import { GameManager } from "./GameManager";

// Express (HTTP) and WebSocket share a single HTTP server —
// one port for everything, simpler behind a reverse proxy.
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const gameManager = new GameManager();

wss.on("connection", (ws: WebSocket) => {
  gameManager.addConnection(ws);
});

server.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
  logger.info(`WebSocket available at ws://localhost:${env.PORT}/ws`);
});

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);

  gameManager.shutdown();
  wss.close(() => logger.info("WebSocket server closed"));

  server.close(() => {
    logger.info("HTTP server closed — goodbye");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
