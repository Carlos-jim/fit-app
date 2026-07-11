import { z } from "zod";

const pctField = z.number().int().min(0).max(100);
const calorieField = z.number().finite().positive();
const macroField = z.number().finite().nonnegative();

export const nutritionPlanSchema = z
  .object({
    dailyCalories: calorieField,
    proteinGrams: macroField,
    carbsGrams: macroField,
    fatGrams: macroField,
    proteinPercentage: pctField,
    carbsPercentage: pctField,
    fatPercentage: pctField,
    bmr: macroField,
    tdee: macroField,
    rationale: z.string().min(1).max(600),
  })
  .refine(
    (plan) =>
      plan.proteinPercentage + plan.carbsPercentage + plan.fatPercentage === 100,
    {
      message: "Macro percentages must sum to exactly 100.",
      path: ["fatPercentage"],
    },
  );

export type NutritionPlanOutput = z.infer<typeof nutritionPlanSchema>;

export const nutritionPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "dailyCalories",
    "proteinGrams",
    "carbsGrams",
    "fatGrams",
    "proteinPercentage",
    "carbsPercentage",
    "fatPercentage",
    "bmr",
    "tdee",
    "rationale",
  ],
  properties: {
    dailyCalories: { type: "number", minimum: 1000 },
    proteinGrams: { type: "number", minimum: 0 },
    carbsGrams: { type: "number", minimum: 0 },
    fatGrams: { type: "number", minimum: 0 },
    proteinPercentage: { type: "integer", minimum: 0, maximum: 100 },
    carbsPercentage: { type: "integer", minimum: 0, maximum: 100 },
    fatPercentage: { type: "integer", minimum: 0, maximum: 100 },
    bmr: { type: "number", minimum: 0 },
    tdee: { type: "number", minimum: 0 },
    rationale: { type: "string", minLength: 1, maxLength: 600 },
  },
};