const mockGenerate = jest.fn();
const mockCtor = jest.fn().mockImplementation(() => ({
  models: { generateContent: mockGenerate },
}));

jest.mock("@google/genai", () => ({
  GoogleGenAI: mockCtor,
}));

import { TipsService } from "../src/services/tips.service";

const validTips = {
  tips: [
    {
      title: "Bebe más agua",
      body: "Intenta tomar 2 litros de agua al día.",
      category: "nutricion",
      icon: "water",
    },
    {
      title: "Camina 30 min",
      body: "Sal a caminar después de comer.",
      category: "ejercicio",
      icon: "fitness",
    },
  ],
};

describe("TipsService.generateWeeklyTips", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it("returns parsed tips on a successful Gemini call", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify(validTips),
      modelVersion: "gemini-2.5-flash",
    });
    const svc = new TipsService();
    const result = await svc.generateWeeklyTips({
      profile: {
        goal: "MAINTAIN",
        weightKg: 70,
        heightCm: 170,
        age: 30,
      },
      recentMeals: [],
    });
    expect(result.tips).toHaveLength(2);
    expect(result.tips[0]!.title).toBe("Bebe más agua");
  });

  it("rejects Gemini output that does not match the schema", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({ tips: "not-an-array" }),
      modelVersion: "gemini-2.5-flash",
    });
    const svc = new TipsService();
    await expect(
      svc.generateWeeklyTips({ profile: {}, recentMeals: [] }),
    ).rejects.toMatchObject({ code: "GEMINI_SCHEMA_MISMATCH" });
  });

  it("falls back to mock tips when Gemini returns 429 (rate limited)", async () => {
    mockGenerate
      .mockRejectedValueOnce({ status: 429, message: "rate limited" })
      .mockRejectedValueOnce({ status: 429, message: "rate limited" })
      .mockRejectedValueOnce({ status: 429, message: "rate limited" });

    const svc = new TipsService();
    const result = await svc.generateWeeklyTips({ profile: {}, recentMeals: [] });
    expect(result.tips.length).toBeGreaterThan(0);
    // Every mock tip has a non-empty title + body + valid category.
    for (const tip of result.tips) {
      expect(tip.title.length).toBeGreaterThan(0);
      expect(tip.body.length).toBeGreaterThan(0);
      expect([
        "nutricion",
        "habitos",
        "ejercicio",
        "salud_mental",
        "planificacion",
      ]).toContain(tip.category);
    }
  });
});