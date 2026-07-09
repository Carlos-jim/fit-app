import cors from "cors";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { z } from "zod";

import { Prisma } from "@prisma/client";

import { env } from "./config/env.js";
import { analyzeMealRequestSchema } from "./contracts/analyze-meal-request.js";
import { analyzeMenuRequestSchema } from "./contracts/analyze-menu-request.js";
import { analyzeMealTextRequestSchema } from "./contracts/analyze-meal-text-request.js";
import { bootstrapUserRequestSchema } from "./contracts/bootstrap-user-request.js";
import { createMealUploadUrlRequestSchema } from "./contracts/create-meal-upload-url-request.js";
import {
  forgotPasswordRequestSchema,
  googleLoginRequestSchema,
  loginRequestSchema,
  logoutRequestSchema,
  refreshTokenRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from "./contracts/auth-request.js";
import {
  createBodyMetricRequestSchema,
  deleteBodyMetricParamsSchema,
  listBodyMetricsQuerySchema,
} from "./contracts/body-metric-request.js";
import {
  createHydrationRequestSchema,
  deleteHydrationParamsSchema,
  hydrationTodayQuerySchema,
  listHydrationQuerySchema,
} from "./contracts/hydration-request.js";
import {
  createWorkoutRequestSchema,
  listWorkoutsQuerySchema,
  workoutIdParamsSchema,
} from "./contracts/workout-request.js";
import {
  barcodeLookupParamsSchema,
  registerBarcodeMealSchema,
} from "./contracts/food-lookup-request.js";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
  onboardingStep7Schema,
  updateProfileSchema,
} from "./contracts/onboarding-request.js";
import { generateTipsRequestSchema } from "./contracts/generate-tips-request.js";
import { listLogsQuerySchema } from "./contracts/log-request.js";
import { suggestMealRequestSchema } from "./contracts/suggest-meal-request.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { AppError } from "./lib/app-error.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { LogRepository } from "./repositories/log.repository.js";
import { OnboardingRepository } from "./repositories/onboarding.repository.js";
import { UserProfileRepository } from "./repositories/user-profile.repository.js";
import { UserRepository } from "./repositories/user.repository.js";
import { AuthEmailService } from "./services/auth-email.service.js";
import { AuthService } from "./services/auth.service.js";
import { NutritionAnalysisService } from "./services/nutrition-analysis.service.js";
import { AccountDeletionService } from "./services/account-deletion.service.js";
import { DataExportService } from "./services/data-export.service.js";
import { HydrationService } from "./services/hydration.service.js";
import { BodyMetricRepository, NutritionPlanService } from "./services/nutrition-plan.service.js";
import { SupabaseStorageService } from "./services/supabase-storage.service.js";
import { TipsService } from "./services/tips.service.js";
import { WorkoutService } from "./services/workout.service.js";
import { OpenFoodFactsService } from "./services/open-food-facts.service.js";

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

// Trust the first proxy hop (Render, Cloudflare, etc.) so that
// `req.ip`, `req.secure` and `x-forwarded-proto` reflect the real
// client. Without this, rate-limiters keyed on `req.ip` see the
// proxy address for every request and `aiLimiter` (keyed by user)
// is still safe, but `generalLimiter` and `authLimiter` can be
// trivially bypassed by spoofing X-Forwarded-For.
if (isProduction) {
  app.set("trust proxy", 1);
}

const userRepository = new UserRepository(prisma);
const logRepository = new LogRepository(prisma);
const onboardingRepository = new OnboardingRepository(prisma);
const userProfileRepository = new UserProfileRepository(prisma);
const bodyMetricRepository = new BodyMetricRepository(prisma);
const nutritionPlanService = new NutritionPlanService(prisma);
const authEmailService = new AuthEmailService(prisma);
const accountDeletionService = new AccountDeletionService(prisma);
const dataExportService = new DataExportService(prisma);
const hydrationService = new HydrationService(prisma);
const workoutService = new WorkoutService(prisma);
const openFoodFactsService = new OpenFoodFactsService();
const authService = new AuthService(prisma, authEmailService);
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
  validate: { ip: false },
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

