import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// ── App Logger ──────────────────────────────────────────────────────
// In dev: pretty-printed, human-readable output.
// In production: fast JSON lines for log aggregation (ELK, Datadog, etc).
const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Child loggers scoped by area — keeps log output easy to filter.
export const gameLog = logger.child({ module: 'game' });
export const wsLog = logger.child({ module: 'ws' });
export const authLog = logger.child({ module: 'auth' });

export default logger;
