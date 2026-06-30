import { type PrismaClient, type HydrationLog } from "@prisma/client";

import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

const log = logger.child("hydration-service");

/**
 * Hydration tracking service.
 *
 * SOLID notes
 * ───────────
 * • SRP — owns the daily-glass aggregation logic. The HTTP layer just
 *   forwards calls; persistence is delegated to Prisma.
 * • DIP — depends only on {@link PrismaClient}; tests inject a mock.
 *
 * Domain model
 * ───────────
 * Each `HydrationLog` represents one drinking event (1-N glasses). To
 * answer "how many glasses today" we sum the entries whose
 * `recordedAt` falls within the user's local day. We treat any
 * future-dated event as "user typo" and clamp it to now.
 */
export interface DailyHydration {
  date: string;
  glasses: number;
  target: number;
  entries: number;
}

export class HydrationService {
  constructor(private prisma: PrismaClient) {}

  async recordEntry(input: {
    userId: string;
    glasses: number;
    notes?: string;
    recordedAt?: Date;
  }): Promise<HydrationLog> {
    if (!Number.isFinite(input.glasses) || input.glasses <= 0 || input.glasses > 50) {
      throw new AppError("glasses must be between 1 and 50.", {
        statusCode: 400,
        code: "INVALID_GLASSES",
      });
    }
    const recordedAt = clampToNow(input.recordedAt);

    log.debug("Recording hydration entry", {
      userId: input.userId,
      glasses: input.glasses,
    });

    return this.prisma.hydrationLog.create({
      data: {
        userId: input.userId,
        glasses: Math.round(input.glasses),
        notes: input.notes ?? null,
        recordedAt,
      },
    });
  }

  async deleteEntry(userId: string, id: string): Promise<HydrationLog | null> {
    const existing = await this.prisma.hydrationLog.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;
    return this.prisma.hydrationLog.delete({ where: { id: existing.id } });
  }

  async getDailyTotal(userId: string, day: Date): Promise<DailyHydration> {
    const start = startOfDay(day);
    const end = endOfDay(day);

    const rows = await this.prisma.hydrationLog.findMany({
      where: {
        userId,
        recordedAt: { gte: start, lte: end },
      },
      select: { glasses: true },
    });

    const glasses = rows.reduce((sum, row) => sum + row.glasses, 0);
    return {
      date: start.toISOString().slice(0, 10),
      glasses,
      target: defaultTarget(),
      entries: rows.length,
    };
  }

  async list(
    userId: string,
    opts?: { from?: Date; to?: Date; limit?: number },
  ): Promise<HydrationLog[]> {
    return this.prisma.hydrationLog.findMany({
      where: {
        userId,
        recordedAt: {
          gte: opts?.from,
          lte: opts?.to,
        },
      },
      orderBy: { recordedAt: "desc" },
      take: opts?.limit ?? 200,
    });
  }
}

function clampToNow(value?: Date): Date {
  if (!value) return new Date();
  const now = new Date();
  return value.getTime() > now.getTime() ? now : value;
}

function startOfDay(input: Date): Date {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(input: Date): Date {
  const d = new Date(input);
  d.setHours(23, 59, 59, 999);
  return d;
}

function defaultTarget(): number {
  return 8;
}