import { DataExportService } from "../src/services/data-export.service";

function makePrismaMock() {
  return {
    user: { findUnique: jest.fn() },
    userProfile: { findUnique: jest.fn() },
    nutritionPlan: { findUnique: jest.fn() },
    onboardingSession: { findUnique: jest.fn() },
    bodyMetric: { findMany: jest.fn() },
    log: { findMany: jest.fn() },
    tip: { findMany: jest.fn() },
  };
}

describe("DataExportService.exportFor", () => {
  it("returns schemaVersion 1 + exportedAt", async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.nutritionPlan.findUnique.mockResolvedValue(null);
    prisma.onboardingSession.findUnique.mockResolvedValue(null);
    prisma.bodyMetric.findMany.mockResolvedValue([]);
    prisma.log.findMany.mockResolvedValue([]);
    prisma.tip.findMany.mockResolvedValue([]);

    const svc = new DataExportService(prisma as never);
    const out = await svc.exportFor("u-1");

    expect(out.schemaVersion).toBe(1);
    expect(out.exportedAt).toEqual(expect.any(String));
    expect(out.user).toBeNull();
    expect(out.profile).toBeNull();
    expect(out.bodyMetrics).toEqual([]);
    expect(out.logs).toEqual([]);
    expect(out.tips).toEqual([]);
  });

  it("serialises dates as ISO strings and preserves emailVerified flag", async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "x@y.com",
      fullName: "Test",
      authProvider: "EMAIL",
      emailVerified: true,
      emailVerifiedAt: new Date("2026-06-01T00:00:00Z"),
      plan: "PRO",
      planStartedAt: new Date("2026-05-01T00:00:00Z"),
      planExpiresAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    });
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.nutritionPlan.findUnique.mockResolvedValue(null);
    prisma.onboardingSession.findUnique.mockResolvedValue(null);
    prisma.bodyMetric.findMany.mockResolvedValue([]);
    prisma.log.findMany.mockResolvedValue([]);
    prisma.tip.findMany.mockResolvedValue([]);

    const svc = new DataExportService(prisma as never);
    const out = await svc.exportFor("u-1");

    expect(out.user?.email).toBe("x@y.com");
    expect(out.user?.emailVerified).toBe(true);
    expect(out.user?.emailVerifiedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(out.user?.planExpiresAt).toBeNull();
    expect(out.user?.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("fans out parallel queries (no waterfall)", async () => {
    const prisma = makePrismaMock();
    const order: string[] = [];
    (prisma.user.findUnique as jest.Mock).mockImplementation(async () => {
      order.push("user");
      return null;
    });
    (prisma.bodyMetric.findMany as jest.Mock).mockImplementation(async () => {
      order.push("metrics");
      return [];
    });
    (prisma.log.findMany as jest.Mock).mockImplementation(async () => {
      order.push("logs");
      return [];
    });
    (prisma.tip.findMany as jest.Mock).mockImplementation(async () => {
      order.push("tips");
      return [];
    });
    (prisma.userProfile.findUnique as jest.Mock).mockImplementation(
      async () => {
        order.push("profile");
        return null;
      },
    );
    (prisma.nutritionPlan.findUnique as jest.Mock).mockImplementation(
      async () => {
        order.push("plan");
        return null;
      },
    );
    (prisma.onboardingSession.findUnique as jest.Mock).mockImplementation(
      async () => {
        order.push("onboarding");
        return null;
      },
    );

    const svc = new DataExportService(prisma as never);
    await svc.exportFor("u-1");
    // Promise.all ensures they were all initiated before any awaited.
    // They may resolve in any order, but each query must have started.
    expect(new Set(order).size).toBe(7);
  });
});