app.post("/users/bootstrap", requireAuth, async (req, res) => {
  try {
    const request = parseBody(bootstrapUserRequestSchema, req.body);

    // Auth-protected: the JWT identifies the user; we only let them
    // refresh their own fullName. This used to be unauthenticated and
    // allowed an attacker to mutate anyone's profile by email.
    if (req.user && req.user.email.toLowerCase() !== request.email.toLowerCase()) {
      throw new AppError("Cannot bootstrap another user's profile.", {
        statusCode: 403,
        code: "BOOTSTRAP_EMAIL_MISMATCH",
      });
    }

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
    const request = parseBody(refreshTokenRequestSchema, req.body);
    const tokens = await authService.refreshAccessToken(request.refreshToken);
    res.status(200).json({ data: tokens });
  } catch (error) {
    handleError(res, error, "refreshing token");
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    const request = parseBody(logoutRequestSchema, req.body);
    await authService.logout(request.refreshToken);
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    handleError(res, error, "logging out");
  }
});

// ─── Password reset & email verification ───────────────────────────

app.post("/auth/forgot-password", async (req, res) => {
  try {
    const request = parseBody(forgotPasswordRequestSchema, req.body);
    const result = await authEmailService.requestPasswordReset({ email: request.email });
    res.status(200).json({ data: result });
  } catch (error) {
    handleError(res, error, "requesting password reset");
  }
});

app.post("/auth/reset-password", async (req, res) => {
  try {
    const request = parseBody(resetPasswordRequestSchema, req.body);
    await authEmailService.resetPassword({
      token: request.token,
      newPassword: request.password,
    });
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    handleError(res, error, "resetting password");
  }
});

app.post("/auth/verify-email", async (req, res) => {
  try {
    const request = parseBody(verifyEmailRequestSchema, req.body);
    const user = await authEmailService.verifyEmail({ token: request.token });
    res.status(200).json({
      data: {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    handleError(res, error, "verifying email");
  }
});

app.post("/auth/resend-verification", async (req, res) => {
  try {
    const request = parseBody(resendVerificationRequestSchema, req.body);
    const result = await authEmailService.resendVerification({ email: request.email });
    res.status(200).json({ data: result });
  } catch (error) {
    handleError(res, error, "resending verification email");
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
    const userId = getUserId(req);

    // Promote the onboarding session into the durable UserProfile and
    // delete the session in a single transaction so we never end up
    // with a session-less user that has no profile (or vice versa).
    await prisma.$transaction(async (tx) => {
      const session = await tx.onboardingSession.findUnique({
        where: { userId },
      });

      if (session) {
        await tx.userProfile.upsert({
          where: { userId },
          create: {
            userId,
            goal: session.goal,
            weightKg: session.weightKg,
            heightCm: session.heightCm,
            desiredWeightKg: session.desiredWeightKg,
            gender: session.gender,
            age: session.age,
            country: session.country,
            workoutFrequency: session.workoutFrequency,
            activityLevel: session.activityLevel,
            dietaryPrefs: session.dietaryPrefs ?? Prisma.JsonNull,
          },
          update: {
            goal: session.goal,
            weightKg: session.weightKg,
            heightCm: session.heightCm,
            desiredWeightKg: session.desiredWeightKg,
            gender: session.gender,
            age: session.age,
            country: session.country,
            workoutFrequency: session.workoutFrequency,
            activityLevel: session.activityLevel,
            dietaryPrefs: session.dietaryPrefs ?? Prisma.JsonNull,
          },
        });
      }

      await tx.onboardingSession.deleteMany({ where: { userId } });
    });

    res.status(200).json({ data: { ok: true } });
  } catch (error) {
    handleError(res, error, "deleting onboarding session");
  }
});

// ─── Me (profile + plan) ───────────────────────────────────────────

app.get("/me/profile", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const profile = await userProfileRepository.getByUserId(userId);
    const onboarding = await onboardingRepository.getSession(userId);
    res.status(200).json({
      data: {
        profile: profile ?? null,
        onboarding: onboarding ?? null,
        onboardingComplete: profile !== null,
      },
    });
  } catch (error) {
    handleError(res, error, "fetching user profile");
  }
});

app.patch("/me/profile", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const patch = parseBody(updateProfileSchema, req.body);

    const current = await userProfileRepository.getByUserId(userId);
    const merged = await userProfileRepository.update(userId, {
      goal: patch.goal ?? current?.goal ?? null,
      weightKg: patch.weightKg ?? current?.weightKg ?? null,
      heightCm: patch.heightCm ?? current?.heightCm ?? null,
      desiredWeightKg:
        patch.desiredWeightKg ?? current?.desiredWeightKg ?? null,
      gender: patch.gender ?? current?.gender ?? null,
      age: patch.age ?? current?.age ?? null,
      country: patch.country ?? current?.country ?? null,
      workoutFrequency:
        patch.workoutFrequency ?? current?.workoutFrequency ?? null,
      activityLevel: patch.activityLevel ?? current?.activityLevel ?? null,
      dietaryPrefs:
        patch.dietaryPrefs !== undefined
          ? patch.dietaryPrefs
          : current?.dietaryPrefs ?? null,
    });

    // If goal / weight / height / age changed the plan is now stale.
    const planStaleFields = [
      "goal",
      "weightKg",
      "heightCm",
      "age",
      "activityLevel",
    ] as const;
    const planTouched = planStaleFields.some((k) => k in patch);
    if (planTouched) {
      await nutritionPlanService.recompute(userId);
    }

    res.status(200).json({ data: merged });
  } catch (error) {
    handleError(res, error, "updating profile");
  }
});

