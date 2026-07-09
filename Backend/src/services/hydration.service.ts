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

  /**
   * Delete the most recent hydration entry for the user. Used by the
   * app's "−" button so we don't have to fetch a list of entries just
   * to remove one. Returns the deleted entry (or null if there were
   * none today).
   */
  async deleteLatestEntryForToday(
    userId: string,
    day: Date,
    timeZone?: string,
  ): Promise<HydrationLog | null> {
    const start = startOfDay(day, timeZone);
    const end = endOfDay(day, timeZone);
    const latest = await this.prisma.hydrationLog.findFirst({
      where: { userId, recordedAt: { gte: start, lte: end } },
      orderBy: { recordedAt: "desc" },
    });
    if (!latest) return null;
    return this.prisma.hydrationLog.delete({ where: { id: latest.id } });
  }

  async getDailyTotal(
    userId: string,
    day: Date,
    timeZone?: string,
  ): Promise<DailyHydration> {
    const start = startOfDay(day, timeZone);
    const end = endOfDay(day, timeZone);

    const rows = await this.prisma.hydrationLog.findMany({
      where: {
        userId,
        recordedAt: { gte: start, lte: end },
      },
      select: { glasses: true },
    });

    const glasses = rows.reduce((sum, row) => sum + row.glasses, 0);
    return {
      date: formatDateKey(day, timeZone),
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

function startOfDay(input: Date, timeZone?: string): Date {
  if (!timeZone) {
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // Compute the UTC instant that represents 00:00:00 in the user's
  // timezone for the given calendar date. Without this the server
  // (typically UTC) would compute "today" relative to a different
  // instant than the user's wall clock.
  const parts = formatInTimeZone(input, timeZone);
  return new Date(`${parts.yyyy}-${parts.mm}-${parts.dd}T00:00:00Z`);
}

function endOfDay(input: Date, timeZone?: string): Date {
  if (!timeZone) {
    const d = new Date(input);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  const parts = formatInTimeZone(input, timeZone);
  return new Date(`${parts.yyyy}-${parts.mm}-${parts.dd}T23:59:59.999Z`);
}

function formatDateKey(input: Date, timeZone?: string): string {
  if (!timeZone) return input.toISOString().slice(0, 10);
  const parts = formatInTimeZone(input, timeZone);
  return `${parts.yyyy}-${parts.mm}-${parts.dd}`;
}

/**
 * Resolve the wall-clock y/m/d for `input` as seen in `timeZone`.
 *
 * Implementation note: we use `Intl.DateTimeFormat` with the timezone
 * option to extract the parts, which is the only built-in way to do
 * timezone-aware formatting in Node 22 without pulling in a date
 * library like `date-fns-tz` / `luxon`.
 */
function formatInTimeZone(
  input: Date,
  timeZone: string,
): { yyyy: string; mm: string; dd: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(input);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;
  return {
    yyyy: lookup.year ?? "1970",
    mm: lookup.month ?? "01",
    dd: lookup.day ?? "01",
  };
}

function defaultTarget(): number {
  return 8;
}