import cors from "cors";
import express, { type Request, type Response } from "express";
import { z } from "zod";

import { env } from "./config/env.js";
import { analyzeMealRequestSchema } from "./contracts/analyze-meal-request.js";
import { analyzeMealTextRequestSchema } from "./contracts/analyze-meal-text-request.js";
import { bootstrapUserRequestSchema } from "./contracts/bootstrap-user-request.js";
import { createMealUploadUrlRequestSchema } from "./contracts/create-meal-upload-url-request.js";
import { suggestMealRequestSchema } from "./contracts/suggest-meal-request.js";
import { AppError } from "./lib/app-error.js";
import { prisma } from "./lib/prisma.js";
import { LogRepository } from "./repositories/log.repository.js";
import { UserRepository } from "./repositories/user.repository.js";
import { NutritionAnalysisService } from "./services/nutrition-analysis.service.js";
import { SupabaseStorageService } from "./services/supabase-storage.service.js";

const app = express();
const userRepository = new UserRepository(prisma);
const logRepository = new LogRepository(prisma);
const nutritionAnalysisService = new NutritionAnalysisService();
const storageService = new SupabaseStorageService();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    data: {
      ok: true,
      service: "bioma-backend",
    },
  });
});

app.post("/users/bootstrap", async (req, res) => {
  try {
    const request = parseBody(bootstrapUserRequestSchema, req.body);
    const user = await userRepository.ensureUser(request);

    res.status(200).json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    handleError(res, error, "bootstrapping user");
  }
});

app.post("/uploads/meal-image-url", async (req, res) => {
  try {
    const request = parseBody(createMealUploadUrlRequestSchema, req.body);
    const userExists = await userRepository.exists(request.userId);

    if (!userExists) {
      throw new AppError("User not found.", {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }

    const upload = await storageService.createMealImageUploadUrl(request);

    res.status(200).json({
      data: upload,
    });
  } catch (error) {
    handleError(res, error, "creating upload URL");
  }
});

app.post("/logs/analyze-meal-image", async (req, res) => {
  try {
    const request = parseBody(analyzeMealRequestSchema, req.body);
    const imageAsset = await storageService.getImage({
      bucket: request.bucket,
      path: request.path,
    });

    const analysisResult = await nutritionAnalysisService.analyzeFromImage({
      imageDataUrl: storageService.toDataUrl(imageAsset),
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
      imageKey: imageAsset.path,
      imageUrl: imageAsset.publicUrl,
      analysis: analysisResult.parsed,
      aiModel: analysisResult.model,
    });

    res.status(201).json({
      data: serializeMealLog(log),
    });
  } catch (error) {
    handleError(res, error, "processing meal image analysis");
  }
});

app.post("/logs/analyze-meal-text", async (req, res) => {
  try {
    const request = parseBody(analyzeMealTextRequestSchema, req.body);
    const analysisResult = await nutritionAnalysisService.analyzeFromText({
      description: request.description,
      mealLabel: request.mealLabel,
    });

    const log = await logRepository.createMealAnalysisLog({
      userId: request.userId,
      source: "TEXT",
      mealLabel: request.mealLabel,
      notes: request.description,
      consumedAt: request.consumedAt,
      analysis: analysisResult.parsed,
      aiModel: analysisResult.model,
    });

    res.status(201).json({
      data: serializeMealLog(log),
    });
  } catch (error) {
    handleError(res, error, "processing meal text analysis");
  }
});

app.get("/logs", async (req, res) => {
  try {
    const userId = parseQueryUserId(req);
    const logs = await logRepository.getUserLogs(userId);
    res.status(200).json({ data: logs });
  } catch (error) {
    handleError(res, error, "fetching meal logs");
  }
});

app.post("/logs/suggest-meal", async (req, res) => {
  try {
    const request = parseBody(suggestMealRequestSchema, req.body);
    const suggestion = await nutritionAnalysisService.suggestMealAlternative(request);

    if (request.logId) {
      await logRepository.saveMealSuggestion(request.logId, suggestion);
    }

    res.status(200).json({
      data: suggestion,
    });
  } catch (error) {
    handleError(res, error, "generating meal suggestion");
  }
});

app.use((_req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found.",
  });
});

app.listen(env.PORT, () => {
  console.log(`Bioma backend listening on http://0.0.0.0:${env.PORT}`);
});

function parseBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  body: unknown,
): z.infer<TSchema> {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new AppError("Invalid request body.", {
      statusCode: 400,
      code: "INVALID_REQUEST_BODY",
      cause: parsed.error.flatten(),
    });
  }

  return parsed.data;
}

function parseQueryUserId(req: Request): string {
  const userId = req.query.userId;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new AppError("userId query parameter is required.", {
      statusCode: 400,
      code: "MISSING_USER_ID",
    });
  }

  return userId;
}

function handleError(res: Response, error: unknown, context: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: error.expose ? error.cause ?? null : null,
    });
    return;
  }

  console.error(`Unhandled error while ${context}`, error);

  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error.",
  });
}

function serializeMealLog(log: {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  imageUrl: string | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  confidence: string;
  ingredients: unknown;
  warnings: unknown;
  createdAt: Date;
}) {
  return {
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
    ingredients: Array.isArray(log.ingredients) ? log.ingredients : [],
    warnings: Array.isArray(log.warnings) ? log.warnings : [],
    createdAt: log.createdAt.toISOString(),
  };
}
