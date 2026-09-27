import { PrismaClient } from '@prisma/client';
import pino from 'pino';

// Simple logger for startup (before the main logger loads).
const log = pino({ level: 'info' });

// ── Singleton Prisma Client ──────────────────────────────────────────
// One shared connection pool for the whole app.
// Every file imports from here instead of creating its own PrismaClient.
//
// Neon free tier databases go to sleep after inactivity.
// The first query after sleep can take a few seconds while the DB
// wakes up. Prisma's built-in connection handling covers most cases,
// but we warm up the connection at startup so the first real request
// doesn't eat the cold-start penalty.
const prisma = new PrismaClient();

// Try to connect at startup so we know immediately if the DB is down.
// This also wakes up sleeping Neon databases before any request hits.
prisma.$connect()
  .then(() => log.info('Database connected'))
  .catch((err) => log.warn({ err }, 'Database connection failed on startup (will retry on first query)'));

export default prisma;
