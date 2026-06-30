import { Prisma, type ActivityLevel, type Gender, type GoalType, type UserProfile, type WorkoutFrequency } from "@prisma/client";

/**
 * Typed mapper between the wire-format (loose string enums from the
 * onboarding session) and the Prisma persistence enums.
 *
 * SOLID notes
 * ───────────
 * • SRP — the mapper owns the only place where strings get narrowed
 *   to Prisma enums. Repositories no longer carry `as never` casts and
 *   remain oblivious to wire-format quirks.
 * • OCP — adding a new GoalType value only requires updating
 *   {@link isGoalType}, not the repository or controller code.
 * • LSP — the mapper returns `Prisma.UserProfile*Input` subtypes so
 *   Prisma accepts the value at compile time without runtime casts.
 */

export const GOAL_TYPES = new Set<GoalType>([
  "LOSE_WEIGHT",
  "MAINTAIN",
  "GAIN_WEIGHT",
]);

export const GENDERS = new Set<Gender>(["MALE", "FEMALE", "NON_BINARY"]);

export const ACTIVITY_LEVELS = new Set<ActivityLevel>([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);

export const WORKOUT_FREQUENCIES = new Set<WorkoutFrequency>([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export function isGoalType(value: unknown): value is GoalType {
  return typeof value === "string" && GOAL_TYPES.has(value as GoalType);
}

export function isGender(value: unknown): value is Gender {
  return typeof value === "string" && GENDERS.has(value as Gender);
}

export function isActivityLevel(value: unknown): value is ActivityLevel {
  return (
    typeof value === "string" && ACTIVITY_LEVELS.has(value as ActivityLevel)
  );
}

export function isWorkoutFrequency(value: unknown): value is WorkoutFrequency {
  return (
    typeof value === "string" &&
    WORKOUT_FREQUENCIES.has(value as WorkoutFrequency)
  );
}

export interface UserProfileSource {
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
}

type CreateInput = Prisma.UserProfileUncheckedCreateInput;
type UpdateInput = Prisma.UserProfileUncheckedUpdateInput;

function dietJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function optionalEnum<T extends string>(
  value: unknown,
  guard: (v: unknown) => v is T,
): T | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!guard(value)) return null;
  return value;
}

/**
 * Returns the create payload for a new {@link UserProfile}. Silently drops
 * unknown enum values so we never write garbage to the DB even if a
 * frontend ships a future GoalType before the backend knows about it.
 */
export function toCreateInput(
  source: UserProfileSource,
  userId: string,
): CreateInput {
  return {
    userId,
    goal: optionalEnum(source.goal, isGoalType) ?? null,
    weightKg: source.weightKg ?? null,
    heightCm: source.heightCm ?? null,
    desiredWeightKg: source.desiredWeightKg ?? null,
    gender: optionalEnum(source.gender, isGender) ?? null,
    age: source.age ?? null,
    country: source.country ?? null,
    workoutFrequency: optionalEnum(source.workoutFrequency, isWorkoutFrequency) ?? null,
    activityLevel: optionalEnum(source.activityLevel, isActivityLevel) ?? null,
    dietaryPrefs: dietJson(source.dietaryPrefs),
  };
}

export function toUpdateInput(source: UserProfileSource): UpdateInput {
  return {
    goal: optionalEnum(source.goal, isGoalType),
    weightKg: source.weightKg ?? undefined,
    heightCm: source.heightCm ?? undefined,
    desiredWeightKg: source.desiredWeightKg ?? undefined,
    gender: optionalEnum(source.gender, isGender),
    age: source.age ?? undefined,
    country: source.country ?? undefined,
    workoutFrequency: optionalEnum(source.workoutFrequency, isWorkoutFrequency),
    activityLevel: optionalEnum(source.activityLevel, isActivityLevel),
    dietaryPrefs: dietJson(source.dietaryPrefs),
  };
}

export function serialize(profile: UserProfile) {
  return {
    id: profile.id,
    userId: profile.userId,
    goal: profile.goal,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    desiredWeightKg: profile.desiredWeightKg,
    gender: profile.gender,
    age: profile.age,
    country: profile.country,
    workoutFrequency: profile.workoutFrequency,
    activityLevel: profile.activityLevel,
    dietaryPrefs: profile.dietaryPrefs,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}