import type { PrismaClient, User } from "@prisma/client";

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async ensureUser(input: {
    email: string;
    fullName?: string;
  }): Promise<User> {
    console.log(`[Database] Syncing user: ${input.email}`);
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
    console.log(`[Database] User synced: ${user.id}`);
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
