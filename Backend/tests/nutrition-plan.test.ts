const mockGenerate = jest.fn();
const mockCtor = jest.fn().mockImplementation(() => ({
  models: { generateContent: mockGenerate },
}));

jest.mock("@google/genai", () => ({
  GoogleGenAI: mockCtor,
}));

import { NutritionPlanService } from "../src/services/nutrition-plan.service";

const validGeminiOutput = {
  dailyCalories: 2200,
  proteinGrams: 150,
  carbsGrams: 240,
  fatGrams: 70,
  proteinPercentage: 27,
  carbsPercentage: 44,
  fatPercentage: 29,
  bmr: 1700,
  tdee: 2400,
  rationale: "Plan moderado para mantener peso con actividad regular.",
};

const baseProfile = {
  id: "p1",
  userId: "u1",
  goal: "MAINTAIN",
  weightKg: 75,
  heightCm: 175,
  desiredWeightKg: 75,
  gender: "MALE",
  age: 30,
  country: "Venezuela",
  workoutFrequency: "MEDIUM",
  activityLevel: "MODERATE",
  dietaryPrefs: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrismaStub(opts: {
  existing?: unknown | null;
  upserted?: unknown;
  profile?: unknown | null;
}) {
  const nutritionPlanFindUnique = jest.fn(async () => opts.existing ?? null);
  const nutritionPlanUpsert = jest.fn(async () => opts.upserted ?? { ...validGeminiOutput });
  const userProfileFindUnique = jest.fn(async () => opts.profile ?? baseProfile);

  return {
    prisma: {
      nutritionPlan: {
        findUnique: nutritionPlanFindUnique,
        upsert: nutritionPlanUpsert,
      },
      userProfile: {
        findUnique: userProfileFindUnique,
      },
    },
    nutritionPlanFindUnique,
    nutritionPlanUpsert,
    userProfileFindUnique,
  };
}

describe("NutritionPlanService (Gemini)", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    mockCtor.mockClear();
  });

  it("calls Gemini and persists the parsed plan on recompute", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiOutput),
      modelVersion: "gemini-2.5-flash-lite",
    });

    const stub = makePrismaStub({
      profile: baseProfile,
      upserted: { ...validGeminiOutput, source: "gemini" },
    });
    const svc = new NutritionPlanService(stub.prisma as never);

    const result = await svc.recompute("u1");

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(stub.userProfileFindUnique).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(stub.nutritionPlanUpsert).toHaveBeenCalledTimes(1);
    const upsertArg = (
      stub.nutritionPlanUpsert.mock.calls as unknown as Array<[unknown]>
    )[0]![0] as {
      create: { source: string; dailyCalories: number };
      update: { source: string };
    };
    expect(upsertArg.create.source).toBe("gemini");
    expect(upsertArg.update.source).toBe("gemini");
    expect(upsertArg.create.dailyCalories).toBe(2200);
    expect(result).toEqual({ ...validGeminiOutput, source: "gemini" });
  });

  it("sends onboarding data (weight, height, goal, activity, country, dietary prefs) in the prompt", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify(validGeminiOutput),
      modelVersion: "gemini-2.5-flash-lite",
    });

    const profile = {
      ...baseProfile,
      dietaryPrefs: ["vegetariano", "sin lactosa"],
      country: "Colombia",
      goal: "LOSE_WEIGHT",
    };
    const stub = makePrismaStub({ profile });
    const svc = new NutritionPlanService(stub.prisma as never);

    await svc.recompute("u1");

    const callArg = mockGenerate.mock.calls[0]?.[0];
    expect(callArg.contents).toContain("vegetariano, sin lactosa");
    expect(callArg.contents).toContain("Colombia");
    expect(callArg.contents).toContain("LOSE_WEIGHT");
    expect(callArg.contents).toContain("75 kg");
    expect(callArg.contents).toContain("175 cm");
  });

  it("returns the existing plan without calling Gemini on lazy fetch", async () => {
    const existing = { ...validGeminiOutput, source: "gemini" };
    const stub = makePrismaStub({ existing });
    const svc = new NutritionPlanService(stub.prisma as never);

    const result = await svc.ensurePlanForProfile("u1", baseProfile as never);

    expect(result).toBe(existing);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns null when the profile is incomplete", async () => {
    const stub = makePrismaStub({});
    const svc = new NutritionPlanService(stub.prisma as never);

    const incomplete = {
      ...baseProfile,
      weightKg: null,
      heightCm: null,
      age: null,
    };
    const result = await svc.ensurePlanForProfile("u1", incomplete as never);

    expect(result).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("throws GEMINI_UNAVAILABLE when the Gemini client fails", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("network down"));

    const stub = makePrismaStub({ profile: baseProfile });
    const svc = new NutritionPlanService(stub.prisma as never);

    await expect(svc.recompute("u1")).rejects.toMatchObject({
      code: "GEMINI_UNAVAILABLE",
      statusCode: 503,
    });
    expect(stub.nutritionPlanUpsert).not.toHaveBeenCalled();
  });

  it("throws GEMINI_INVALID_RESPONSE when Gemini returns non-JSON", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: "not-json",
      modelVersion: "gemini-2.5-flash-lite",
    });

    const stub = makePrismaStub({ profile: baseProfile });
    const svc = new NutritionPlanService(stub.prisma as never);

    await expect(svc.recompute("u1")).rejects.toMatchObject({
      code: "GEMINI_INVALID_RESPONSE",
      statusCode: 502,
    });
    expect(stub.nutritionPlanUpsert).not.toHaveBeenCalled();
  });

  it("throws GEMINI_SCHEMA_MISMATCH when Gemini JSON fails validation", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({ dailyCalories: -10 }),
      modelVersion: "gemini-2.5-flash-lite",
    });

    const stub = makePrismaStub({ profile: baseProfile });
    const svc = new NutritionPlanService(stub.prisma as never);

    await expect(svc.recompute("u1")).rejects.toMatchObject({
      code: "GEMINI_SCHEMA_MISMATCH",
      statusCode: 502,
    });
    expect(stub.nutritionPlanUpsert).not.toHaveBeenCalled();
  });

  it("throws GEMINI_SCHEMA_MISMATCH when macro percentages do not sum to 100", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({ ...validGeminiOutput, fatPercentage: 10 }),
      modelVersion: "gemini-2.5-flash-lite",
    });

    const stub = makePrismaStub({ profile: baseProfile });
    const svc = new NutritionPlanService(stub.prisma as never);

    await expect(svc.recompute("u1")).rejects.toMatchObject({
      code: "GEMINI_SCHEMA_MISMATCH",
      statusCode: 502,
    });
    expect(stub.nutritionPlanUpsert).not.toHaveBeenCalled();
  });
});