app.get("/me/plan", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const profile = await userProfileRepository.getByUserId(userId);

    let plan = await nutritionPlanService.get(userId);
    if (!plan && profile) {
      plan = await nutritionPlanService.ensurePlanForProfile(userId, profile);
    }

    res.status(200).json({ data: plan ?? null });
  } catch (error) {
    handleError(res, error, "fetching nutrition plan");
  }
});

app.post("/me/plan/recompute", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const plan = await nutritionPlanService.recompute(userId);
    if (!plan) {
      throw new AppError("Profile is incomplete. Complete onboarding first.", {
        statusCode: 409,
        code: "PROFILE_INCOMPLETE",
      });
    }
    res.status(200).json({ data: plan });
  } catch (error) {
    handleError(res, error, "recomputing nutrition plan");
  }
});

// ─── GDPR data-portability (right to access) ─────────────────────

app.get("/me/data-export", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const payload = await dataExportService.exportFor(userId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bioma-export-${userId}.json"`,
    );
    res.status(200).json({ data: payload });
  } catch (error) {
    handleError(res, error, "exporting user data");
  }
});

// ─── GDPR right-to-erasure (account deletion) ─────────────────────

app.delete("/me/account", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await accountDeletionService.deleteAccount(userId);
    res.status(200).json({ data: result });
  } catch (error) {
    handleError(res, error, "deleting account");
  }
});

