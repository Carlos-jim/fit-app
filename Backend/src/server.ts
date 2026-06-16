import cors from "cors";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
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
import { generateTipsRequestSchema } from "./contracts/generate-tips-request.js";
import { suggestMealRequestSchema } from "./contracts/suggest-meal-request.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { AppError } from "./lib/app-error.js";
import { prisma } from "./lib/prisma.js";
import { LogRepository } from "./repositories/log.repository.js";
import { OnboardingRepository } from "./repositories/onboarding.repository.js";
import { UserProfileRepository } from "./repositories/user-profile.repository.js";
import { UserRepository } from "./repositories/user.repository.js";
import { AuthService } from "./services/auth.service.js";
import { NutritionAnalysisService } from "./services/nutrition-analysis.service.js";
import { SupabaseStorageService } from "./services/supabase-storage.service.js";
import { TipsService } from "./services/tips.service.js";

const isProduction = process.env.NODE_ENV === "production";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: isProduction ? 0.1 : 0.0,
    beforeSend(event) {
      // Scrub PII from Sentry events
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
        delete event.request.headers?.["x-api-key"];
        if (event.request.data && typeof event.request.data === "string") {
          event.request.data = "[REDACTED]";
        }
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

const app = express();
const userRepository = new UserRepository(prisma);
const logRepository = new LogRepository(prisma);
const onboardingRepository = new OnboardingRepository(prisma);
const userProfileRepository = new UserProfileRepository(prisma);
const authService = new AuthService(prisma);
const nutritionAnalysisService = new NutritionAnalysisService();
const tipsService = new TipsService();
const storageService = new SupabaseStorageService();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://*.googleusercontent.com", "https://*.supabase.co"],
            imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://*.googleusercontent.com"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// Force HTTPS in production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] === "https" || req.secure) {
      return next();
    }
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
}

// CORS
const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.use(express.json({ limit: "2mb" }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many requests." },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many auth attempts." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || "unknown",
  message: { error: "TOO_MANY_REQUESTS", message: "AI quota exceeded." },
});

app.use(generalLimiter);
app.use("/auth/", authLimiter);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      data: {
        ok: true,
        service: "bioma-backend",
        database: "connected",
      },
    });
  } catch {
    res.status(503).json({
      error: {
        message: "Database unavailable",
        service: "bioma-backend",
        database: "disconnected",
      },
    });
  }
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
        plan: user.plan,
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
    const result = await authService.register(request);
    res.status(201).json({ data: result });
  } catch (error) {
    handleError(res, error, "registering user");
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const request = parseBody(loginRequestSchema, req.body);
    const result = await authService.loginWithEmail(request);
    res.status(200).json({ data: result });
  } catch (error) {
    handleError(res, error, "logging in user");
  }
});

app.post("/auth/google", async (req, res) => {
  try {
    const request = parseBody(googleLoginRequestSchema, req.body);
    const result = await authService.loginWithGoogle({
      idToken: request.idToken,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    handleError(res, error, "logging in with Google");
  }
});

app.post("/auth/refresh", async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (typeof refreshToken !== "string") {
      throw new AppError("Refresh token is required.", {
        statusCode: 400,
        code: "MISSING_REFRESH_TOKEN",
      });
    }
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({ data: tokens });
  } catch (error) {
    handleError(res, error, "refreshing token");
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (typeof refreshToken === "string") {
      await authService.logout(refreshToken);
    }
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    handleError(res, error, "logging out");
  }
});

// ─── Onboarding endpoints ─────────────────────────────────────────

app.post("/onboarding/step/1", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep1Schema, req.body);
    const session = await onboardingRepository.updateStep1(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 1");
  }
});

app.post("/onboarding/step/2", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep2Schema, req.body);
    const session = await onboardingRepository.updateStep2(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 2");
  }
});

app.post("/onboarding/step/3", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep3Schema, req.body);
    const session = await onboardingRepository.updateStep3(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 3");
  }
});

app.post("/onboarding/step/4", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep4Schema, req.body);
    const session = await onboardingRepository.updateStep4(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 4");
  }
});

app.post("/onboarding/step/5", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep5Schema, req.body);
    const session = await onboardingRepository.updateStep5(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 5");
  }
});

app.post("/onboarding/step/6", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep6Schema, req.body);
    const session = await onboardingRepository.updateStep6(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 6");
  }
});

