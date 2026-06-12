// =============================================================================
// Environment Configuration
// =============================================================================
// Validates all environment variables at startup using Zod.
// If any required variable is missing or invalid, the server will fail fast.
// =============================================================================

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file in development
dotenv.config();

/**
 * Schema for validating and typing all environment variables.
 * Every config value the app needs flows through here.
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // AI Service
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_SERVICE_API_KEY: z.string().default('dev-api-key'),

  // Storage paths
  VIDEO_STORAGE_PATH: z.string().default('./storage/videos'),
  EXPORT_STORAGE_PATH: z.string().default('./storage/exports'),
  TEMP_STORAGE_PATH: z.string().default('./storage/temp'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

/**
 * Validated environment configuration object.
 * Access any env var through `env.VAR_NAME` with full type safety.
 */
export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`\n❌ Environment validation failed:\n${missing}\n`);
    console.error('💡 Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }
  throw error;
}

export { env };
