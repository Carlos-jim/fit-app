import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash-lite"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, "SUPABASE_STORAGE_BUCKET is required"),
  STORAGE_SIGNED_UPLOAD_TTL_SECONDS: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 7200))
    .pipe(z.number().int().positive().max(7200)),
  PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 3000))
    .pipe(z.number().int().positive().max(65535)),
  GOOGLE_CLIENT_IDS: z.string().optional().default(""),
  SENTRY_DSN: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().optional().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().optional().default("7d"),
  CORS_ORIGIN: z.string().optional().default(""),
  ALLOWED_IMAGE_HOSTS: z.string().optional().default(""),
  // Email (Resend) — optional in dev (falls back to console transport)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional().default("no-reply@bioma.app"),
  EMAIL_LOG_ONLY: z.string().optional().default(""),
  // Frontend origin for deep links in transactional emails
  FRONTEND_URL: z.string().url().optional().default("https://bioma.app"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;
