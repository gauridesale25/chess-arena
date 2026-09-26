import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorhandler";
import { env } from "./utils/env";

const app = express();

// Security headers
app.use(helmet());

// JSON body parser with size limit
app.use(express.json({ limit: "1mb" }));

// CORS — origin is configurable via env so we don't hardcode localhost.
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Health check — confirms the server booted and is reachable.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
  });
});

app.get("/", (_req, res) => res.send("chessss API"));

// Global error handler — always last.
app.use(errorHandler);

export default app;
