import { z } from "zod";

export const bodyMetricTypeSchema = z.enum([
  "WEIGHT_KG",
  "WAIST_CM",
  "HIP_CM",
  "CHEST_CM",
  "BODY_FAT_PCT",
]);

export const createBodyMetricRequestSchema = z.object({
  type: bodyMetricTypeSchema,
  value: z.number().positive("Value must be positive").finite(),
  unit: z.string().trim().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const listBodyMetricsQuerySchema = z.object({
  type: bodyMetricTypeSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).optional().default(100),
});

export const deleteBodyMetricParamsSchema = z.object({
  id: z.string().min(1),
});

export type BodyMetricType = z.infer<typeof bodyMetricTypeSchema>;
export type CreateBodyMetricRequest = z.infer<typeof createBodyMetricRequestSchema>;
export type ListBodyMetricsQuery = z.infer<typeof listBodyMetricsQuerySchema>;