app.post("/onboarding/step/7", requireAuth, async (req, res) => {
  try {
    const request = parseBody(onboardingStep7Schema, req.body);
    const session = await onboardingRepository.updateStep7(getUserId(req), request);
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "saving onboarding step 7");
  }
});

app.get("/onboarding/session", requireAuth, async (req, res) => {
  try {
    const session = await onboardingRepository.getSession(getUserId(req));
    res.status(200).json({ data: session });
  } catch (error) {
    handleError(res, error, "fetching onboarding session");
  }
});

app.delete("/onboarding/session", requireAuth, async (req, res) => {
  try {
    const session = await onboardingRepository.getSession(getUserId(req));

    if (session) {
      await userProfileRepository.upsertFromOnboarding(getUserId(req), {
        goal: session.goal,
        weightKg: session.weightKg,
        heightCm: session.heightCm,
        desiredWeightKg: session.desiredWeightKg,
        gender: session.gender,
        age: session.age,
        country: session.country,
        workoutFrequency: session.workoutFrequency,
        activityLevel: session.activityLevel,
        dietaryPrefs: session.dietaryPrefs,
      });
    }

    await onboardingRepository.deleteSession(getUserId(req));
    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    handleError(res, error, "deleting onboarding session");
  }
});

app.post("/uploads/meal-image-url", requireAuth, async (req, res) => {
  try {
    const request = parseBody(createMealUploadUrlRequestSchema, req.body);
    const upload = await storageService.createMealImageUploadUrl({
      userId: getUserId(req),
      fileName: request.fileName,
      contentType: request.contentType,
    });

    console.log("[upload-meal-image-url] Signed URL created", {
      userId: getUserId(req),
      fileName: request.fileName,
      contentType: request.contentType,
      bucket: upload.bucket,
      path: upload.path,
    });

    res.status(200).json({
      data: upload,
    });
  } catch (error) {
    console.error("[upload-meal-image-url] Error:", error);
    handleError(res, error, "creating upload URL");
  }
});

