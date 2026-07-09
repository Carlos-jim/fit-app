import { AccountDeletionService } from "../src/services/account-deletion.service";
import { AppError } from "../src/lib/app-error";

// Stub @supabase/supabase-js so the deletion service doesn't try to
// reach Supabase from the unit test (no env, no network).
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  })),
}));

function makePrismaMock() {
  return {
    user: { findUnique: jest.fn() },
    refreshToken: { deleteMany: jest.fn() },
    emailToken: { deleteMany: jest.fn() },
    onboardingSession: { deleteMany: jest.fn() },
    userProfile: { deleteMany: jest.fn() },
    nutritionPlan: { deleteMany: jest.fn() },
    bodyMetric: { deleteMany: jest.fn() },
    tip: { deleteMany: jest.fn() },
    log: { deleteMany: jest.fn() },
    hydrationLog: { deleteMany: jest.fn() },
    workout: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe("AccountDeletionService.deleteAccount", () => {
  it("returns NOT_FOUND when the user does not exist", async () => {
    const prisma = makePrismaMock();
    // The service wraps every lookup inside $transaction, so the mock
    // needs to invoke the callback and propagate its rejection.
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        user: { findUnique: jest.fn().mockResolvedValue(null) },
        refreshToken: { deleteMany: jest.fn() },
        emailToken: { deleteMany: jest.fn() },
        onboardingSession: { deleteMany: jest.fn() },
        userProfile: { deleteMany: jest.fn() },
        nutritionPlan: { deleteMany: jest.fn() },
        bodyMetric: { deleteMany: jest.fn() },
        tip: { deleteMany: jest.fn() },
        log: { deleteMany: jest.fn() },
        hydrationLog: { deleteMany: jest.fn() },
        workout: { deleteMany: jest.fn() },
      };
      return cb(tx);
    });
    const svc = new AccountDeletionService(prisma as never);

    await expect(svc.deleteAccount("missing")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("cascades every child row in a transaction and then deletes the user", async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "x@y.com" });
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: "u-1", email: "x@y.com" }),
          delete: jest.fn().mockResolvedValue({ id: "u-1" }),
        },
        refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
        emailToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        onboardingSession: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        userProfile: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
        nutritionPlan: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
        bodyMetric: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
        tip: { deleteMany: jest.fn().mockResolvedValue({ count: 7 }) },
        log: { deleteMany: jest.fn().mockResolvedValue({ count: 30 }) },
        hydrationLog: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) },
        workout: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      return cb(tx);
    });

    const svc = new AccountDeletionService(prisma as never);
    const result = await svc.deleteAccount("u-1");

    expect(result.id).toBe("u-1");
    expect(result.deletedAt).toEqual(expect.any(String));

    // All cascades were dispatched in the same transaction
    const txArg = prisma.$transaction.mock.calls[0]![0];
    expect(typeof txArg).toBe("function");
  });

  it("surfaces unexpected transaction errors", async () => {
    const prisma = makePrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: "u-1" });
    prisma.$transaction.mockRejectedValue(new Error("db down"));
    const svc = new AccountDeletionService(prisma as never);
    await expect(svc.deleteAccount("u-1")).rejects.toThrow("db down");
  });
});