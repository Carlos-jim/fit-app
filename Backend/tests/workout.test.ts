import { WorkoutService } from "../src/services/workout.service";
import { AppError } from "../src/lib/app-error";

function makePrisma() {
  return {
    workout: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe("WorkoutService.create", () => {
  it("rejects workouts with zero sets", async () => {
    const prisma = makePrisma();
    const svc = new WorkoutService(prisma as never);
    await expect(
      svc.create({
        userId: "u-1",
        type: "STRENGTH",
        name: "Push day",
        durationMinutes: 45,
        sets: [],
      }),
    ).rejects.toMatchObject({ code: "WORKOUT_NO_SETS" });
  });

  it("rejects unknown workout types", async () => {
    const prisma = makePrisma();
    const svc = new WorkoutService(prisma as never);
    await expect(
      svc.create({
        userId: "u-1",
        type: "DANCING",
        name: "Salsa",
        durationMinutes: 30,
        sets: [{ exercise: "Salsa step", durationSec: 1800 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_WORKOUT_TYPE" });
  });

  it("persists parent + sets transactionally", async () => {
    const prisma = makePrisma();
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        workout: {
          create: jest.fn().mockImplementation(async ({ data }) => ({
            id: "w-1",
            type: data.type,
            name: data.name,
            durationMinutes: data.durationMinutes,
            performedAt: data.performedAt,
            sets: data.sets.create.map((s: { exercise: string }, i: number) => ({
              id: `s-${i + 1}`,
              exercise: s.exercise,
              orderIndex: i,
            })),
          })),
        },
      };
      return cb(tx);
    });

    const svc = new WorkoutService(prisma as never);
    const out = await svc.create({
      userId: "u-1",
      type: "STRENGTH",
      name: "Push day",
      durationMinutes: 45,
      caloriesBurned: 320.7, // floats OK; we round on persist
      sets: [
        { exercise: "Bench", reps: 8, weightKg: 70 },
        { exercise: "OHP", reps: 8, weightKg: 40 },
      ],
    });

    expect(out.id).toBe("w-1");
    expect(out.sets.length).toBe(2);
  });

  it("clamps future performedAt to now", async () => {
    const prisma = makePrisma();
    let capturedDate: Date | undefined;
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        workout: {
          create: jest.fn().mockImplementation(async ({ data }) => {
            capturedDate = data.performedAt;
            return { id: "w-1", sets: [] };
          }),
        },
      };
      return cb(tx);
    });
    const svc = new WorkoutService(prisma as never);
    const farFuture = new Date(Date.now() + 60_000);
    await svc.create({
      userId: "u-1",
      type: "CARDIO",
      name: "Run",
      durationMinutes: 30,
      performedAt: farFuture,
      sets: [{ exercise: "Run", durationSec: 1800 }],
    });
    expect(capturedDate!.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe("WorkoutService.list / getById / delete", () => {
  it("scopes list to user with date window", async () => {
    const prisma = makePrisma();
    prisma.workout.findMany.mockResolvedValue([]);
    const svc = new WorkoutService(prisma as never);
    await svc.list("u-1", {
      from: new Date("2026-06-01"),
      to: new Date("2026-06-30"),
      limit: 25,
    });
    expect(prisma.workout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u-1",
          performedAt: expect.objectContaining({
            gte: new Date("2026-06-01"),
            lte: new Date("2026-06-30"),
          }),
        }),
        take: 25,
      }),
    );
  });

  it("rejects deleting a workout the user does not own", async () => {
    const prisma = makePrisma();
    prisma.workout.findFirst.mockResolvedValue(null);
    const svc = new WorkoutService(prisma as never);
    const ok = await svc.delete("u-1", "w-99");
    expect(ok).toBe(false);
    expect(prisma.workout.delete).not.toHaveBeenCalled();
  });
});