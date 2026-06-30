import { type PrismaClient } from "@prisma/client";

import { logger } from "../lib/logger.js";
import type {
  OnboardingStep1Input,
  OnboardingStep2Input,
  OnboardingStep3Input,
  OnboardingStep4Input,
  OnboardingStep5Input,
  OnboardingStep6Input,
  OnboardingStep7Input,
} from "../contracts/onboarding-request.js";

const log = logger.child("onboarding-repo");

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
    log.debug("Saving Step 1", { userId, goal: data.goal });
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { goal: data.goal, currentStep: 2 },
      create: { userId, goal: data.goal, currentStep: 2 },
    });
  }

  async updateStep2(userId: string, data: OnboardingStep2Input) {
    log.debug("Saving Step 2", {
      userId,
      workoutFrequency: data.workoutFrequency,
    });
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
    log.debug("Saving Step 3", {
      userId,
      hasWeight: data.weightKg !== undefined,
      hasHeight: data.heightCm !== undefined,
    });
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
    log.debug("Saving Step 4", {
      userId,
      hasDesiredWeight: data.desiredWeightKg !== undefined,
    });
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
    log.debug("Saving Step 5", { userId, gender: data.gender });
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { gender: data.gender, currentStep: 6 },
      create: { userId, gender: data.gender, currentStep: 6 },
    });
  }

  async updateStep6(userId: string, data: OnboardingStep6Input) {
    log.debug("Saving Step 6", { userId, hasAge: data.age !== undefined });
    return this.prisma.onboardingSession.upsert({
      where: { userId },
      update: { age: data.age, currentStep: 7 },
      create: { userId, age: data.age, currentStep: 7 },
    });
  }

  async updateStep7(userId: string, data: OnboardingStep7Input) {
    log.info("Saving Step 7 (final)", {
      userId,
      hasCountry: Boolean(data.country),
    });
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