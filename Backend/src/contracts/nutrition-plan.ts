import { z } from "zod";

export const nutritionPlanResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dailyCalories: z.number().int().positive(),
  proteinGrams: z.number().int().nonnegative(),
  carbsGrams: z.number().int().nonnegative(),
  fatGrams: z.number().int().nonnegative(),
  proteinPercentage: z.number().int().min(0).max(100),
  carbsPercentage: z.number().int().min(0).max(100),
  fatPercentage: z.number().int().min(0).max(100),
  bmr: z.number().nullable(),
  tdee: z.number().nullable(),
  source: z.string(),
  generatedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NutritionPlanResponse = z.infer<typeof nutritionPlanResponseSchema>;
