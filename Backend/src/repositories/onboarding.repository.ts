import { type PrismaClient } from "@prisma/client";

import type {
  OnboardingStep1Input,
  OnboardingStep2Input,
  OnboardingStep3Input,
  OnboardingStep4Input,
  OnboardingStep5Input,
  OnboardingStep6Input,
  OnboardingStep7Input,
} from "../contracts/onboarding-request.js";

export class OnboardingRepository {
  constructor(private prisma: PrismaClient) {}

  async getOrCreateSession(userId: string) {
    const existing = await this.prisma.onboardingSession.findUnique({
      where: { userId },
    });

    if (existing) return existing;

    return this.prisma.onboardingSession.create({
      data: { userId },
    });
  }

  async updateStep1(userId: string, data: OnboardingStep1Input) {
    console.log(`[Onboarding] Saving Step 1 for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { goal: data.goal, currentStep: 2 },
      create: { userId, goal: data.goal, currentStep: 2 },
    });
  }

  async updateStep2(userId: string, data: OnboardingStep2Input) {
    console.log(`[Onboarding] Saving Step 2 for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: {
        workoutFrequency: data.workoutFrequency,
        currentStep: 3,
      },
      create: {
        userId,
        workoutFrequency: data.workoutFrequency,
        currentStep: 3,
      },
    });
  }

  async updateStep3(userId: string, data: OnboardingStep3Input) {
    console.log(`[Onboarding] Saving Step 3 for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: {
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        currentStep: 4,
      },
      create: {
        userId,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        currentStep: 4,
      },
    });
  }

  async updateStep4(userId: string, data: OnboardingStep4Input) {
    console.log(`[Onboarding] Saving Step 4 for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: {
        desiredWeightKg: data.desiredWeightKg,
        currentStep: 5,
      },
      create: {
        userId,
        desiredWeightKg: data.desiredWeightKg,
        currentStep: 5,
      },
    });
  }

  async updateStep5(userId: string, data: OnboardingStep5Input) {
    console.log(`[Onboarding] Saving Step 5 for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { gender: data.gender, currentStep: 6 },
      create: { userId, gender: data.gender, currentStep: 6 },
    });
  }

  async updateStep6(userId: string, data: OnboardingStep6Input) {
    console.log(`[Onboarding] Saving Step 6 for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { age: data.age, currentStep: 7 },
      create: { userId, age: data.age, currentStep: 7 },
    });
  }

  async updateStep7(userId: string, data: OnboardingStep7Input) {
    console.log(`[Onboarding] Saving Step 7 (Final) for ${userId}:`, data);
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { country: data.country, currentStep: 7, completed: true },
      create: {
        userId,
        country: data.country,
        currentStep: 7,
        completed: true,
      },
    });
  }

  async getSession(userId: string) {
    return this.prisma.onboardingSession.findUnique({
      where: { userId },
    });
  }

  async deleteSession(userId: string) {
    return this.prisma.onboardingSession.delete({
      where: { userId },
    });
  }
}
