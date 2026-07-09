import { z } from "zod";

export const createHydrationRequestSchema = z.object({
  glasses: z
    .number()
    .int("glasses must be an integer")
    .positive("glasses must be positive")
    .max(50, "glasses per entry must be <= 50"),
  notes: z.string().trim().max(280).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const listHydrationQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const hydrationTodayQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "date must be YYYY-MM-DD")
    .optional(),
  tz: z.string().min(1).max(64).optional(),
});

export const deleteHydrationParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateHydrationRequest = z.infer<typeof createHydrationRequestSchema>;
export type ListHydrationQuery = z.infer<typeof listHydrationQuerySchema>;