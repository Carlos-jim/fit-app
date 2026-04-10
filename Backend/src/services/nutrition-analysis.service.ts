import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import {
  nutritionAnalysisJsonSchema,
  nutritionAnalysisSchema,
  type NutritionAnalysis,
} from "../contracts/nutrition-analysis.js";
import {
  mealSuggestionJsonSchema,
  mealSuggestionSchema,
  type MealSuggestion,
  type SuggestMealRequest,
} from "../contracts/suggest-meal-request.js";
import { AppError } from "../lib/app-error.js";

const geminiClient = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 45_000,
  },
});

const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";
const SECONDARY_FALLBACK_GEMINI_MODEL = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = [
  "You are the nutrition-analysis engine for a mobile health app used in Venezuela.",
  "Estimate foods, ingredients, serving sizes, and nutrition conservatively.",
  "Never pretend certainty when the meal is partially visible, mixed, fried, covered, or ambiguous.",
  "Return only valid JSON that matches the provided schema.",
  "Use numeric values only for nutrient fields, always in grams and mg where applicable.",
  "Make totals internally consistent with the listed items as closely as possible.",
  "If the image or text is too ambiguous, lower confidence and add warnings instead of inventing details.",
  "Favor common Latin American and Venezuelan preparations when the meal context suggests them.",
].join(" ");

const SUGGESTION_SYSTEM_PROMPT = [
  "You are a friendly and knowledgeable nutritionist AI assistant for a mobile health app used in Venezuela and Latin America.",
  "Your job is to evaluate a meal's healthiness and suggest a healthier alternative when appropriate.",
  "Respond in Spanish (Latin American).",
  "Always be encouraging, constructive, and respectful. Never shame the user for their food choices.",
  "When evaluating healthiness, consider: caloric balance, macronutrient ratios, processed ingredients, fiber content, sugar, sodium, and cooking methods.",
  "A healthScore of 0-3 is unhealthy, 4-6 is moderate, 7-10 is healthy.",
  "Even for healthy meals, still provide a suggestion that could complement or slightly improve the meal.",
  "The suggestion should be a realistic, accessible meal in Latin America (not exotic or expensive ingredients).",
  "Return only valid JSON that matches the provided schema.",
].join(" ");


export interface AnalyzeNutritionInput {
  imageDataUrl?: string;
  description?: string;
  mealLabel?: string;
  notes?: string;
}

export interface AnalyzeNutritionResult {
  parsed: NutritionAnalysis;
  model: string;
}

export class NutritionAnalysisService {
  async analyzeFromImage(input: AnalyzeNutritionInput): Promise<AnalyzeNutritionResult> {
    if (!input.imageDataUrl) {
      throw new AppError("Image data is required for image analysis.", {
        statusCode: 400,
        code: "IMAGE_DATA_REQUIRED",
      });
    }

    const imagePart = this.parseImageDataUrl(input.imageDataUrl);

    return this.runAnalysis({
      prompt: this.buildImagePrompt(input),
      imagePart,
      errorMessage: "Failed to analyze meal image with Gemini.",
    });
  }

  async analyzeFromText(input: AnalyzeNutritionInput): Promise<AnalyzeNutritionResult> {
    if (!input.description?.trim()) {
      throw new AppError("Meal description is required for text analysis.", {
        statusCode: 400,
        code: "MEAL_DESCRIPTION_REQUIRED",
      });
    }

    return this.runAnalysis({
      prompt: this.buildTextPrompt(input),
      errorMessage: "Failed to analyze meal text with Gemini.",
    });
  }

