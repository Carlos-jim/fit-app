import { type PrismaClient } from "@prisma/client";

import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

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
 */
export class AccountDeletionService {
  constructor(private prisma: PrismaClient) {}

  async deleteAccount(userId: string): Promise<{ id: string; deletedAt: string }> {
    log.warn("Account deletion requested", { userId });

    try {
      return await this.prisma.$transaction(async (tx) => {
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
        ]);

        await tx.user.delete({ where: { id: userId } });

        return {
          id: user.id,
          deletedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      log.error("Account deletion failed", { userId, error });
      throw error;
    }
  }
}