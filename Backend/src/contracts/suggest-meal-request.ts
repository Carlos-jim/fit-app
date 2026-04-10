import { z } from "zod";

export const suggestMealRequestSchema = z.object({
  logId: z.string().min(1).optional(),
  mealTitle: z.string().min(1),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  fiberGrams: z.number().nonnegative().nullable().optional(),
  sugarGrams: z.number().nonnegative().nullable().optional(),
  sodiumMg: z.number().nonnegative().nullable().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        estimatedGrams: z.number().nonnegative(),
        calories: z.number().nonnegative(),
        proteinGrams: z.number().nonnegative(),
        carbsGrams: z.number().nonnegative(),
        fatGrams: z.number().nonnegative(),
      }),
    )
    .default([]),
});

export type SuggestMealRequest = z.infer<typeof suggestMealRequestSchema>;

export const mealSuggestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "isHealthy",
    "healthScore",
    "analysis",
    "positiveAspects",
    "concerns",
    "suggestion",
  ],
  properties: {
    isHealthy: {
      type: "boolean",
    },
    healthScore: {
      type: "number",
      minimum: 0,
      maximum: 10,
    },
    analysis: {
      type: "string",
      minLength: 1,
    },
    positiveAspects: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
    },
    concerns: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
    },
    suggestion: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "description",
        "estimatedCalories",
        "estimatedProteinGrams",
        "estimatedCarbsGrams",
        "estimatedFatGrams",
        "benefits",
      ],
      properties: {
        title: {
          type: "string",
          minLength: 1,
        },
        description: {
          type: "string",
          minLength: 1,
        },
        estimatedCalories: {
          type: "number",
          minimum: 0,
        },
        estimatedProteinGrams: {
          type: "number",
          minimum: 0,
        },
        estimatedCarbsGrams: {
          type: "number",
          minimum: 0,
        },
        estimatedFatGrams: {
          type: "number",
          minimum: 0,
        },
        benefits: {
          type: "array",
          items: {
            type: "string",
            minLength: 1,
          },
        },
      },
    },
  },
} as const;

export const mealSuggestionSchema = z.object({
  isHealthy: z.boolean(),
  healthScore: z.number().min(0).max(10),
  analysis: z.string().min(1),
  positiveAspects: z.array(z.string().min(1)),
  concerns: z.array(z.string().min(1)),
  suggestion: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    estimatedCalories: z.number().nonnegative(),
    estimatedProteinGrams: z.number().nonnegative(),
    estimatedCarbsGrams: z.number().nonnegative(),
    estimatedFatGrams: z.number().nonnegative(),
    benefits: z.array(z.string().min(1)),
  }),
});

export type MealSuggestion = z.infer<typeof mealSuggestionSchema>;
