import { type PrismaClient, type BodyMetric, BodyMetricType, type UserProfile } from "@prisma/client";

import type { BodyMetricType as BodyMetricTypeName } from "../contracts/body-metric-request.js";

export interface CreateBodyMetricInput {
  userId: string;
  type: BodyMetricTypeName;
  value: number;
  unit: string;
  notes?: string;
  recordedAt?: Date;
}

export class BodyMetricRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateBodyMetricInput): Promise<BodyMetric> {
    return this.prisma.bodyMetric.create({
      data: {
        userId: input.userId,
        type: input.type as BodyMetricType,
        value: input.value,
        unit: input.unit,
        notes: input.notes ?? null,
        recordedAt: input.recordedAt ?? new Date(),
      },
    });
  }

  async list(
    userId: string,
    opts?: {
      type?: BodyMetricTypeName;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<BodyMetric[]> {
    return this.prisma.bodyMetric.findMany({
      where: {
        userId,
        type: opts?.type ? (opts.type as BodyMetricType) : undefined,
        recordedAt: {
          gte: opts?.from,
          lte: opts?.to,
        },
      },
      orderBy: { recordedAt: "desc" },
      take: opts?.limit ?? 100,
    });
  }

  async latestOfType(userId: string, type: BodyMetricTypeName): Promise<BodyMetric | null> {
    return this.prisma.bodyMetric.findFirst({
      where: { userId, type: type as BodyMetricType },
      orderBy: { recordedAt: "desc" },
    });
  }

  async delete(userId: string, id: string): Promise<BodyMetric | null> {
    const existing = await this.prisma.bodyMetric.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;
    return this.prisma.bodyMetric.delete({ where: { id: existing.id } });
  }
}

export class NutritionPlanService {
  constructor(private prisma: PrismaClient) {}

  async ensurePlanForProfile(userId: string, profile: UserProfile | null) {
    if (!profile || !profile.weightKg || !profile.heightCm || !profile.age) {
      return null;
    }

    const existing = await this.prisma.nutritionPlan.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    const tdee = computeTdee(profile);
    if (!tdee) return null;

    const macros = splitMacros(tdee.targetCalories, profile.goal ?? "MAINTAIN");

    return this.prisma.nutritionPlan.create({
      data: {
        userId,
        dailyCalories: tdee.targetCalories,
        proteinGrams: macros.proteinGrams,
        carbsGrams: macros.carbsGrams,
        fatGrams: macros.fatGrams,
        proteinPercentage: macros.proteinPercentage,
        carbsPercentage: macros.carbsPercentage,
        fatPercentage: macros.fatPercentage,
        bmr: tdee.bmr,
        tdee: tdee.maintenanceCalories,
        source: "mifflin_st_jeor",
      },
    });
  }

  async get(userId: string) {
    return this.prisma.nutritionPlan.findUnique({ where: { userId } });
  }

  async recompute(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return null;

    const tdee = computeTdee(profile);
    if (!tdee) return null;
    const macros = splitMacros(tdee.targetCalories, profile.goal ?? "MAINTAIN");

    return this.prisma.nutritionPlan.upsert({
      where: { userId },
      create: {
        userId,
        dailyCalories: tdee.targetCalories,
        proteinGrams: macros.proteinGrams,
        carbsGrams: macros.carbsGrams,
        fatGrams: macros.fatGrams,
        proteinPercentage: macros.proteinPercentage,
        carbsPercentage: macros.carbsPercentage,
        fatPercentage: macros.fatPercentage,
        bmr: tdee.bmr,
        tdee: tdee.maintenanceCalories,
        source: "mifflin_st_jeor",
        generatedAt: new Date(),
      },
      update: {
        dailyCalories: tdee.targetCalories,
        proteinGrams: macros.proteinGrams,
        carbsGrams: macros.carbsGrams,
        fatGrams: macros.fatGrams,
        proteinPercentage: macros.proteinPercentage,
        carbsPercentage: macros.carbsPercentage,
        fatPercentage: macros.fatPercentage,
        bmr: tdee.bmr,
        tdee: tdee.maintenanceCalories,
        source: "mifflin_st_jeor",
        generatedAt: new Date(),
      },
    });
  }
}

interface TdeeResult {
  bmr: number;
  maintenanceCalories: number;
  targetCalories: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const GOAL_CALORIE_DELTA: Record<string, number> = {
  LOSE_WEIGHT: -0.2,
  MAINTAIN: 0,
  GAIN_WEIGHT: 0.15,
};

export function computeTdee(profile: {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: string | null;
  workoutFrequency: string | null;
  goal: string | null;
}): TdeeResult | null {
  if (!profile.weightKg || !profile.heightCm || !profile.age) return null;

  const base = 10 * profile.weightKg + 6.5 * profile.heightCm - 5 * profile.age;
  const bmr =
    profile.gender === "FEMALE" ? base - 161 : base + 5; // covers MALE, NON_BINARY and unknown

  const activity = resolveActivityLevel(
    profile.activityLevel,
    profile.workoutFrequency,
  );
  const multiplier = ACTIVITY_MULTIPLIERS[activity] ?? 1.2;
  const maintenanceCalories = bmr * multiplier;

  const goalKey = profile.goal ?? "MAINTAIN";
  const delta = GOAL_CALORIE_DELTA[goalKey] ?? 0;
  const targetCalories = Math.max(1200, Math.round(maintenanceCalories * (1 + delta)));

  return {
    bmr: Math.round(bmr),
    maintenanceCalories: Math.round(maintenanceCalories),
    targetCalories,
  };
}

function resolveActivityLevel(
  activityLevel: string | null,
  workoutFrequency: string | null,
): string {
  if (activityLevel) return activityLevel;
  switch (workoutFrequency) {
    case "LOW":
      return "LIGHT";
    case "MEDIUM":
      return "MODERATE";
    case "HIGH":
      return "ACTIVE";
    default:
      return "SEDENTARY";
  }
}

export function splitMacros(totalCalories: number, goal: string) {
  // 30% protein / 50% carbs / 20% fat baseline, adjusted for goal
  let proteinPct = 0.3;
  let carbsPct = 0.5;
  let fatPct = 0.2;

  if (goal === "LOSE_WEIGHT") {
    proteinPct = 0.35;
    carbsPct = 0.4;
    fatPct = 0.25;
  } else if (goal === "GAIN_WEIGHT") {
    proteinPct = 0.25;
    carbsPct = 0.55;
    fatPct = 0.2;
  }

  return {
    proteinGrams: Math.round((totalCalories * proteinPct) / 4),
    carbsGrams: Math.round((totalCalories * carbsPct) / 4),
    fatGrams: Math.round((totalCalories * fatPct) / 9),
    proteinPercentage: Math.round(proteinPct * 100),
    carbsPercentage: Math.round(carbsPct * 100),
    fatPercentage: Math.round(fatPct * 100),
  };
}
