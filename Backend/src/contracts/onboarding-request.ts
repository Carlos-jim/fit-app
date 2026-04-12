import { z } from "zod";

export const onboardingStep1Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  goal: z.enum(["LOSE_WEIGHT", "MAINTAIN", "GAIN_WEIGHT"]),
});

export const onboardingStep2Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  workoutFrequency: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const onboardingStep3Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  weightKg: z.number().positive("weightKg must be positive").optional(),
  heightCm: z.number().positive("heightCm must be positive").optional(),
});

export const onboardingStep4Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  desiredWeightKg: z
    .number()
    .positive("desiredWeightKg must be positive")
    .optional(),
});

export const onboardingStep5Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY"]),
});

export const onboardingStep6Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  age: z.number().int().positive("age must be positive"),
});

export const onboardingStep7Schema = z.object({
  userId: z.string().min(1, "userId is required"),
  country: z.string().min(1, "country is required"),
});

export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof onboardingStep3Schema>;
export type OnboardingStep4Input = z.infer<typeof onboardingStep4Schema>;
export type OnboardingStep5Input = z.infer<typeof onboardingStep5Schema>;
export type OnboardingStep6Input = z.infer<typeof onboardingStep6Schema>;
export type OnboardingStep7Input = z.infer<typeof onboardingStep7Schema>;