  async suggestMealAlternative(input: SuggestMealRequest): Promise<MealSuggestion> {
    const prompt = this.buildSuggestionPrompt(input);

    const candidateModels = Array.from(
      new Set([
        env.GEMINI_MODEL,
        FALLBACK_GEMINI_MODEL,
        SECONDARY_FALLBACK_GEMINI_MODEL,
      ]),
    );

    let lastError: unknown;

    for (const modelName of candidateModels) {
      try {
        const maxAttempts = modelName === SECONDARY_FALLBACK_GEMINI_MODEL ? 1 : 2;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const response = await geminiClient.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              config: {
                systemInstruction: SUGGESTION_SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseJsonSchema: mealSuggestionJsonSchema,
                temperature: 0.4,
                topP: 0.9,
                maxOutputTokens: 2048,
              },
            });

            const rawOutput = response.text?.trim();

            if (!rawOutput) {
              throw new AppError("Gemini returned an empty response for suggestion.", {
                statusCode: 502,
                code: "GEMINI_EMPTY_RESPONSE",
              });
            }

            let parsedJson: unknown;

            try {
              parsedJson = JSON.parse(this.stripCodeFences(rawOutput));
            } catch (error) {
              throw new AppError("Gemini returned invalid JSON for suggestion.", {
                statusCode: 502,
                code: "GEMINI_INVALID_JSON",
                cause: error,
              });
            }

            const parsed = mealSuggestionSchema.safeParse(parsedJson);

            if (!parsed.success) {
              throw new AppError("Gemini suggestion response did not match schema.", {
                statusCode: 502,
                code: "GEMINI_SCHEMA_MISMATCH",
                cause: parsed.error.flatten(),
              });
            }

            return parsed.data;
          } catch (error) {
            if (error instanceof AppError) {
              throw error;
            }

            if (!this.shouldRetrySameModel(error, attempt, maxAttempts)) {
              throw error;
            }

            await this.delay(800 * attempt);
          }
        }

        throw new Error(`Gemini suggestion attempts exhausted for model ${modelName}.`);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        lastError = error;

        if (!this.shouldRetryWithFallback(error, modelName)) {
          break;
        }
      }
    }

    throw new AppError("Failed to generate meal suggestion with Gemini.", {
      statusCode: 502,
      code: "GEMINI_REQUEST_FAILED",
      cause: lastError,
    });
  }

  private async runAnalysis(params: {
    prompt: string;
    imagePart?: { mimeType: string; data: string };
    errorMessage: string;
  }): Promise<AnalyzeNutritionResult> {
    const candidateModels = Array.from(
      new Set([
        env.GEMINI_MODEL,
        FALLBACK_GEMINI_MODEL,
        SECONDARY_FALLBACK_GEMINI_MODEL,
      ]),
    );

    let lastError: unknown;

    for (const modelName of candidateModels) {
      try {
        return await this.generateWithModel(modelName, params);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        lastError = error;

        if (!this.shouldRetryWithFallback(error, modelName)) {
          break;
        }
      }
    }

    throw new AppError(params.errorMessage, {
      statusCode: 502,
      code: "GEMINI_REQUEST_FAILED",
      cause: lastError,
    });
  }

  private async generateWithModel(
    modelName: string,
    params: {
      prompt: string;
      imagePart?: { mimeType: string; data: string };
      errorMessage: string;
    },
  ): Promise<AnalyzeNutritionResult> {
    const maxAttempts = modelName === SECONDARY_FALLBACK_GEMINI_MODEL ? 1 : 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await geminiClient.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: params.prompt,
                },
                ...(params.imagePart
                  ? [
                      {
                        inlineData: {
                          mimeType: params.imagePart.mimeType,
                          data: params.imagePart.data,
                        },
                      },
                    ]
                  : []),
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: nutritionAnalysisJsonSchema,
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
        });

        const rawOutput = response.text?.trim();

        if (!rawOutput) {
          throw new AppError("Gemini returned an empty response.", {
            statusCode: 502,
            code: "GEMINI_EMPTY_RESPONSE",
          });
        }

        let parsedJson: unknown;

        try {
          parsedJson = JSON.parse(this.stripCodeFences(rawOutput));
        } catch (error) {
          throw new AppError("Gemini returned invalid JSON.", {
            statusCode: 502,
            code: "GEMINI_INVALID_JSON",
            cause: error,
          });
        }

        const parsed = nutritionAnalysisSchema.safeParse(parsedJson);

        if (!parsed.success) {
          throw new AppError("Gemini response did not match the nutrition schema.", {
            statusCode: 502,
            code: "GEMINI_SCHEMA_MISMATCH",
            cause: parsed.error.flatten(),
          });
        }

        return {
          parsed: parsed.data,
          model: response.modelVersion ?? modelName,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        if (!this.shouldRetrySameModel(error, attempt, maxAttempts)) {
          throw error;
        }

        await this.delay(800 * attempt);
      }
    }

    throw new Error(`Gemini attempts exhausted for model ${modelName}.`);
  }

  private shouldRetryWithFallback(error: unknown, currentModel: string): boolean {
    if (currentModel === SECONDARY_FALLBACK_GEMINI_MODEL) {
      return false;
    }

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    return status === 404 || status === 503;
  }

  private shouldRetrySameModel(
    error: unknown,
    attempt: number,
    maxAttempts: number,
  ): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    return status === 503;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private parseImageDataUrl(dataUrl: string): { mimeType: string; data: string } {
    const match = /^data:(?<mimeType>[-\w.+/]+);base64,(?<data>[A-Za-z0-9+/=]+)$/u.exec(dataUrl);

    if (!match?.groups?.mimeType || !match.groups.data) {
      throw new AppError("Invalid image payload for Gemini analysis.", {
        statusCode: 400,
        code: "INVALID_IMAGE_DATA",
      });
    }

    return {
      mimeType: match.groups.mimeType,
      data: match.groups.data,
    };
  }

  private stripCodeFences(value: string): string {
    return value.replace(/^```json\s*/u, "").replace(/\s*```$/u, "");
  }

  private buildImagePrompt(input: AnalyzeNutritionInput): string {
    const promptLines = [
      "Analyze this meal photo for nutrition tracking.",
      "Identify the likely foods in the image and estimate realistic serving sizes.",
      "Return calories and macronutrients for the whole meal and for each item.",
      "If beverages, sauces, oils, dressings, cheese, breading, or side items may be present, account for them conservatively.",
      "When the portion cannot be measured exactly, provide the most plausible estimate and explain uncertainty through confidence and warnings.",
      "Use grams and mg as units.",
    ];

    if (input.mealLabel) {
      promptLines.push(`Meal label from user: ${input.mealLabel}`);
    }

    if (input.notes) {
      promptLines.push(`User notes about the photo: ${input.notes}`);
    }

    return promptLines.join("\n");
  }

  private buildTextPrompt(input: AnalyzeNutritionInput): string {
    const promptLines = [
      "Analyze this natural-language meal description for nutrition tracking.",
      "Infer the most likely ingredients, cooking method, and portion sizes conservatively.",
      "Return calories and macronutrients for the whole meal and for each item.",
      "Use grams and mg as units.",
      "Reflect uncertainty through confidence and warnings instead of inventing precision.",
      `Meal description: ${input.description?.trim() ?? ""}`,
    ];

    if (input.mealLabel) {
      promptLines.push(`Meal label from user: ${input.mealLabel}`);
    }

    return promptLines.join("\n");
  }

  private buildSuggestionPrompt(input: SuggestMealRequest): string {
    const lines = [
      `El usuario registró una comida llamada: "${input.mealTitle}".`,
      `Macronutrientes totales:`,
      `- Calorías: ${Math.round(input.calories)} kcal`,
      `- Proteína: ${Math.round(input.proteinGrams)} g`,
      `- Carbohidratos: ${Math.round(input.carbsGrams)} g`,
      `- Grasas: ${Math.round(input.fatGrams)} g`,
    ];

    if (input.fiberGrams != null) {
      lines.push(`- Fibra: ${Math.round(input.fiberGrams)} g`);
    }

    if (input.sugarGrams != null) {
      lines.push(`- Azúcar: ${Math.round(input.sugarGrams)} g`);
    }

    if (input.sodiumMg != null) {
      lines.push(`- Sodio: ${Math.round(input.sodiumMg)} mg`);
    }

    if (input.ingredients.length > 0) {
      lines.push(`\nIngredientes detectados:`);

      for (const ing of input.ingredients) {
        lines.push(
          `- ${ing.name}: ~${Math.round(ing.estimatedGrams)}g (${Math.round(ing.calories)} kcal, P:${Math.round(ing.proteinGrams)}g, C:${Math.round(ing.carbsGrams)}g, G:${Math.round(ing.fatGrams)}g)`,
        );
      }
    }

    lines.push(
      `\nEvalúa qué tan saludable es esta comida en una escala de 0 a 10.`,
      `Identifica aspectos positivos y preocupaciones nutricionales.`,
      `Sugiere una alternativa más saludable que sea accesible en Latinoamérica, con macronutrientes estimados.`,
      `Si la comida ya es muy saludable, sugiere un complemento o acompañamiento que la mejore.`,
    );

    return lines.join("\n");
  }
}

