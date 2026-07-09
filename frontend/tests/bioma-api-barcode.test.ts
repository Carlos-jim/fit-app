import { ApiError } from "../src/services/bioma-api";

// Mock token manager so biomaApi can read tokens.
jest.mock("../src/services/auth-token-manager", () => ({
  tokenManager: {
    getAccessToken: jest.fn(async () => null),
    getRefreshToken: jest.fn(async () => null),
  },
}));

// Mock global fetch so we can assert the request shape.
const fetchMock = jest.fn();
(global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

import { biomaApi } from "../src/services/bioma-api";

const sampleProduct = {
  code: "7501234567890",
  productName: "Coca-Cola Original",
  brand: "Coca-Cola",
  imageUrl: null,
  categories: "Beverages,Sodas",
  servingSize: "330 ml",
  nutriments: {
    energyKcalPer100g: 42,
    proteinGPer100g: 0,
    carbsGPer100g: 10.6,
    fatGPer100g: 0,
    fiberGPer100g: null,
    sugarGPer100g: 10.6,
    sodiumMgPer100g: 14,
  },
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("biomaApi.lookupBarcode", () => {
  it("encodes the barcode and parses the response envelope", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: sampleProduct }),
    });
    const result = await biomaApi.lookupBarcode("7501234567890");
    expect(result?.productName).toBe("Coca-Cola Original");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/foods/barcode/7501234567890");
    expect(url).toContain(encodeURIComponent("7501234567890"));
  });

  it("returns null when the backend reports 404 (envelope null)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: null }),
    });
    const result = await biomaApi.lookupBarcode("9999999999999");
    expect(result).toBeNull();
  });

  it("surfaces ApiError on non-2xx with structured code", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () =>
        JSON.stringify({ error: "OFF_NETWORK_ERROR", message: "down" }),
    });
    await expect(biomaApi.lookupBarcode("1234567890123")).rejects.toMatchObject({
      code: "OFF_NETWORK_ERROR",
      statusCode: 502,
    });
    await expect(biomaApi.lookupBarcode("1234567890123")).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("biomaApi.registerBarcodeMeal", () => {
  it("POSTs the payload and returns the meal analysis summary", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({
          data: {
            id: "log-1",
            userId: "u-1",
            type: "MEAL_ANALYSIS",
            title: "Coca-Cola Original",
            imageUrl: null,
            calories: 42,
            proteinGrams: 0,
            carbsGrams: 11,
            fatGrams: 0,
            confidence: "HIGH",
            ingredients: [],
            warnings: [],
            createdAt: "2026-06-30T00:00:00.000Z",
          },
        }),
    });
    const result = await biomaApi.registerBarcodeMeal({
      barcode: "7501234567890",
      servingGrams: 100,
    });
    expect(result.id).toBe("log-1");
    expect(result.calories).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/foods/barcode/register");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      barcode: "7501234567890",
      servingGrams: 100,
    });
  });
});