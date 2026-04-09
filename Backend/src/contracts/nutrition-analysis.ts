import { z } from "zod";

const numberField = z.number().finite().nonnegative();

export const nutritionItemSchema = z.object({
  name: z.string().min(1),
  estimatedGrams: numberField,
  calories: numberField,
  proteinGrams: numberField,
  carbsGrams: numberField,
  fatGrams: numberField,
});

export const nutritionAnalysisSchema = z.object({
  mealName: z.string().min(1),
  summary: z.string().min(1),
  estimatedServingGrams: numberField,
  total: z.object({
    calories: numberField,
    proteinGrams: numberField,
    carbsGrams: numberField,
    fatGrams: numberField,
    fiberGrams: numberField.nullable(),
    sugarGrams: numberField.nullable(),
    sodiumMg: numberField.nullable(),
  }),
  items: z.array(nutritionItemSchema).min(1),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  warnings: z.array(z.string().min(1)).default([]),
});

export type NutritionAnalysis = z.infer<typeof nutritionAnalysisSchema>;

export const nutritionAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "mealName",
    "summary",
    "estimatedServingGrams",
    "total",
    "items",
    "confidence",
    "warnings",
  ],
  properties: {
    mealName: {
      type: "string",
      minLength: 1,
    },
    summary: {
      type: "string",
      minLength: 1,
    },
    estimatedServingGrams: {
      type: "number",
      minimum: 0,
    },
    total: {
      type: "object",
      additionalProperties: false,
      required: [
        "calories",
        "proteinGrams",
        "carbsGrams",
        "fatGrams",
        "fiberGrams",
        "sugarGrams",
        "sodiumMg",
      ],
      properties: {
        calories: {
          type: "number",
          minimum: 0,
        },
        proteinGrams: {
          type: "number",
          minimum: 0,
        },
        carbsGrams: {
          type: "number",
          minimum: 0,
        },
        fatGrams: {
          type: "number",
          minimum: 0,
        },
        fiberGrams: {
          type: ["number", "null"],
          minimum: 0,
        },
        sugarGrams: {
          type: ["number", "null"],
          minimum: 0,
        },
        sodiumMg: {
          type: ["number", "null"],
          minimum: 0,
        },
      },
    },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "estimatedGrams",
          "calories",
          "proteinGrams",
          "carbsGrams",
          "fatGrams",
        ],
        properties: {
          name: {
            type: "string",
            minLength: 1,
          },
          estimatedGrams: {
            type: "number",
            minimum: 0,
          },
          calories: {
            type: "number",
            minimum: 0,
          },
          proteinGrams: {
            type: "number",
            minimum: 0,
          },
          carbsGrams: {
            type: "number",
            minimum: 0,
          },
          fatGrams: {
            type: "number",
            minimum: 0,
          },
        },
      },
    },
    confidence: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    warnings: {
      type: "array",
      items: {
        type: "string",
        minLength: 1,
      },
    },
  },
} as const;
