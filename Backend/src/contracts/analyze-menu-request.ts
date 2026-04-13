import { z } from "zod";

export const analyzeMenuRequestSchema = z.object({
  userId: z.string().min(1),
  imageUrl: z.string().url(),
});

export type AnalyzeMenuRequest = z.infer<typeof analyzeMenuRequestSchema>;

export const menuAnalysisJsonSchema = {
  type: "object",
  properties: {
    dishesDetected: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          estimatedCalories: { type: "number" },
          estimatedProteinGrams: { type: "number" },
          estimatedCarbsGrams: { type: "number" },
          estimatedFatGrams: { type: "number" },
        },
        required: [
          "name",
          "description",
          "estimatedCalories",
          "estimatedProteinGrams",
          "estimatedCarbsGrams",
          "estimatedFatGrams",
        ],
      },
    },
    recommendedDishes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          estimatedCalories: { type: "number" },
          estimatedProteinGrams: { type: "number" },
          estimatedCarbsGrams: { type: "number" },
          estimatedFatGrams: { type: "number" },
          matchScore: { type: "number", minimum: 0, maximum: 100 },
          reason: { type: "string" },
        },
        required: [
          "name",
          "description",
          "estimatedCalories",
          "estimatedProteinGrams",
          "estimatedCarbsGrams",
          "estimatedFatGrams",
          "matchScore",
          "reason",
        ],
      },
    },
    dishesToAvoid: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          estimatedCalories: { type: "number" },
        },
        required: ["name", "reason", "estimatedCalories"],
      },
    },
    summary: { type: "string" },
    totalCaloriesRemaining: { type: "number" },
    proteinTarget: { type: "number" },
    carbsTarget: { type: "number" },
    fatTarget: { type: "number" },
  },
  required: [
    "dishesDetected",
    "recommendedDishes",
    "dishesToAvoid",
    "summary",
    "totalCaloriesRemaining",
    "proteinTarget",
    "carbsTarget",
    "fatTarget",
  ],
};

export const menuAnalysisSchema = z.object({
  dishesDetected: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      estimatedCalories: z.number(),
      estimatedProteinGrams: z.number(),
      estimatedCarbsGrams: z.number(),
      estimatedFatGrams: z.number(),
    }),
  ),
  recommendedDishes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      estimatedCalories: z.number(),
      estimatedProteinGrams: z.number(),
      estimatedCarbsGrams: z.number(),
      estimatedFatGrams: z.number(),
      matchScore: z.number(),
      reason: z.string(),
    }),
  ),
  dishesToAvoid: z.array(
    z.object({
      name: z.string(),
      reason: z.string(),
      estimatedCalories: z.number(),
    }),
  ),
  summary: z.string(),
  totalCaloriesRemaining: z.number(),
  proteinTarget: z.number(),
  carbsTarget: z.number(),
  fatTarget: z.number(),
});

export type MenuAnalysis = z.infer<typeof menuAnalysisSchema>;
