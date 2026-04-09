import type { PrismaClient, User } from "@prisma/client";

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async ensureUser(input: {
    email: string;
    fullName?: string;
  }): Promise<User> {
    return this.db.user.upsert({
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
  }

  async exists(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    return Boolean(user);
  }
}
