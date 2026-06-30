-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'CARDIO', 'FLEXIBILITY', 'HIIT', 'SPORT');

-- CreateTable: Workout
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WorkoutType" NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "caloriesBurned" INTEGER,
    "intensity" TEXT,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workout_userId_performedAt_idx" ON "Workout"("userId", "performedAt" DESC);

ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: WorkoutSet
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "reps" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "durationSec" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutSet_workoutId_orderIndex_idx" ON "WorkoutSet"("workoutId", "orderIndex");

ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;