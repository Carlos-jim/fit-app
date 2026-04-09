import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /*OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  S3_UPLOAD_BUCKET: z.string().min(1, "S3_UPLOAD_BUCKET is required"),
  AWS_REGION: z.string().min(1).default("us-east-1"),
  S3_SIGNED_URL_TTL_SECONDS: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 900))
    .pipe(z.number().int().positive().max(3600)),*/
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;
