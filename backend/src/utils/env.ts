import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// ── Environment Config ──────────────────────────────────────────────
// Validates all required env vars at startup.
// If anything is missing or wrong, the server crashes immediately
// with a clear error message instead of failing later at runtime.

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 chars'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GEMINI_API_KEY: z.string().optional(),
  GROK_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

// Type-safe env object — use `env.PORT`, `env.JWT_SECRET`, etc.
export const env = parsed.data;
