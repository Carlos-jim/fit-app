import { type PrismaClient } from "@prisma/client";

export class UserProfileRepository {
  constructor(private prisma: PrismaClient) {}

  async upsertFromOnboarding(userId: string, session: {
    goal?: string | null;
    weightKg?: number | null;
    heightCm?: number | null;
    desiredWeightKg?: number | null;
    gender?: string | null;
    age?: number | null;
    country?: string | null;
    workoutFrequency?: string | null;
    activityLevel?: string | null;
    dietaryPrefs?: unknown;
  }) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        goal: session.goal as never ?? undefined,
        weightKg: session.weightKg ?? undefined,
        heightCm: session.heightCm ?? undefined,
        desiredWeightKg: session.desiredWeightKg ?? undefined,
        gender: session.gender as never ?? undefined,
        age: session.age ?? undefined,
        country: session.country ?? undefined,
        workoutFrequency: session.workoutFrequency as never ?? undefined,
        activityLevel: session.activityLevel as never ?? undefined,
        dietaryPrefs: session.dietaryPrefs ?? undefined,
      },
      create: {
        userId,
        goal: session.goal as never ?? undefined,
        weightKg: session.weightKg ?? undefined,
        heightCm: session.heightCm ?? undefined,
        desiredWeightKg: session.desiredWeightKg ?? undefined,
        gender: session.gender as never ?? undefined,
        age: session.age ?? undefined,
        country: session.country ?? undefined,
        workoutFrequency: session.workoutFrequency as never ?? undefined,
        activityLevel: session.activityLevel as never ?? undefined,
        dietaryPrefs: session.dietaryPrefs ?? undefined,
      },
    });
  }

  async getByUserId(userId: string) {
    return this.prisma.userProfile.findUnique({
      where: { userId },
    });
  }
}
