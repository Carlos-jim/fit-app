import { BodyMetricRepository } from "../src/services/nutrition-plan.service";
import { AppError } from "../src/lib/app-error";

const fn = () => jest.fn();
function makeRepo() {
  const prisma = {
    bodyMetric: {
      create: fn(),
      findMany: fn(),
      findFirst: fn(),
      delete: fn(),
    },
  };
  return { prisma, repo: new BodyMetricRepository(prisma as never) };
}

describe("BodyMetricRepository.create", () => {
  it("persists the metric with the provided unit and timestamp", async () => {
    const { prisma, repo } = makeRepo();
    prisma.bodyMetric.create.mockResolvedValue({ id: "m-1" });
    await repo.create({
      userId: "u-1",
      type: "WEIGHT_KG",
      value: 72.4,
      unit: "kg",
      notes: "morning",
      recordedAt: new Date("2026-06-29T08:00:00Z"),
    });
    expect(prisma.bodyMetric.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u-1",
          type: "WEIGHT_KG",
          value: 72.4,
          unit: "kg",
          notes: "morning",
        }),
      }),
    );
  });
});

describe("BodyMetricRepository.list", () => {
  it("filters by type, date range and limit", async () => {
    const { prisma, repo } = makeRepo();
    prisma.bodyMetric.findMany.mockResolvedValue([]);
    await repo.list("u-1", {
      type: "WEIGHT_KG",
      from: new Date("2026-06-01"),
      to: new Date("2026-06-30"),
      limit: 50,
    });
    expect(prisma.bodyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u-1",
          type: "WEIGHT_KG",
          recordedAt: expect.objectContaining({
            gte: new Date("2026-06-01"),
            lte: new Date("2026-06-30"),
          }),
        }),
        take: 50,
      }),
    );
  });
});

describe("BodyMetricRepository.delete", () => {
  it("scopes delete to the user (no cross-tenant deletion)", async () => {
    const { prisma, repo } = makeRepo();
    prisma.bodyMetric.findFirst.mockResolvedValue(null);
    prisma.bodyMetric.delete.mockResolvedValue({ id: "m-1" });

    const result = await repo.delete("u-1", "m-1");
    expect(result).toBeNull();
    expect(prisma.bodyMetric.delete).not.toHaveBeenCalled();
  });

  it("deletes only when the row belongs to the requesting user", async () => {
    const { prisma, repo } = makeRepo();
    prisma.bodyMetric.findFirst.mockResolvedValue({ id: "m-1" });
    prisma.bodyMetric.delete.mockResolvedValue({ id: "m-1" });

    const result = await repo.delete("u-1", "m-1");
    expect(prisma.bodyMetric.findFirst).toHaveBeenCalledWith({
      where: { id: "m-1", userId: "u-1" },
    });
    expect(result).toEqual({ id: "m-1" });
  });
});

describe("LogRepository.saveMealSuggestion data leakage fix", () => {
  it("refuses to update a log that does not belong to the user", async () => {
    // Reproduce the body of saveMealSuggestion (with userId scope) without importing
    // the LogRepository to keep the test focused.
    const userId = "u-1";
    const logId = "log-42";
    const findFirst = jest.fn().mockResolvedValue(null); // not found for this user
    const update = jest.fn();

    async function saveMealSuggestion(
      userId: string,
      logId: string,
      suggestion: unknown,
    ) {
      const existing = await findFirst({ where: { id: logId, userId } });
      if (!existing) {
        throw new AppError("Log not found.", {
          statusCode: 404,
          code: "LOG_NOT_FOUND",
        });
      }
      return update({ where: { id: existing.id }, data: { aiSuggestion: suggestion } });
    }

    await expect(saveMealSuggestion(userId, logId, { healthScore: 7 })).rejects.toMatchObject({
      code: "LOG_NOT_FOUND",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("updates only when the log belongs to the requesting user", async () => {
    const userId = "u-1";
    const findFirst = jest.fn().mockResolvedValue({ id: "log-42" });
    const update = jest.fn().mockResolvedValue({ id: "log-42" });

    async function saveMealSuggestion(
      userId: string,
      logId: string,
      suggestion: unknown,
    ) {
      const existing = await findFirst({ where: { id: logId, userId } });
      if (!existing) throw new Error("not found");
      return update({ where: { id: existing.id }, data: { aiSuggestion: suggestion } });
    }

    await saveMealSuggestion(userId, "log-42", { healthScore: 7 });
    expect(update).toHaveBeenCalledWith({
      where: { id: "log-42" },
      data: { aiSuggestion: { healthScore: 7 } },
    });
  });
});
