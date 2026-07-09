import { type PrismaClient } from "@prisma/client";

import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { createClient } from "@supabase/supabase-js";

const log = logger.child("account-deletion");

/**
 * GDPR/Ley-1581 account-deletion service.
 *
 * SOLID notes
 * ───────────
 * • SRP — this class only owns the "wipe a user" workflow. Routing,
 *   email-notification and audit live in callers.
 * • DIP — depends only on the injected {@link PrismaClient}. Tests
 *   pass a mock to verify cascade without touching the real DB.
 * • LSP — returns the deleted user so callers can chain side-effects
 *   (send "your account is gone" email, log audit, etc.) without
 *   re-querying.
 *
 * Cascade strategy
 * ───────────────
 * The user is deleted inside a transaction. Cascading FKs already
 * handle most relations (Log, RefreshToken, EmailToken, BodyMetric,
 * NutritionPlan, OnboardingSession, Profile, Tip), but the migration
 * did not declare `onDelete: Cascade` for every relation. To stay
 * robust against that we explicitly delete the children first.
 *
 * Storage cleanup runs *after* the DB transaction succeeds; on
 * failure we log a warning but never block the user from being
 * removed from our system.
 */
export class AccountDeletionService {
  private supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  constructor(private prisma: PrismaClient) {}

  async deleteAccount(userId: string): Promise<{ id: string; deletedAt: string }> {
    log.warn("Account deletion requested", { userId });

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new AppError("Account not found.", {
            statusCode: 404,
            code: "USER_NOT_FOUND",
          });
        }

        // Explicit cascade — defensive even though FKs should handle it.
        await Promise.all([
          tx.refreshToken.deleteMany({ where: { userId } }),
          tx.emailToken.deleteMany({ where: { userId } }),
          tx.onboardingSession.deleteMany({ where: { userId } }),
          tx.userProfile.deleteMany({ where: { userId } }),
          tx.nutritionPlan.deleteMany({ where: { userId } }),
          tx.bodyMetric.deleteMany({ where: { userId } }),
          tx.tip.deleteMany({ where: { userId } }),
          tx.log.deleteMany({ where: { userId } }),
          tx.hydrationLog.deleteMany({ where: { userId } }),
          tx.workout.deleteMany({ where: { userId } }),
        ]);

        await tx.user.delete({ where: { id: userId } });

        return {
          id: user.id,
          deletedAt: new Date().toISOString(),
        };
      });

      // Best-effort storage cleanup. Listing/deleting happens outside
      // the DB transaction so we never roll back a successful delete
      // if Supabase is briefly unreachable. The orphan files are
      // cleaned up on a recurring basis by the cleanup job.
      await this.purgeUserStorage(userId);

      return result;
    } catch (error) {
      log.error("Account deletion failed", { userId, error });
      throw error;
    }
  }

  private async purgeUserStorage(userId: string): Promise<void> {
    const bucket = this.supabase.storage.from(env.SUPABASE_STORAGE_BUCKET);
    const prefix = `uploads/meals/${userId}/`;
    try {
      const { data: entries, error: listError } = await bucket.list(prefix, {
        limit: 1000,
      });
      if (listError) {
        log.warn("Failed to list user storage", { userId, error: listError });
        return;
      }
      if (!entries || entries.length === 0) return;

      const paths = entries
        .filter((e) => e.name)
        .map((e) => `${prefix}${e.name}`);
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) {
        log.warn("Failed to remove user storage objects", {
          userId,
          error: removeError,
        });
      } else {
        log.info("Removed user storage objects", { userId, count: paths.length });
      }
    } catch (error) {
      log.warn("Unexpected error purging user storage", { userId, error });
    }
  }
}