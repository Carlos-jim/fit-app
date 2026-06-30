import type { PrismaClient, User } from "@prisma/client";

import { logger } from "../lib/logger.js";

const log = logger.child("user-repository");

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async ensureUser(input: {
    email: string;
    fullName?: string;
  }): Promise<User> {
    log.info("Syncing user", { email: input.email });
    const user = await this.db.user.upsert({
      where: {
        email: input.email,
      },
      update: {
        fullName: input.fullName,
      },
      create: {
        email: input.email,
        fullName: input.fullName,
      },
    });
    log.info("User synced", { userId: user.id });
    return user;
  }

  async exists(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    return Boolean(user);
  }
}