// ─── Maintenance: cleanup of expired tokens & orphaned uploads ────
// Protected by a shared secret (`CLEANUP_TOKEN`) so it can be invoked
// from an external cron (Render Cron Job, GitHub Actions, etc.) without
// requiring user auth. The endpoint is idempotent and only touches
// rows older than the provided threshold.
app.post("/maintenance/cleanup", async (req, res) => {
  try {
    const provided = req.header("x-cleanup-token");
    if (!env.CLEANUP_TOKEN || provided !== env.CLEANUP_TOKEN) {
      throw new AppError("Forbidden.", {
        statusCode: 403,
        code: "CLEANUP_FORBIDDEN",
      });
    }

    const now = new Date();
    const [refreshTokens, emailTokens] = await Promise.all([
      prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.emailToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    res.status(200).json({
      data: {
        refreshTokensDeleted: refreshTokens.count,
        emailTokensDeleted: emailTokens.count,
        ranAt: now.toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, "running maintenance cleanup");
  }
});

// ─── Body metrics (weight, waist, etc.) ────────────────────────────

app.post("/body-metrics", requireAuth, async (req, res) => {
  try {
    const request = parseBody(createBodyMetricRequestSchema, req.body);
    const metric = await bodyMetricRepository.create({
      userId: getUserId(req),
      type: request.type,
      value: request.value,
      unit: request.unit,
      notes: request.notes,
      recordedAt: request.recordedAt ? new Date(request.recordedAt) : undefined,
    });
    res.status(201).json({ data: serializeBodyMetric(metric) });
  } catch (error) {
    handleError(res, error, "creating body metric");
  }
});

app.get("/body-metrics", requireAuth, async (req, res) => {
  try {
    const query = listBodyMetricsQuerySchema.parse(req.query);
    const metrics = await bodyMetricRepository.list(getUserId(req), {
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
    res.status(200).json({ data: metrics.map(serializeBodyMetric) });
  } catch (error) {
    handleError(res, error, "listing body metrics");
  }
});

app.delete("/body-metrics/:id", requireAuth, async (req, res) => {
  try {
    const params = deleteBodyMetricParamsSchema.parse(req.params);
    const deleted = await bodyMetricRepository.delete(getUserId(req), params.id);
    if (!deleted) {
      throw new AppError("Body metric not found.", {
        statusCode: 404,
        code: "BODY_METRIC_NOT_FOUND",
      });
    }
    res.status(200).json({ data: { id: deleted.id } });
  } catch (error) {
    handleError(res, error, "deleting body metric");
  }
});

// ─── Hydration tracking ────────────────────────────────────────────

app.post("/hydration", requireAuth, async (req, res) => {
  try {
    const request = parseBody(createHydrationRequestSchema, req.body);
    const entry = await hydrationService.recordEntry({
      userId: getUserId(req),
      glasses: request.glasses,
      notes: request.notes,
      recordedAt: request.recordedAt ? new Date(request.recordedAt) : undefined,
    });
    res.status(201).json({ data: serializeHydrationEntry(entry) });
  } catch (error) {
    handleError(res, error, "recording hydration entry");
  }
});

app.get("/hydration/today", requireAuth, async (req, res) => {
  try {
    const query = hydrationTodayQuerySchema.parse(req.query);
    const total = await hydrationService.getDailyTotal(
      getUserId(req),
      query.date ? new Date(query.date) : new Date(),
      query.tz,
    );
    res.status(200).json({ data: total });
  } catch (error) {
    handleError(res, error, "fetching today's hydration");
  }
});

app.get("/hydration", requireAuth, async (req, res) => {
  try {
    const query = listHydrationQuerySchema.parse(req.query);
    const entries = await hydrationService.list(getUserId(req), {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
    res.status(200).json({ data: entries.map(serializeHydrationEntry) });
  } catch (error) {
    handleError(res, error, "listing hydration entries");
  }
});

app.delete("/hydration/:id", requireAuth, async (req, res) => {
  try {
    const params = deleteHydrationParamsSchema.parse(req.params);
    const deleted = await hydrationService.deleteEntry(
      getUserId(req),
      params.id,
    );
    if (!deleted) {
      throw new AppError("Hydration entry not found.", {
        statusCode: 404,
        code: "HYDRATION_NOT_FOUND",
      });
    }
    res.status(200).json({ data: { id: deleted.id } });
  } catch (error) {
    handleError(res, error, "deleting hydration entry");
  }
});

// Pop the latest hydration entry for the user's current day. Idempotent
// (404 if there's nothing to delete). Used by the "-1 glass" affordance
// so the client doesn't have to list-then-delete.
app.delete("/hydration/today/latest", requireAuth, async (req, res) => {
  try {
    const query = hydrationTodayQuerySchema.parse(req.query);
    const deleted = await hydrationService.deleteLatestEntryForToday(
      getUserId(req),
      query.date ? new Date(query.date) : new Date(),
      query.tz,
    );
    if (!deleted) {
      throw new AppError("No hydration entry to remove.", {
        statusCode: 404,
        code: "HYDRATION_NOT_FOUND",
      });
    }
    res.status(200).json({ data: { id: deleted.id, glasses: deleted.glasses } });
  } catch (error) {
    handleError(res, error, "deleting latest hydration entry");
  }
});

// ─── Food lookup (barcode → OpenFoodFacts) ───────────────────────
// Public on purpose: scanning a barcode is a read-only lookup and a user
// who hasn't logged in yet still needs to identify products.

app.get("/foods/barcode/:code", async (req, res) => {
  try {
    const params = barcodeLookupParamsSchema.parse(req.params);
    const product = await openFoodFactsService.lookup(params.code);
    res.status(200).json({ data: product });
  } catch (error) {
    handleError(res, error, "looking up barcode");
  }
});

app.post("/foods/barcode/register", requireAuth, aiLimiter, async (req, res) => {
  try {
    const request = parseBody(registerBarcodeMealSchema, req.body);
    const product = await openFoodFactsService.lookup(request.barcode);
    if (!product) {
      throw new AppError("Product not found in OpenFoodFacts.", {
        statusCode: 404,
        code: "FOOD_NOT_FOUND",
      });
    }

    const servingGrams = request.servingGrams ?? 100;
    const factor = servingGrams / 100;
    const round1 = (value: number | null) =>
      value === null ? null : Math.round(value * factor);

    const analysis = {
      mealName: product.productName,
      summary: `${product.productName}${product.brand ? ` (${product.brand})` : ""} — ${servingGrams} g`,
      estimatedServingGrams: servingGrams,
      confidence: "HIGH" as const,
      warnings: [],
      total: {
        calories: round1(product.nutriments.energyKcalPer100g) ?? 0,
        proteinGrams: round1(product.nutriments.proteinGPer100g) ?? 0,
        carbsGrams: round1(product.nutriments.carbsGPer100g) ?? 0,
        fatGrams: round1(product.nutriments.fatGPer100g) ?? 0,
        fiberGrams: round1(product.nutriments.fiberGPer100g),
        sugarGrams: round1(product.nutriments.sugarGPer100g),
        sodiumMg: round1(product.nutriments.sodiumMgPer100g),
      },
      items: [
        {
          name: product.productName,
          estimatedGrams: servingGrams,
          calories: round1(product.nutriments.energyKcalPer100g) ?? 0,
          proteinGrams: round1(product.nutriments.proteinGPer100g) ?? 0,
          carbsGrams: round1(product.nutriments.carbsGPer100g) ?? 0,
          fatGrams: round1(product.nutriments.fatGPer100g) ?? 0,
        },
      ],
    };

    const log = await logRepository.createMealAnalysisLog({
      userId: getUserId(req),
      source: "TEXT",
      mealLabel: request.mealLabel,
      notes:
        request.notes ??
        `Código de barras: ${product.code} (OpenFoodFacts)`,
      consumedAt: request.consumedAt,
      analysis,
      aiModel: "openfoodfacts/v2",
    });

    res.status(201).json({ data: serializeMealLog(log) });
  } catch (error) {
    handleError(res, error, "registering barcode meal");
  }
});

// ─── Workouts ──────────────────────────────────────────────────────

app.post("/workouts", requireAuth, async (req, res) => {
  try {
    const request = parseBody(createWorkoutRequestSchema, req.body);
    const workout = await workoutService.create({
      userId: getUserId(req),
      type: request.type,
      name: request.name,
      durationMinutes: request.durationMinutes,
      caloriesBurned: request.caloriesBurned,
      intensity: request.intensity,
      notes: request.notes,
      performedAt: request.performedAt
        ? new Date(request.performedAt)
        : undefined,
      sets: request.sets,
    });
    res.status(201).json({ data: serializeWorkout(workout) });
  } catch (error) {
    handleError(res, error, "creating workout");
  }
});

app.get("/workouts", requireAuth, async (req, res) => {
  try {
    const query = listWorkoutsQuerySchema.parse(req.query);
    const workouts = await workoutService.list(getUserId(req), {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
    res.status(200).json({ data: workouts.map(serializeWorkout) });
  } catch (error) {
    handleError(res, error, "listing workouts");
  }
});

app.get("/workouts/:id", requireAuth, async (req, res) => {
  try {
    const params = workoutIdParamsSchema.parse(req.params);
    const workout = await workoutService.getById(getUserId(req), params.id);
    if (!workout) {
      throw new AppError("Workout not found.", {
        statusCode: 404,
        code: "WORKOUT_NOT_FOUND",
      });
    }
    res.status(200).json({ data: serializeWorkout(workout) });
  } catch (error) {
    handleError(res, error, "fetching workout");
  }
});

app.delete("/workouts/:id", requireAuth, async (req, res) => {
  try {
    const params = workoutIdParamsSchema.parse(req.params);
    const ok = await workoutService.delete(getUserId(req), params.id);
    if (!ok) {
      throw new AppError("Workout not found.", {
        statusCode: 404,
        code: "WORKOUT_NOT_FOUND",
      });
    }
    res.status(200).json({ data: { id: params.id } });
  } catch (error) {
    handleError(res, error, "deleting workout");
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

    logger.child("uploads").info("Signed URL created", {
      userId: getUserId(req),
      contentType: request.contentType,
      bucket: upload.bucket,
    });

    res.status(200).json({
      data: upload,
    });
  } catch (error) {
    handleError(res, error, "creating upload URL");
  }
});

app.post("/logs/analyze-meal-image", requireAuth, aiLimiter, async (req, res) => {
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
      userId: getUserId(req),
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
    const supabaseProtocol = new URL(env.SUPABASE_URL).protocol;
    const isAllowedHost =
      allowedHosts.includes(url.host.toLowerCase()) ||
      url.host.toLowerCase() === supabaseHost;

    if (!isAllowedHost) {
      throw new AppError("Image URL host is not allowed.", {
        statusCode: 400,
        code: "INVALID_IMAGE_URL_HOST",
      });
    }

    // Ownership check: the signed public URL must live under the user's
    // folder in our Supabase bucket. This prevents the service role from
    // being tricked into fetching other users' (or other buckets') paths.
    const userId = getUserId(req);
    const expectedPrefix = `/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/uploads/meals/${userId}/`;
    const isSupabasePublicUrl =
      url.host.toLowerCase() === supabaseHost &&
      url.protocol === supabaseProtocol;

    if (isSupabasePublicUrl && !url.pathname.startsWith(expectedPrefix)) {
      throw new AppError("Image URL does not belong to the requesting user.", {
        statusCode: 403,
        code: "IMAGE_URL_NOT_OWNED",
      });
    }

    const menuAnalysisResult = await nutritionAnalysisService.analyzeMenuImage(
      request.imageUrl,
    );

    res.status(200).json({
      data: menuAnalysisResult,
    });
  } catch (error) {
    handleError(res, error, "processing menu image analysis");
  }
});

app.get("/logs", requireAuth, async (req, res) => {
  try {
    const query = listLogsQuerySchema.parse(req.query);
    const logs = await logRepository.getUserLogs(getUserId(req), {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      cursor: query.cursor,
    });
    res.status(200).json({
      data: logs,
      pagination: { nextCursor: logs.at(-1)?.id ?? null },
    });
  } catch (error) {
    handleError(res, error, "fetching meal logs");
  }
});

app.post("/logs/suggest-meal", requireAuth, aiLimiter, async (req, res) => {
  try {
    const request = parseBody(suggestMealRequestSchema, req.body);
    const userId = getUserId(req);

    if (request.logId) {
      const cached = await logRepository.getLogSuggestion(userId, request.logId);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    const suggestion =
      await nutritionAnalysisService.suggestMealAlternative(request);

    if (request.logId) {
      await logRepository.saveMealSuggestion(userId, request.logId, suggestion);
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
    const userId = getUserId(req);
    const profile = await userProfileRepository.getByUserId(userId);

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
        userId,
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
        where: { userId, weekYear: weekKey },
      });

      if (existing) {
        const tips = await prisma.tip.findMany({
          where: { userId, weekYear: weekKey },
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

    // Atomic rotate: delete the prior week's tips and insert the new
    // set in a single transaction so two concurrent generations can
    // never leave a duplicate or partial set behind.
    const tips = await prisma.$transaction(async (tx) => {
      await tx.tip.deleteMany({ where: { userId, weekYear: weekKey } });
      await tx.tip.createMany({
        data: generated.tips.map((tip) => ({
          userId,
          title: tip.title,
          body: tip.body,
          category: tip.category,
          icon: tip.icon ?? null,
          weekYear: weekKey,
        })),
      });
      return tx.tip.findMany({
        where: { userId, weekYear: weekKey },
        orderBy: { createdAt: "asc" },
      });
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
  console.log("  POST /auth/forgot-password");
  console.log("  POST /auth/reset-password");
  console.log("  POST /auth/verify-email");
  console.log("  POST /auth/resend-verification");
  console.log("  GET  /me/profile");
  console.log("  PATCH /me/profile");
  console.log("  GET  /me/plan");
  console.log("  POST /me/plan/recompute");
  console.log("  GET  /me/data-export");
  console.log("  DELETE /me/account");
  console.log("  POST /body-metrics");
  console.log("  GET  /body-metrics");
  console.log("  DELETE /body-metrics/:id");
  console.log("  POST /hydration");
  console.log("  GET  /hydration/today");
  console.log("  GET  /hydration");
  console.log("  DELETE /hydration/:id");
  console.log("  POST /workouts");
  console.log("  GET  /workouts");
  console.log("  GET  /workouts/:id");
  console.log("  DELETE /workouts/:id");
  console.log("  GET  /foods/barcode/:code");
  console.log("  POST /foods/barcode/register");
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

function serializeBodyMetric(metric: {
  id: string;
  userId: string;
  type: string;
  value: number;
  unit: string;
  notes: string | null;
  recordedAt: Date;
  createdAt: Date;
}) {
  return {
    id: metric.id,
    userId: metric.userId,
    type: metric.type,
    value: metric.value,
    unit: metric.unit,
    notes: metric.notes,
    recordedAt: metric.recordedAt.toISOString(),
    createdAt: metric.createdAt.toISOString(),
  };
}

function serializeHydrationEntry(entry: {
  id: string;
  userId: string;
  glasses: number;
  notes: string | null;
  recordedAt: Date;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    userId: entry.userId,
    glasses: entry.glasses,
    notes: entry.notes,
    recordedAt: entry.recordedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  };
}

function serializeWorkout(workout: {
  id: string;
  userId: string;
  type: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number | null;
  intensity: string | null;
  notes: string | null;
  performedAt: Date;
  createdAt: Date;
  sets: Array<{
    id: string;
    workoutId: string;
    exercise: string;
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    distanceMeters: number | null;
    orderIndex: number;
  }>;
}) {
  return {
    id: workout.id,
    userId: workout.userId,
    type: workout.type,
    name: workout.name,
    durationMinutes: workout.durationMinutes,
    caloriesBurned: workout.caloriesBurned,
    intensity: workout.intensity,
    notes: workout.notes,
    performedAt: workout.performedAt.toISOString(),
    createdAt: workout.createdAt.toISOString(),
    sets: workout.sets.map((set) => ({
      id: set.id,
      workoutId: set.workoutId,
      exercise: set.exercise,
      reps: set.reps,
      weightKg: set.weightKg,
      durationSec: set.durationSec,
      distanceMeters: set.distanceMeters,
      orderIndex: set.orderIndex,
    })),
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
