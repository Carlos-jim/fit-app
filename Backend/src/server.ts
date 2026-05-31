import cors from "cors";
import express, { type Request, type Response } from "express";
import { z } from "zod";

import { env } from "./config/env.js";
import { analyzeMealRequestSchema } from "./contracts/analyze-meal-request.js";
import { analyzeMenuRequestSchema } from "./contracts/analyze-menu-request.js";
import { analyzeMealTextRequestSchema } from "./contracts/analyze-meal-text-request.js";
import { bootstrapUserRequestSchema } from "./contracts/bootstrap-user-request.js";
import { createMealUploadUrlRequestSchema } from "./contracts/create-meal-upload-url-request.js";
import {
  googleLoginRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
} from "./contracts/auth-request.js";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
  onboardingStep7Schema,
} from "./contracts/onboarding-request.js";
import { suggestMealRequestSchema } from "./contracts/suggest-meal-request.js";
import { AppError } from "./lib/app-error.js";
import { prisma } from "./lib/prisma.js";
import { LogRepository } from "./repositories/log.repository.js";
import { OnboardingRepository } from "./repositories/onboarding.repository.js";
import { UserRepository } from "./repositories/user.repository.js";
import { AuthService } from "./services/auth.service.js";
import { NutritionAnalysisService } from "./services/nutrition-analysis.service.js";
import { SupabaseStorageService } from "./services/supabase-storage.service.js";

const app = express();
const userRepository = new UserRepository(prisma);
const logRepository = new LogRepository(prisma);
const onboardingRepository = new OnboardingRepository(prisma);
const authService = new AuthService(prisma);
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

// ─── Auth endpoints ────────────────────────────────────────────────

app.post("/auth/register", async (req, res) => {
  try {
    const request = parseBody(registerRequestSchema, req.body);
    const user = await authService.register(request);
    res.status(201).json({ data: user });
  } catch (error) {
    handleError(res, error, "registering user");
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const request = parseBody(loginRequestSchema, req.body);
    const user = await authService.loginWithEmail(request);
    res.status(200).json({ data: user });
  } catch (error) {
    handleError(res, error, "logging in user");
  }
});

app.post("/auth/google", async (req, res) => {
  try {
    const request = parseBody(googleLoginRequestSchema, req.body);
    // In production, verify the Google ID token here
    // For now, we'll create/login the user directly
    // You would normally use google-auth-library to verify the token
    const user = await authService.loginWithGoogle({
      idToken: request.idToken,
    });
    res.status(200).json({ data: user });
  } catch (error) {
    handleError(res, error, "logging in with Google");
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    // In a mature app, you'd invalidate tokens or sessions here.
    // We just return a success payload for now.
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    handleError(res, error, "logging out");
  }
});

// ─── Onboarding endpoints ─────────────────────────────────────────

