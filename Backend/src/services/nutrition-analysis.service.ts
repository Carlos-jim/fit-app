import OpenAI from "openai";
import type {
  ResponseInput,
  ResponseInputImage,
  ResponseInputText,
} from "openai/resources/responses/responses";

import { env } from "../config/env.js";
import {
  nutritionAnalysisJsonSchema,
  nutritionAnalysisSchema,
  type NutritionAnalysis,
} from "../contracts/nutrition-analysis.js";
import { AppError } from "../lib/app-error.js";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 45_000,
});

export interface AnalyzeNutritionInput {
  imageDataUrl?: string;
  description?: string;
  mealLabel?: string;
  notes?: string;
}

export interface AnalyzeNutritionResult {
  parsed: NutritionAnalysis;
  responseId: string | null;
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

    return this.runAnalysis({
      prompt: this.buildImagePrompt(input),
      imageDataUrl: input.imageDataUrl,
      errorMessage: "Failed to analyze meal image with OpenAI.",
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
      errorMessage: "Failed to analyze meal text with OpenAI.",
    });
  }

  private async runAnalysis(params: {
    prompt: string;
    imageDataUrl?: string;
    errorMessage: string;
  }): Promise<AnalyzeNutritionResult> {
    try {
      const response = await openai.responses.create({
        model: env.OPENAI_MODEL,
        input: this.buildInput(params),
        text: {
          format: {
            type: "json_schema",
            name: "nutrition_analysis",
            strict: true,
            schema: nutritionAnalysisJsonSchema,
          },
        },
      });

      const rawOutput = response.output_text?.trim();

      if (!rawOutput) {
        throw new AppError("OpenAI returned an empty response.", {
          statusCode: 502,
          code: "OPENAI_EMPTY_RESPONSE",
        });
      }

      let parsedJson: unknown;

      try {
        parsedJson = JSON.parse(rawOutput);
      } catch (error) {
        throw new AppError("OpenAI returned invalid JSON.", {
          statusCode: 502,
          code: "OPENAI_INVALID_JSON",
          cause: error,
        });
      }

      const parsed = nutritionAnalysisSchema.safeParse(parsedJson);

      if (!parsed.success) {
        throw new AppError("OpenAI response did not match the nutrition schema.", {
          statusCode: 502,
          code: "OPENAI_SCHEMA_MISMATCH",
          cause: parsed.error.flatten(),
        });
      }

      return {
        parsed: parsed.data,
        responseId: response.id ?? null,
        model: response.model ?? env.OPENAI_MODEL,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(params.errorMessage, {
        statusCode: 502,
        code: "OPENAI_REQUEST_FAILED",
        cause: error,
      });
    }
  }

  private buildInput(params: {
    prompt: string;
    imageDataUrl?: string;
  }): ResponseInput {
    const input: ResponseInput = [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a nutrition analyst for a mobile health app. " +
              "Estimate ingredients, serving size, and macros conservatively. " +
              "Return only structured JSON that matches the provided schema. " +
              "If uncertainty is high, reflect it in confidence and warnings.",
          },
        ],
      },
      {
        role: "user",
        content: this.buildUserContent(params),
      },
    ];

    return input;
  }

  private buildUserContent(params: {
    prompt: string;
    imageDataUrl?: string;
  }) {
    const content: Array<ResponseInputText | ResponseInputImage> = [
      {
        type: "input_text",
        text: params.prompt,
      },
    ];

    if (params.imageDataUrl) {
      content.push({
        type: "input_image",
        image_url: params.imageDataUrl,
        detail: "high",
      });
    }

    return content;
  }

  private buildImagePrompt(input: AnalyzeNutritionInput): string {
    const promptLines = [
      "Analyze this meal image for a nutrition tracking app in Venezuela.",
      "Estimate the meal composition and return calories and macronutrients.",
      "Use grams and mg as units.",
      "Avoid pretending certainty when the image is ambiguous.",
    ];

    if (input.mealLabel) {
      promptLines.push(`Meal label: ${input.mealLabel}`);
    }

    if (input.notes) {
      promptLines.push(`User notes: ${input.notes}`);
    }

    return promptLines.join("\n");
  }

  private buildTextPrompt(input: AnalyzeNutritionInput): string {
    const promptLines = [
      "Analyze this natural-language meal description for a nutrition tracking app in Venezuela.",
      "Infer likely ingredients, estimated serving sizes, calories, and macronutrients.",
      "Use conservative estimates and mention uncertainty through confidence and warnings.",
      "Use grams and mg as units.",
      `Meal description: ${input.description?.trim() ?? ""}`,
    ];

    if (input.mealLabel) {
      promptLines.push(`Meal label: ${input.mealLabel}`);
    }

    return promptLines.join("\n");
  }
}
