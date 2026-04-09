import {
  type AnalysisConfidence,
  type Log,
  type LogSource,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import type { NutritionAnalysis } from "../contracts/nutrition-analysis.js";
import { AppError } from "../lib/app-error.js";

export interface MealLogSummary {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  imageUrl: string | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number | null;
  sugarGrams: number | null;
  sodiumMg: number | null;
  confidence: string;
  ingredients: unknown[];
  warnings: string[];
  createdAt: string;
}

export interface CreateMealLogParams {
  userId: string;
  source: LogSource;
  mealLabel?: string;
  notes?: string;
  consumedAt?: string;
  imageBucket?: string;
  imageKey?: string;
  imageUrl?: string;
  analysis: NutritionAnalysis;
  aiModel: string;
}

export class LogRepository {
  constructor(private readonly db: PrismaClient) {}

  async createMealAnalysisLog(params: CreateMealLogParams): Promise<Log> {
    const user = await this.db.user.findUnique({
      where: {
        id: params.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new AppError("User not found.", {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }

    const logData: Prisma.LogUncheckedCreateInput = {
      userId: params.userId,
      type: "MEAL_ANALYSIS",
      source: params.source,
      title: params.mealLabel ?? params.analysis.mealName,
      notes: params.notes,
      imageBucket: params.imageBucket,
      imageKey: params.imageKey,
      imageUrl: params.imageUrl,
      consumedAt: params.consumedAt
        ? new Date(params.consumedAt)
        : undefined,
      estimatedServingGrams: params.analysis.estimatedServingGrams,
      calories: params.analysis.total.calories,
      proteinGrams: params.analysis.total.proteinGrams,
      carbsGrams: params.analysis.total.carbsGrams,
      fatGrams: params.analysis.total.fatGrams,
      fiberGrams: params.analysis.total.fiberGrams ?? undefined,
      sugarGrams: params.analysis.total.sugarGrams ?? undefined,
      sodiumMg: params.analysis.total.sodiumMg ?? undefined,
      confidence: params.analysis.confidence as AnalysisConfidence,
      aiModel: params.aiModel,
      ingredients: params.analysis.items,
      warnings: params.analysis.warnings,
      rawAnalysis: params.analysis,
    };

    return this.db.log.create({
      data: logData,
    });
  }

  async getUserLogs(userId: string): Promise<MealLogSummary[]> {
    const logs = await this.db.log.findMany({
      where: { userId, type: "MEAL_ANALYSIS" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        imageUrl: true,
        calories: true,
        proteinGrams: true,
        carbsGrams: true,
        fatGrams: true,
        fiberGrams: true,
        sugarGrams: true,
        sodiumMg: true,
        confidence: true,
        ingredients: true,
        warnings: true,
        createdAt: true,
      },
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      type: log.type,
      title: log.title,
      imageUrl: log.imageUrl,
      calories: log.calories,
      proteinGrams: log.proteinGrams,
      carbsGrams: log.carbsGrams,
      fatGrams: log.fatGrams,
      fiberGrams: log.fiberGrams,
      sugarGrams: log.sugarGrams,
      sodiumMg: log.sodiumMg,
      confidence: log.confidence,
      ingredients: Array.isArray(log.ingredients) ? log.ingredients : [],
      warnings: Array.isArray(log.warnings) ? (log.warnings as string[]) : [],
      createdAt: log.createdAt.toISOString(),
    }));
  }
}
