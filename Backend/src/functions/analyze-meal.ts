import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { analyzeMealRequestSchema } from "../contracts/analyze-meal-request.js";
import { AppError } from "../lib/app-error.js";
import { jsonResponse, noContentResponse } from "../lib/http.js";
import { parseJsonBody } from "../lib/parse-json-body.js";
import { prisma } from "../lib/prisma.js";
import { LogRepository } from "../repositories/log.repository.js";
import { NutritionAnalysisService } from "../services/nutrition-analysis.service.js";
import { S3ImageService } from "../services/s3-image.service.js";

const s3ImageService = new S3ImageService();
const nutritionAnalysisService = new NutritionAnalysisService();
const logRepository = new LogRepository(prisma);

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    if (event.requestContext.http.method === "OPTIONS") {
      return noContentResponse();
    }

    if (event.requestContext.http.method !== "POST") {
      return jsonResponse(405, {
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST is supported.",
      });
    }

    const request = parseJsonBody(event, analyzeMealRequestSchema);
    const imageAsset = await s3ImageService.getImage({
      bucket: request.bucket,
      key: request.s3Key,
    });

    const analysisResult = await nutritionAnalysisService.analyzeFromImage({
      imageDataUrl: s3ImageService.toDataUrl(imageAsset),
      mealLabel: request.mealLabel,
      notes: request.notes,
    });

    const log = await logRepository.createMealAnalysisLog({
      userId: request.userId,
      source: "IMAGE",
      mealLabel: request.mealLabel,
      notes: request.notes,
      consumedAt: request.consumedAt,
      imageBucket: imageAsset.bucket,
      imageKey: imageAsset.key,
      imageUrl: imageAsset.publicUrl,
      analysis: analysisResult.parsed,
      aiModel: analysisResult.model,
    });

    return jsonResponse(201, {
      data: {
        id: log.id,
        userId: log.userId,
        type: log.type,
        title: log.title,
        imageUrl: log.imageUrl,
        calories: log.calories,
        proteinGrams: log.proteinGrams,
        carbsGrams: log.carbsGrams,
        fatGrams: log.fatGrams,
        confidence: log.confidence,
        ingredients: log.ingredients,
        warnings: log.warnings ?? [],
        createdAt: log.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): APIGatewayProxyStructuredResultV2 {
  if (error instanceof AppError) {
    return jsonResponse(error.statusCode, {
      error: error.code,
      message: error.message,
      details: error.expose ? error.cause ?? null : null,
      });
    }

  console.error("Unhandled error in analyze meal Lambda", error);

  return jsonResponse(500, {
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error while processing meal analysis.",
  });
}
