import { HydrationService } from "../src/services/hydration.service";
import { AppError } from "../src/lib/app-error";

function makePrisma() {
  return {
    hydrationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe("HydrationService.recordEntry", () => {
  it("rejects 0 / negative / > 50 glasses", async () => {
    const prisma = makePrisma();
    const svc = new HydrationService(prisma as never);

    for (const invalid of [0, -1, 51, 100]) {
      await expect(
        svc.recordEntry({ userId: "u-1", glasses: invalid }),
      ).rejects.toMatchObject({ code: "INVALID_GLASSES" });
    }
  });

  it("clamps future-dated entries to now", async () => {
    const prisma = makePrisma();
    prisma.hydrationLog.create.mockImplementation(async ({ data }) => ({
      id: "h-1",
      recordedAt: data.recordedAt,
    }));
    const svc = new HydrationService(prisma as never);

    const farFuture = new Date(Date.now() + 10 * 60 * 1000);
    await svc.recordEntry({
      userId: "u-1",
      glasses: 1,
      recordedAt: farFuture,
    });

    const createdAt = prisma.hydrationLog.create.mock.calls[0]![0].data
      .recordedAt as Date;
    expect(createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("rounds glasses to an integer", async () => {
    const prisma = makePrisma();
    prisma.hydrationLog.create.mockResolvedValue({ id: "h-1" });
    const svc = new HydrationService(prisma as never);

    await svc.recordEntry({ userId: "u-1", glasses: 1.7 });
    expect(prisma.hydrationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ glasses: 2 }),
      }),
    );
  });
});

describe("HydrationService.getDailyTotal", () => {
  it("sums glasses within the local-day window", async () => {
    const prisma = makePrisma();
    const captured: { from?: Date; to?: Date } = {};
    prisma.hydrationLog.findMany.mockImplementation(async ({ where }) => {
      captured.from = where.recordedAt.gte;
      captured.to = where.recordedAt.lte;
      return [{ glasses: 3 }, { glasses: 2 }, { glasses: 1 }];
    });
    const svc = new HydrationService(prisma as never);

    const total = await svc.getDailyTotal("u-1", new Date("2026-06-15T14:30:00Z"));

    expect(total.glasses).toBe(6);
    expect(total.entries).toBe(3);
    expect(captured.from!.getHours()).toBe(0);
    expect(captured.to!.getHours()).toBe(23);
  });
});

describe("HydrationService.deleteEntry", () => {
  it("scopes delete to the user (no cross-tenant delete)", async () => {
    const prisma = makePrisma();
    prisma.hydrationLog.findFirst.mockResolvedValue(null);
    const svc = new HydrationService(prisma as never);
    const result = await svc.deleteEntry("u-1", "h-99");
    expect(result).toBeNull();
    expect(prisma.hydrationLog.delete).not.toHaveBeenCalled();
  });

  it("deletes when the entry belongs to the user", async () => {
    const prisma = makePrisma();
    prisma.hydrationLog.findFirst.mockResolvedValue({ id: "h-1" });
    prisma.hydrationLog.delete.mockResolvedValue({ id: "h-1" });
    const svc = new HydrationService(prisma as never);
    const result = await svc.deleteEntry("u-1", "h-1");
    expect(prisma.hydrationLog.delete).toHaveBeenCalledWith({
      where: { id: "h-1" },
    });
    expect(result).toEqual({ id: "h-1" });
  });
});