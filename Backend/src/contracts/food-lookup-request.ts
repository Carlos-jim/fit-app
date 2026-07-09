import { z } from "zod";

export const barcodeLookupParamsSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6,14}$/, "Barcode must be 6-14 digits."),
});

export const registerBarcodeMealSchema = z.object({
  barcode: z.string().trim().regex(/^\d{6,14}$/),
  servingGrams: z
    .number()
    .positive("servingGrams must be positive")
    .max(2000, "servingGrams must be <= 2000")
    .optional(),
  mealLabel: z.string().trim().min(1).max(120).optional(),
  consumedAt: z.string().datetime().optional(),
  notes: z.string().trim().max(600).optional(),
});

export type RegisterBarcodeMealInput = z.infer<typeof registerBarcodeMealSchema>;