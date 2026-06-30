import { z } from "zod";

export const onboardingStep1Schema = z.object({
  goal: z.enum(["LOSE_WEIGHT", "MAINTAIN", "GAIN_WEIGHT"]),
});

export const onboardingStep2Schema = z.object({
  workoutFrequency: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const onboardingStep3Schema = z.object({
  weightKg: z.number().positive("weightKg must be positive").optional(),
  heightCm: z.number().positive("heightCm must be positive").optional(),
});

export const onboardingStep4Schema = z.object({
  desiredWeightKg: z
    .number()
    .positive("desiredWeightKg must be positive")
    .optional(),
});

export const onboardingStep5Schema = z.object({
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY"]),
});

export const onboardingStep6Schema = z.object({
  age: z.number().int().positive("age must be positive"),
});

export const onboardingStep7Schema = z.object({
  country: z.string().min(1, "country is required"),
});

/**
 * PATCH /me/profile — partial profile update after onboarding.
 *
 * SOLID notes
 * ───────────
 * • ISP — every field is optional so the client can edit just one value
 *   without round-tripping the entire profile. Email and country have
 *   stricter validation because they touch identity.
 */
export const updateProfileSchema = z
  .object({
    goal: z.enum(["LOSE_WEIGHT", "MAINTAIN", "GAIN_WEIGHT"]).optional(),
    weightKg: z.number().positive("weightKg must be positive").optional(),
    heightCm: z.number().positive("heightCm must be positive").optional(),
    desiredWeightKg: z.number().positive("desiredWeightKg must be positive").optional(),
    gender: z.enum(["MALE", "FEMALE", "NON_BINARY"]).optional(),
    age: z.number().int().positive("age must be positive").max(120).optional(),
    country: z.string().min(2).max(80).optional(),
    workoutFrequency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    activityLevel: z
      .enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"])
      .optional(),
    dietaryPrefs: z.unknown().optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0 &&
      !Object.values(data).every((v) => v === undefined),
    { message: "At least one field must be provided." },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof onboardingStep3Schema>;
export type OnboardingStep4Input = z.infer<typeof onboardingStep4Schema>;
export type OnboardingStep5Input = z.infer<typeof onboardingStep5Schema>;
export type OnboardingStep6Input = z.infer<typeof onboardingStep6Schema>;
export type OnboardingStep7Input = z.infer<typeof onboardingStep7Schema>;
