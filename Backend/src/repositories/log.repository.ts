import {
  type AnalysisConfidence,
  type Log,
  type LogSource,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import type { NutritionAnalysis } from "../contracts/nutrition-analysis.js";
import { AppError } from "../lib/app-error.js";

/**
 * Map a Prisma "record not found" error (P2025 / foreign-key violation)
 * into our standard AppError. Centralised here so the service layer can
 * rely on a single shape regardless of where the lookup happens.
 */
function notFoundOrRethrow(error: unknown, message: string, code: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2025" || error.code === "P2003")
  ) {
    throw new AppError(message, { statusCode: 404, code, cause: error });
  }
  throw error;
}

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
  aiSuggestion: unknown | null;
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
    // The JWT (validated by `requireAuth` upstream) guarantees the user
    // exists, so we skip the redundant `findUnique` and let the FK
    // constraint catch any stale state.
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

    try {
      return await this.db.log.create({ data: logData });
    } catch (error) {
      notFoundOrRethrow(error, "User not found.", "USER_NOT_FOUND");
    }
  }

  async getUserLogs(
    userId: string,
    opts?: { from?: Date; to?: Date; limit?: number; cursor?: string },
  ): Promise<MealLogSummary[]> {
    const logs = await this.db.log.findMany({
      where: {
        userId,
        type: "MEAL_ANALYSIS",
        createdAt: {
          gte: opts?.from,
          lte: opts?.to,
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(opts?.limit ?? 50, 1), 200),
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
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
        aiSuggestion: true,
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
      aiSuggestion: log.aiSuggestion ?? null,
      ingredients: Array.isArray(log.ingredients) ? log.ingredients : [],
      warnings: Array.isArray(log.warnings) ? (log.warnings as string[]) : [],
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async getLogSuggestion(
    userId: string,
    logId: string,
  ): Promise<unknown | null> {
    // Scope to userId to prevent cross-user `aiSuggestion` reads. The
    // JWT identifies the caller; an attacker who guesses a foreign
    // logId would otherwise get the suggestion back.
    const log = await this.db.log.findFirst({
      where: { id: logId, userId },
      select: { aiSuggestion: true },
    });
    return log?.aiSuggestion ?? null;
  }

  async saveMealSuggestion(
    userId: string,
    logId: string,
    suggestion: unknown,
  ): Promise<void> {
    const existing = await this.db.log.findFirst({
      where: { id: logId, userId },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError("Log not found.", {
        statusCode: 404,
        code: "LOG_NOT_FOUND",
      });
    }
    await this.db.log.update({
      where: { id: existing.id },
      data: {
        aiSuggestion:
          suggestion !== undefined ? (suggestion as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }
}