app.post("/onboarding/step/1", async (req, res) => {
  try {
    const request = parseBody(onboardingStep1Schema, req.body);
    const session = await onboardingRepository.updateStep1(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 1");
  }
});

app.post("/onboarding/step/2", async (req, res) => {
  try {
    const request = parseBody(onboardingStep2Schema, req.body);
    const session = await onboardingRepository.updateStep2(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 2");
  }
});

app.post("/onboarding/step/3", async (req, res) => {
  try {
    const request = parseBody(onboardingStep3Schema, req.body);
    const session = await onboardingRepository.updateStep3(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 3");
  }
});

app.post("/onboarding/step/4", async (req, res) => {
  try {
    const request = parseBody(onboardingStep4Schema, req.body);
    const session = await onboardingRepository.updateStep4(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 4");
  }
});

app.post("/onboarding/step/5", async (req, res) => {
  try {
    const request = parseBody(onboardingStep5Schema, req.body);
    const session = await onboardingRepository.updateStep5(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 5");
  }
});

app.post("/onboarding/step/6", async (req, res) => {
  try {
    const request = parseBody(onboardingStep6Schema, req.body);
    const session = await onboardingRepository.updateStep6(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 6");
  }
});

app.post("/onboarding/step/7", async (req, res) => {
  try {
    const request = parseBody(onboardingStep7Schema, req.body);
    const session = await onboardingRepository.updateStep7(
      request.userId,
      request,
    );
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 7");
  }
});

app.get("/onboarding/session", async (req, res) => {
  try {
    const userId = parseQueryUserId(req);
    const session = await onboardingRepository.getSession(userId);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "fetching onboarding session");
  }
});

app.delete("/onboarding/session", async (req, res) => {
  try {
    const userId = parseQueryUserId(req);
    await onboardingRepository.deleteSession(userId);
    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    handleError(res, error, "deleting onboarding session");
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

    console.log("[upload-meal-image-url] Signed URL created:", {
      userId: request.userId,
      fileName: request.fileName,
      contentType: request.contentType,
      bucket: upload.bucket,
      path: upload.path,
      fileUrl: upload.fileUrl,
    });

    res.status(200).json({
      data: upload,
    });
  } catch (error) {
    console.error("[upload-meal-image-url] Error:", error);
    handleError(res, error, "creating upload URL");
  }
});

app.post("/logs/analyze-meal-image", async (req, res) => {
  try {
    const request = parseBody(analyzeMealRequestSchema, req.body);

    console.log("[analyze-meal-image] Request received:", {
      userId: request.userId,
      bucket: request.bucket,
      path: request.path,
      mealLabel: request.mealLabel,
      consumedAt: request.consumedAt,
      isLocal: !!request.base64Image,
    });

    let imageDataUrl: string;
    let imageBucket: string | undefined = undefined;
    let imageKey: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;

    if (request.base64Image) {
      imageDataUrl = request.base64Image.startsWith("data:") 
        ? request.base64Image 
        : `data:image/jpeg;base64,${request.base64Image}`;
      imageUrl = request.localImageUrl;
      
      console.log("[analyze-meal-image] Using provided base64 image (length:", request.base64Image.length, ")");
    } else {
      if (!request.path) {
        throw new AppError("Path is required when base64Image is not provided.", { statusCode: 400, code: "MISSING_PATH" });
      }
      
      const imageAsset = await storageService.getImage({
        bucket: request.bucket,
        path: request.path,
      });

      console.log("[analyze-meal-image] Image fetched from storage:", {
        bucket: imageAsset.bucket,
        path: imageAsset.path,
        contentType: imageAsset.contentType,
        bytes: imageAsset.bytes.length,
        publicUrl: imageAsset.publicUrl,
      });
      
      imageBucket = imageAsset.bucket;
      imageKey = imageAsset.path;
      imageUrl = imageAsset.publicUrl;
      imageDataUrl = storageService.toDataUrl(imageAsset);
    }

    const analysisResult = await nutritionAnalysisService.analyzeFromImage({
      imageDataUrl,
      mealLabel: request.mealLabel,
      notes: request.notes,
    });

    console.log("[analyze-meal-image] AI analysis done:", {
      model: analysisResult.model,
      mealName: analysisResult.parsed.mealName,
      confidence: analysisResult.parsed.confidence,
      calories: analysisResult.parsed.total.calories,
    });

    const log = await logRepository.createMealAnalysisLog({
      userId: request.userId,
      source: "IMAGE",
      mealLabel: request.mealLabel,
      notes: request.notes,
      consumedAt: request.consumedAt,
      imageBucket,
      imageKey,
      imageUrl,
      analysis: analysisResult.parsed,
      aiModel: analysisResult.model,
    });

    console.log("[analyze-meal-image] Log saved:", {
      logId: log.id,
      imageUrl: log.imageUrl,
    });

    const response = serializeMealLog(log);

    console.log("[analyze-meal-image] Response imageUrl:", response.imageUrl);

    res.status(201).json({
      data: response,
    });
  } catch (error) {
    console.error("[analyze-meal-image] Error:", error);
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

app.post("/logs/analyze-menu-image", async (req, res) => {
  try {
    const request = parseBody(analyzeMenuRequestSchema, req.body);

    console.log("[analyze-menu-image] Request received:", {
      userId: request.userId,
      imageUrl: request.imageUrl,
    });

    const menuAnalysisResult = await nutritionAnalysisService.analyzeMenuImage(
      request.imageUrl,
    );

    console.log("[analyze-menu-image] AI analysis done:", {
      dishesDetected: menuAnalysisResult.dishesDetected.length,
      recommendedDishes: menuAnalysisResult.recommendedDishes.length,
      dishesToAvoid: menuAnalysisResult.dishesToAvoid.length,
    });

    res.status(200).json({
      data: menuAnalysisResult,
    });
  } catch (error) {
    console.error("[analyze-menu-image] Error:", error);
    handleError(res, error, "processing menu image analysis");
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

    if (request.logId) {
      const cached = await logRepository.getLogSuggestion(request.logId);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    const suggestion =
      await nutritionAnalysisService.suggestMealAlternative(request);

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
      details: error.expose ? (error.cause ?? null) : null,
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
