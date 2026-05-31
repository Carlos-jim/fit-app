import { z } from "zod";

export const analyzeMealRequestSchema = z
  .object({
    userId: z.string().min(1),
    path: z.string().min(1).optional(),
    bucket: z.string().min(1).optional(),
    base64Image: z.string().min(1).optional(),
    localImageUrl: z.string().min(1).optional(),
    mealLabel: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().min(1).max(600).optional(),
    consumedAt: z.string().datetime().optional(),
  })
  .refine(data => data.path || data.base64Image, {
    message: "Either path or base64Image must be provided",
  });

export type AnalyzeMealRequest = z.infer<typeof analyzeMealRequestSchema>;