app.post("/logs/analyze-meal-image", requireAuth, aiLimiter, async (req, res) => {
  try {
    const request = parseBody(analyzeMealRequestSchema, req.body);

    console.log("[analyze-meal-image] Request received", {
      userId: getUserId(req),
      hasPath: !!request.path,
      hasBase64: !!request.base64Image,
      mealLabel: request.mealLabel,
      consumedAt: request.consumedAt,
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

      console.log("[analyze-meal-image] Using provided base64 image", {
        length: request.base64Image.length,
      });
    } else {
      if (!request.path) {
        throw new AppError("Path is required when base64Image is not provided.", { statusCode: 400, code: "MISSING_PATH" });
      }

      const imageAsset = await storageService.getImage({
        bucket: request.bucket,
        path: request.path,
      });

      console.log("[analyze-meal-image] Image fetched from storage", {
        bucket: imageAsset.bucket,
        path: imageAsset.path,
        contentType: imageAsset.contentType,
        bytes: imageAsset.bytes.length,
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

    console.log("[analyze-meal-image] AI analysis done", {
      model: analysisResult.model,
      mealName: analysisResult.parsed.mealName,
      confidence: analysisResult.parsed.confidence,
      calories: analysisResult.parsed.total.calories,
    });

    const log = await logRepository.createMealAnalysisLog({
      userId: getUserId(req),
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

    console.log("[analyze-meal-image] Log saved", { logId: log.id });

    const response = serializeMealLog(log);

    res.status(201).json({
      data: response,
    });
  } catch (error) {
    console.error("[analyze-meal-image] Error:", error);
    handleError(res, error, "processing meal image analysis");
  }
});

app.post("/logs/analyze-meal-text", requireAuth, aiLimiter, async (req, res) => {
  try {
    const request = parseBody(analyzeMealTextRequestSchema, req.body);
    const analysisResult = await nutritionAnalysisService.analyzeFromText({
      description: request.description,
      mealLabel: request.mealLabel,
    });

    const log = await logRepository.createMealAnalysisLog({
      userId: getUserId(req),
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

app.post("/logs/analyze-menu-image", requireAuth, aiLimiter, async (req, res) => {
  try {
    const request = parseBody(analyzeMenuRequestSchema, req.body);

    // Basic URL validation to prevent SSRF / arbitrary fetches
    const url = new URL(request.imageUrl);
    if (!/^https?:$/.test(url.protocol)) {
      throw new AppError("Invalid image URL protocol.", {
        statusCode: 400,
        code: "INVALID_IMAGE_URL",
      });
    }

    const allowedHosts = env.ALLOWED_IMAGE_HOSTS
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const supabaseHost = new URL(env.SUPABASE_URL).host.toLowerCase();
    const isAllowedHost =
      allowedHosts.includes(url.host.toLowerCase()) ||
      url.host.toLowerCase() === supabaseHost;

    if (!isAllowedHost) {
      throw new AppError("Image URL host is not allowed.", {
        statusCode: 400,
        code: "INVALID_IMAGE_URL_HOST",
      });
    }

    console.log("[analyze-menu-image] Request received", {
      userId: getUserId(req),
    });

    const menuAnalysisResult = await nutritionAnalysisService.analyzeMenuImage(
      request.imageUrl,
    );

    console.log("[analyze-menu-image] AI analysis done", {
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

app.get("/logs", requireAuth, async (req, res) => {
  try {
    const logs = await logRepository.getUserLogs(getUserId(req));
    res.status(200).json({ data: logs });
  } catch (error) {
    handleError(res, error, "fetching meal logs");
  }
});

app.post("/logs/suggest-meal", requireAuth, aiLimiter, async (req, res) => {
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

app.post("/tips/generate", requireAuth, aiLimiter, async (req, res) => {
  try {
    const request = parseBody(generateTipsRequestSchema, req.body);
    const profile = await userProfileRepository.getByUserId(getUserId(req));

    if (!profile) {
      throw new AppError("User profile not found. Complete onboarding first.", {
        statusCode: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentMeals = await prisma.log.findMany({
      where: {
        userId: getUserId(req),
        type: "MEAL_ANALYSIS",
        createdAt: { gte: oneWeekAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        title: true,
        calories: true,
        proteinGrams: true,
        carbsGrams: true,
        fatGrams: true,
        createdAt: true,
      },
    });

    const weekKey = getWeekYearKey(new Date());

    if (!request.force) {
      const existing = await prisma.tip.findFirst({
        where: { userId: getUserId(req), weekYear: weekKey },
      });

      if (existing) {
        const tips = await prisma.tip.findMany({
          where: { userId: getUserId(req), weekYear: weekKey },
          orderBy: { createdAt: "asc" },
        });
        res.status(200).json({ data: tips });
        return;
      }
    }

    const generated = await tipsService.generateWeeklyTips({
      profile: {
        goal: profile.goal,
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
        desiredWeightKg: profile.desiredWeightKg,
        gender: profile.gender,
        age: profile.age,
        country: profile.country,
        workoutFrequency: profile.workoutFrequency,
        activityLevel: profile.activityLevel,
      },
      recentMeals: recentMeals.map((m) => ({
        title: m.title,
        calories: m.calories,
        proteinGrams: m.proteinGrams,
        carbsGrams: m.carbsGrams,
        fatGrams: m.fatGrams,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    await prisma.tip.deleteMany({
      where: { userId: getUserId(req), weekYear: weekKey },
    });

    await prisma.tip.createMany({
      data: generated.tips.map((tip) => ({
        userId: getUserId(req),
        title: tip.title,
        body: tip.body,
        category: tip.category,
        icon: tip.icon ?? null,
        weekYear: weekKey,
      })),
    });

    const tips = await prisma.tip.findMany({
      where: { userId: getUserId(req), weekYear: weekKey },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ data: tips });
  } catch (error) {
    handleError(res, error, "generating weekly tips");
  }
});

app.get("/tips", requireAuth, async (req, res) => {
  try {
    const weekKey = getWeekYearKey(new Date());

    const tips = await prisma.tip.findMany({
      where: { userId: getUserId(req), weekYear: weekKey },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ data: tips });
  } catch (error) {
    handleError(res, error, "fetching weekly tips");
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
  console.log("Registered routes:");
  console.log("  POST /auth/register");
  console.log("  POST /auth/login");
  console.log("  POST /auth/google");
  console.log("  POST /auth/logout");
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

function getUserId(req: Request): string {
  if (!req.user) {
    throw new AppError("Authentication required.", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
  return req.user.id;
}

function handleError(res: Response, error: unknown, context: string): void {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      Sentry.captureException(error, { extra: { context } });
    }
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: !isProduction && error.expose ? (error.cause ?? null) : null,
    });
    return;
  }

  Sentry.captureException(error, { extra: { context } });
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

function getWeekYearKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
