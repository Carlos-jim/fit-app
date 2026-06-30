import { type PrismaClient, type UserProfile } from "@prisma/client";

import {
  type UserProfileSource,
  serialize,
  toCreateInput,
  toUpdateInput,
} from "../services/user-profile.mapper.js";

/**
 * Repository for {@link UserProfile} persistence.
 *
 * SOLID notes
 * ───────────
 * • SRP — this class only owns CRUD. It delegates wire-format
 *   normalization (string → enum narrowing) to the mapper, keeping the
 *   `Prisma.*Input` types honest.
 * • DIP — every public method accepts a {@link UserProfileSource} (a
 *   plain shape), not a Prisma row. Callers depend on this abstraction
 *   rather than on `@prisma/client` itself.
 */
export class UserProfileRepository {
  constructor(private prisma: PrismaClient) {}

  async upsertFromOnboarding(
    userId: string,
    session: UserProfileSource,
  ): Promise<UserProfile> {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: toUpdateInput(session),
      create: toCreateInput(session, userId),
    });
  }

  async update(
    userId: string,
    patch: UserProfileSource,
  ): Promise<UserProfile> {
    return this.prisma.userProfile.update({
      where: { userId },
      data: toUpdateInput(patch),
    });
  }

  async getByUserId(userId: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async getSerializedByUserId(userId: string) {
    const profile = await this.getByUserId(userId);
    return profile ? serialize(profile) : null;
  }
}