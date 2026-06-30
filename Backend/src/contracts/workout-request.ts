import { z } from "zod";

export const workoutTypeSchema = z.enum([
  "STRENGTH",
  "CARDIO",
  "FLEXIBILITY",
  "HIIT",
  "SPORT",
]);

export const createWorkoutSetSchema = z.object({
  exercise: z.string().trim().min(1).max(80),
  reps: z.number().int().positive().max(1000).optional(),
  weightKg: z.number().positive().max(2000).optional(),
  durationSec: z.number().int().positive().max(24 * 60 * 60).optional(),
  distanceMeters: z.number().positive().max(200000).optional(),
});

export const createWorkoutRequestSchema = z.object({
  type: workoutTypeSchema,
  name: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().positive().max(24 * 60),
  caloriesBurned: z.number().int().nonnegative().max(20000).optional(),
  intensity: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  performedAt: z.string().datetime().optional(),
  sets: z.array(createWorkoutSetSchema).min(1).max(50),
});

export const listWorkoutsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).optional().default(50),
});

export const workoutIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type WorkoutType = z.infer<typeof workoutTypeSchema>;
export type CreateWorkoutSet = z.infer<typeof createWorkoutSetSchema>;
export type CreateWorkoutRequest = z.infer<typeof createWorkoutRequestSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;