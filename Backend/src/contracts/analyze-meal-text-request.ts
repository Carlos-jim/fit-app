import { z } from "zod";

export const analyzeMealTextRequestSchema = z.object({
  description: z.string().trim().min(5).max(1200),
  mealLabel: z.string().trim().min(1).max(120).optional(),
  consumedAt: z.string().datetime().optional(),
});

export type AnalyzeMealTextRequest = z.infer<typeof analyzeMealTextRequestSchema>;
