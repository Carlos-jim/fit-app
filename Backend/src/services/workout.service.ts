import { type PrismaClient, type Workout, type WorkoutSet, WorkoutType } from "@prisma/client";

import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

const log = logger.child("workout-service");

/**
 * Workout tracking service.
 *
 * SOLID notes
 * ───────────
 * • SRP — owns workout + set persistence. No HTTP, no AI.
 * • DIP — depends only on {@link PrismaClient}.
 *
 * Domain
 * ──────
 * A workout has many sets, each describing one exercise execution
 * (reps × weight for strength, distance × duration for cardio, etc).
 * Sets are written transactionally with the parent workout so we never
 * leave an orphan workout with no children.
 */

export interface CreateWorkoutInput {
  userId: string;
  type: WorkoutType | string;
  name: string;
  durationMinutes: number;
  caloriesBurned?: number;
  intensity?: string;
  notes?: string;
  performedAt?: Date;
  sets: Array<{
    exercise: string;
    reps?: number;
    weightKg?: number;
    durationSec?: number;
    distanceMeters?: number;
  }>;
}

export class WorkoutService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateWorkoutInput): Promise<Workout & { sets: WorkoutSet[] }> {
    if (input.sets.length === 0) {
      throw new AppError("A workout must include at least one set.", {
        statusCode: 400,
        code: "WORKOUT_NO_SETS",
      });
    }

    const workoutType = this.coerceWorkoutType(input.type);
    const performedAt = clampToNow(input.performedAt);

    log.info("Creating workout", {
      userId: input.userId,
      type: workoutType,
      sets: input.sets.length,
    });

    return this.prisma.$transaction(async (tx) => {
      const workout = await tx.workout.create({
        data: {
          userId: input.userId,
          type: workoutType,
          name: input.name.trim().slice(0, 120),
          durationMinutes: Math.round(input.durationMinutes),
          caloriesBurned:
            input.caloriesBurned !== undefined
              ? Math.max(0, Math.round(input.caloriesBurned))
              : null,
          intensity: input.intensity?.trim().slice(0, 40) ?? null,
          notes: input.notes?.trim().slice(0, 500) ?? null,
          performedAt,
          sets: {
            create: input.sets.map((set, idx) => ({
              exercise: set.exercise.trim().slice(0, 80),
              reps: set.reps ?? null,
              weightKg: set.weightKg ?? null,
              durationSec: set.durationSec ?? null,
              distanceMeters: set.distanceMeters ?? null,
              orderIndex: idx,
            })),
          },
        },
        include: { sets: true },
      });

      return workout;
    });
  }

  async list(
    userId: string,
    opts?: { from?: Date; to?: Date; limit?: number },
  ): Promise<(Workout & { sets: WorkoutSet[] })[]> {
    return this.prisma.workout.findMany({
      where: {
        userId,
        performedAt: {
          gte: opts?.from,
          lte: opts?.to,
        },
      },
      orderBy: { performedAt: "desc" },
      take: opts?.limit ?? 100,
      include: { sets: { orderBy: { orderIndex: "asc" } } },
    });
  }

  async getById(userId: string, id: string): Promise<(Workout & { sets: WorkoutSet[] }) | null> {
    return this.prisma.workout.findFirst({
      where: { id, userId },
      include: { sets: { orderBy: { orderIndex: "asc" } } },
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.workout.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return false;
    await this.prisma.workout.delete({ where: { id: existing.id } });
    return true;
  }

  private coerceWorkoutType(input: string | WorkoutType): WorkoutType {
    if (
      input === "STRENGTH" ||
      input === "CARDIO" ||
      input === "FLEXIBILITY" ||
      input === "HIIT" ||
      input === "SPORT"
    ) {
      return input;
    }
    throw new AppError(`Unknown workout type "${input}".`, {
      statusCode: 400,
      code: "INVALID_WORKOUT_TYPE",
    });
  }
}

function clampToNow(value?: Date): Date {
  if (!value) return new Date();
  const now = new Date();
  return value.getTime() > now.getTime() ? now : value;
}