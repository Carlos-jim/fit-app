import { z } from "zod";

export const analyzeMealRequestSchema = z.object({
  userId: z.string().min(1),
  s3Key: z.string().min(1),
  bucket: z.string().min(1).optional(),
  mealLabel: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().min(1).max(600).optional(),
  consumedAt: z.string().datetime().optional(),
});

export type AnalyzeMealRequest = z.infer<typeof analyzeMealRequestSchema>;
