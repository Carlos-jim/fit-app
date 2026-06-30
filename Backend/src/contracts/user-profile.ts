import { z } from "zod";

export const userProfileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  goal: z
    .enum(["LOSE_WEIGHT", "MAINTAIN", "GAIN_WEIGHT"])
    .nullable(),
  weightKg: z.number().nullable(),
  heightCm: z.number().nullable(),
  desiredWeightKg: z.number().nullable(),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY"]).nullable(),
  age: z.number().int().nullable(),
  country: z.string().nullable(),
  workoutFrequency: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable(),
  activityLevel: z
    .enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"])
    .nullable(),
  dietaryPrefs: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
