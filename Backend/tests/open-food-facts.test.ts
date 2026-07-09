import { OpenFoodFactsService, type FetchLike } from "../src/services/open-food-facts.service";

function mockFetch(responses: Array<{ status: number; body: unknown } | Error>): FetchLike {
  let index = 0;
  return jest.fn(async () => {
    const next = responses[index++];
    if (!next) throw new Error("no more mock responses");
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
    } as Awaited<ReturnType<FetchLike>>;
  });
}

const PRODUCT = {
  status: 1,
  product: {
    product_name: "Coca-Cola Original",
    brands: "Coca-Cola",
    image_front_url: "https://example.com/coke.jpg",
    categories: "Beverages,Sodas",
    serving_size: "330 ml",
    nutriments: {
      "energy-kcal_100g": 42,
      proteins_100g: 0,
      carbohydrates_100g: 10.6,
      fat_100g: 0,
      sugars_100g: 10.6,
      sodium_100g: 0.014,
    },
  },
};

describe("OpenFoodFactsService.lookup", () => {
  it("rejects malformed barcodes", async () => {
    const svc = new OpenFoodFactsService("https://api.test", mockFetch([]));
    await expect(svc.lookup("abc123")).rejects.toMatchObject({
      code: "INVALID_BARCODE",
    });
    await expect(svc.lookup("12345")).rejects.toMatchObject({
      code: "INVALID_BARCODE",
    });
    await expect(svc.lookup("123456789012345")).rejects.toMatchObject({
      code: "INVALID_BARCODE",
    });
  });

  it("returns null on 404 and caches the negative result", async () => {
    const fetchImpl = mockFetch([{ status: 404, body: { status: 0 } }]);
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => 0);
    const result = await svc.lookup("9999999999999");
    expect(result).toBeNull();

    // Second call hits the cache (no fetch dispatched).
    await svc.lookup("9999999999999");
    expect((fetchImpl as jest.Mock).mock.calls.length).toBe(1);
  });

  it("normalises a successful OFF payload", async () => {
    const fetchImpl = mockFetch([{ status: 200, body: PRODUCT }]);
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => 0);
    const result = await svc.lookup("7501234567890");
    expect(result?.productName).toBe("Coca-Cola Original");
    expect(result?.brand).toBe("Coca-Cola");
    expect(result?.imageUrl).toBe("https://example.com/coke.jpg");
    expect(result?.nutriments.energyKcalPer100g).toBe(42);
    expect(result?.nutriments.carbsGPer100g).toBe(10.6);
    // Sodium stored in grams in OFF (0.014) — service should expose mg.
    expect(result?.nutriments.sodiumMgPer100g).toBeCloseTo(14, 5);
  });

  it("uses english fallback when product_name is missing in the default locale", async () => {
    const fetchImpl = mockFetch([
      {
        status: 200,
        body: {
          status: 1,
          product: {
            product_name_en: "Whole Wheat Bread",
            nutriments: { "energy-kcal_100g": 247, proteins_100g: 13 },
          },
        },
      },
    ]);
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => 0);
    const result = await svc.lookup("1234567890123");
    expect(result?.productName).toBe("Whole Wheat Bread");
    expect(result?.nutriments.proteinGPer100g).toBe(13);
  });

  it("returns null when the OFF payload has status=0 even with HTTP 200", async () => {
    const fetchImpl = mockFetch([{ status: 200, body: { status: 0 } }]);
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => 0);
    const result = await svc.lookup("1234567890123");
    expect(result).toBeNull();
  });

  it("throws OFF_NETWORK_ERROR when fetch throws", async () => {
    const fetchImpl = mockFetch([new Error("ECONNRESET")]);
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => 0);
    await expect(svc.lookup("1234567890123")).rejects.toMatchObject({
      code: "OFF_NETWORK_ERROR",
    });
  });

  it("throws OFF_UPSTREAM_ERROR on 5xx", async () => {
    const fetchImpl = mockFetch([{ status: 503, body: { error: "down" } }]);
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => 0);
    await expect(svc.lookup("1234567890123")).rejects.toMatchObject({
      code: "OFF_UPSTREAM_ERROR",
    });
  });

  it("caches positive results and refetches after TTL expires", async () => {
    const fetchImpl = mockFetch([
      { status: 200, body: PRODUCT },
      { status: 200, body: PRODUCT },
    ]);
    let now = 1000;
    const svc = new OpenFoodFactsService("https://api.test", fetchImpl, () => now);
    await svc.lookup("1234567890123");
    // Re-call within TTL: should NOT refetch.
    now += 5 * 60 * 1000;
    await svc.lookup("1234567890123");
    expect((fetchImpl as jest.Mock).mock.calls.length).toBe(1);

    // Advance time past TTL — next call should refetch.
    now += 60 * 60 * 1000;
    await svc.lookup("1234567890123");
    expect((fetchImpl as jest.Mock).mock.calls.length).toBe(2);
  });
});