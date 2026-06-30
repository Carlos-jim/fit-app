import { type PrismaClient } from "@prisma/client";

import { logger } from "../lib/logger.js";

const log = logger.child("data-export");

/**
 * GDPR/Ley-1581 data-portability service.
 *
 * SOLID notes
 * ───────────
 * • SRP — produces a single JSON snapshot of every row that references
 *   the user. No mutation, no email, no auth — those are caller concerns.
 * • DIP — depends only on {@link PrismaClient}.
 *
 * The payload schema is stable so that future importers can rely on it.
 */
export interface DataExportPayload {
  exportedAt: string;
  schemaVersion: 1;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    authProvider: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    plan: string;
    planStartedAt: string | null;
    planExpiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  profile: unknown | null;
  nutritionPlan: unknown | null;
  onboardingSession: unknown | null;
  bodyMetrics: unknown[];
  logs: unknown[];
  tips: unknown[];
}

export class DataExportService {
  constructor(private prisma: PrismaClient) {}

  async exportFor(userId: string): Promise<DataExportPayload> {
    log.info("Data export requested", { userId });

    const [user, profile, plan, session, metrics, logs, tips] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.nutritionPlan.findUnique({ where: { userId } }),
      this.prisma.onboardingSession.findUnique({ where: { userId } }),
      this.prisma.bodyMetric.findMany({
        where: { userId },
        orderBy: { recordedAt: "desc" },
      }),
      this.prisma.log.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      this.prisma.tip.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      user: user
        ? {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            authProvider: user.authProvider,
            emailVerified: user.emailVerified,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
            plan: user.plan,
            planStartedAt: user.planStartedAt?.toISOString() ?? null,
            planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          }
        : null,
      profile: profile
        ? {
            id: profile.id,
            goal: profile.goal,
            weightKg: profile.weightKg,
            heightCm: profile.heightCm,
            desiredWeightKg: profile.desiredWeightKg,
            gender: profile.gender,
            age: profile.age,
            country: profile.country,
            workoutFrequency: profile.workoutFrequency,
            activityLevel: profile.activityLevel,
            dietaryPrefs: profile.dietaryPrefs,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
      nutritionPlan: plan
        ? {
            id: plan.id,
            dailyCalories: plan.dailyCalories,
            proteinGrams: plan.proteinGrams,
            carbsGrams: plan.carbsGrams,
            fatGrams: plan.fatGrams,
            proteinPercentage: plan.proteinPercentage,
            carbsPercentage: plan.carbsPercentage,
            fatPercentage: plan.fatPercentage,
            bmr: plan.bmr,
            tdee: plan.tdee,
            source: plan.source,
            generatedAt: plan.generatedAt.toISOString(),
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString(),
          }
        : null,
      onboardingSession: session
        ? {
            id: session.id,
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
            completed: session.completed,
            currentStep: session.currentStep,
            totalSteps: session.totalSteps,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString(),
          }
        : null,
      bodyMetrics: metrics.map((m) => ({
        id: m.id,
        type: m.type,
        value: m.value,
        unit: m.unit,
        notes: m.notes,
        recordedAt: m.recordedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
      logs: logs.map((l) => ({
        id: l.id,
        type: l.type,
        source: l.source,
        title: l.title,
        notes: l.notes,
        imageBucket: l.imageBucket,
        imageKey: l.imageKey,
        imageUrl: l.imageUrl,
        consumedAt: l.consumedAt?.toISOString() ?? null,
        estimatedServingGrams: l.estimatedServingGrams,
        calories: l.calories,
        proteinGrams: l.proteinGrams,
        carbsGrams: l.carbsGrams,
        fatGrams: l.fatGrams,
        fiberGrams: l.fiberGrams,
        sugarGrams: l.sugarGrams,
        sodiumMg: l.sodiumMg,
        confidence: l.confidence,
        aiModel: l.aiModel,
        createdAt: l.createdAt.toISOString(),
      })),
      tips: tips.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.body,
        category: t.category,
        icon: t.icon,
        weekYear: t.weekYear,
        generatedAt: t.generatedAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }
}