// backend/src/config.ts
// Loads and validates environment variables using zod.
// This runs at app startup, so any missing or invalid config causes an immediate,
// descriptive error.
import { z, ZodError } from 'zod';
import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

// Define the schema for our environment variables.
const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT Secrets
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email (optional)
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

// Parse process.env and handle validation errors gracefully.
function loadEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        console.error(`  - ${path}: ${issue.message}`);
      });
    } else {
      console.error('❌ Unexpected error loading environment variables:', error);
    }
    process.exit(1);
  }
}

// Export the validated config object for use throughout the app.
export const config = loadEnv();

// Also export the TypeScript type derived from the schema
export type EnvConfig = z.infer<typeof envSchema>;
