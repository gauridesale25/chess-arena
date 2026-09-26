import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Validates required env vars at startup so the server fails fast
// with a clear message instead of breaking later at runtime.
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
