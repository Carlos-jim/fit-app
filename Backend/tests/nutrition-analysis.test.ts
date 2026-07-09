// Mock the @google/genai SDK so the real client is never instantiated.
const mockGenerate = jest.fn();
const mockCtor = jest.fn().mockImplementation(() => ({
  models: { generateContent: mockGenerate },
}));

jest.mock("@google/genai", () => ({
  GoogleGenAI: mockCtor,
}));

import {
  NutritionAnalysisService,
  type AnalyzeNutritionInput,
} from "../src/services/nutrition-analysis.service";

const validAnalysis = {
  mealName: "Arepa con queso",
  summary: "Arepa mediana con queso blanco.",
  confidence: "MEDIUM",
  total: {
    calories: 320,
    proteinGrams: 12,
    carbsGrams: 38,
    fatGrams: 14,
    fiberGrams: 3,
    sugarGrams: null,
    sodiumMg: null,
  },
  items: [
    {
      name: "Arepa",
      estimatedGrams: 120,
      calories: 220,
      proteinGrams: 6,
      carbsGrams: 38,
      fatGrams: 5,
    },
    {
      name: "Queso blanco",
      estimatedGrams: 30,
      calories: 100,
      proteinGrams: 6,
      carbsGrams: 0,
      fatGrams: 9,
    },
  ],
  warnings: [],
  estimatedServingGrams: 150,
};

describe("NutritionAnalysisService.analyzeFromImage", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it("rejects when no image data url is supplied", async () => {
    const svc = new NutritionAnalysisService();
    await expect(svc.analyzeFromImage({} as AnalyzeNutritionInput)).rejects.toMatchObject({
      code: "IMAGE_DATA_REQUIRED",
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("parses a valid Gemini response and returns the structured payload", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify(validAnalysis),
      modelVersion: "gemini-2.5-flash-lite",
    });
    const svc = new NutritionAnalysisService();
    const result = await svc.analyzeFromImage({
      imageDataUrl: "data:image/jpeg;base64,QUJD",
    });
    expect(result.parsed.mealName).toBe("Arepa con queso");
    expect(result.parsed.total.calories).toBe(320);
    expect(result.model).toContain("gemini");
  });

  it("rejects Gemini output that does not match the schema", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify({ mealName: "?", confidence: "BOGUS" }),
      modelVersion: "gemini-2.5-flash-lite",
    });
    const svc = new NutritionAnalysisService();
    await expect(
      svc.analyzeFromImage({ imageDataUrl: "data:image/jpeg;base64,QUJD" }),
    ).rejects.toMatchObject({ code: "GEMINI_SCHEMA_MISMATCH" });
  });

  it("falls back to the next model after exhausting same-model retries on 503", async () => {
    // Primary model fails twice (both 503), fallback model succeeds.
    mockGenerate
      .mockRejectedValueOnce({ status: 503, message: "overloaded" })
      .mockRejectedValueOnce({ status: 503, message: "overloaded again" })
      .mockResolvedValueOnce({
        text: JSON.stringify(validAnalysis),
        modelVersion: "gemini-2.5-flash",
      });

    const svc = new NutritionAnalysisService();
    const result = await svc.analyzeFromImage({
      imageDataUrl: "data:image/jpeg;base64,QUJD",
    });
    expect(result.parsed.mealName).toBe("Arepa con queso");
    expect(mockGenerate).toHaveBeenCalled();
  });
});

describe("NutritionAnalysisService.analyzeFromText", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it("rejects when no description is provided", async () => {
    const svc = new NutritionAnalysisService();
    await expect(
      svc.analyzeFromText({ description: "  " }),
    ).rejects.toMatchObject({ code: "MEAL_DESCRIPTION_REQUIRED" });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("parses a valid text response", async () => {
    mockGenerate.mockResolvedValueOnce({
      text: JSON.stringify(validAnalysis),
      modelVersion: "gemini-2.5-flash-lite",
    });
    const svc = new NutritionAnalysisService();
    const result = await svc.analyzeFromText({ description: "Arepa con queso" });
    expect(result.parsed.mealName).toBe("Arepa con queso");
  });
});