import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

const log = logger.child("open-food-facts");

/**
 * OpenFoodFacts client with a tiny in-memory TTL cache.
 *
 * SOLID notes
 * ───────────
 * • SRP — this class only knows how to call the public OFF API and
 *   normalise the response into a domain shape. The HTTP layer maps
 *   the shape into a JSON envelope; persistence is a separate concern.
 * • DIP — fetch is injected so tests can swap a stub without touching
 *   real network or `nock`.
 * • OCP — adding a new source (USDA, Edamam) means adding a sibling
 *   service that implements the same shape, not modifying this one.
 *
 * Source
 * ──────
 * https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 * OpenFoodFacts is free, public and needs no API key. We respect their
 * rate limit by caching positive results for 1h and negative results for
 * 5min (so a mistyped barcode can be retried quickly).
 */

export interface OpenFoodFactsNutriments {
  energyKcalPer100g: number | null;
  proteinGPer100g: number | null;
  carbsGPer100g: number | null;
  fatGPer100g: number | null;
  fiberGPer100g: number | null;
  sugarGPer100g: number | null;
  sodiumMgPer100g: number | null;
}

export interface OpenFoodFactsProduct {
  code: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  categories: string | null;
  servingSize: string | null;
  nutriments: OpenFoodFactsNutriments;
}

const POSITIVE_TTL_MS = 60 * 60 * 1000; // 1 hour
const NEGATIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 200;

export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

const defaultFetch: FetchLike = async (input, init) => {
  const res = await fetch(input, init);
  return {
    ok: res.ok,
    status: res.status,
    json: () => res.json(),
  };
};

interface CacheEntry {
  status: "hit" | "miss";
  expiresAt: number;
  product?: OpenFoodFactsProduct | null;
}

export class OpenFoodFactsService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly baseUrl = "https://world.openfoodfacts.org/api/v2",
    private readonly fetchImpl: FetchLike = defaultFetch,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Look up a barcode and return the normalised product. Throws a
   * structured AppError on 404 / network failures.
   */
  async lookup(barcode: string): Promise<OpenFoodFactsProduct | null> {
    const cleanBarcode = barcode.trim();
    if (!/^\d{6,14}$/.test(cleanBarcode)) {
      throw new AppError(
        "Barcode must be a numeric string between 6 and 14 digits.",
        {
          statusCode: 400,
          code: "INVALID_BARCODE",
        },
      );
    }

    const cached = this.cache.get(cleanBarcode);
    if (cached && cached.expiresAt > this.now()) {
      log.debug("OFF cache hit", { barcode: cleanBarcode });
      return cached.product ?? null;
    }

    const url = `${this.baseUrl}/product/${encodeURIComponent(cleanBarcode)}.json`;
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(url, {
        headers: { "User-Agent": "Bioma/1.0 (https://bioma.app)" },
      });
    } catch (err) {
      log.error("OFF network failure", { barcode: cleanBarcode, error: err });
      throw new AppError("Could not reach OpenFoodFacts.", {
        statusCode: 502,
        code: "OFF_NETWORK_ERROR",
        cause: err,
      });
    }

    if (response.status === 404) {
      this.cache.set(cleanBarcode, {
        status: "miss",
        product: null,
        expiresAt: this.now() + NEGATIVE_TTL_MS,
      });
      this.evictIfNeeded();
      return null;
    }

    if (!response.ok) {
      throw new AppError(
        `OpenFoodFacts responded with HTTP ${response.status}.`,
        {
          statusCode: 502,
          code: "OFF_UPSTREAM_ERROR",
        },
      );
    }

    const body = (await response.json()) as unknown;
    const product = parseOpenFoodFactsResponse(cleanBarcode, body);
    this.cache.set(cleanBarcode, {
      status: "miss",
      product,
      expiresAt: this.now() + POSITIVE_TTL_MS,
    });
    this.evictIfNeeded();
    return product;
  }

  /** Test-only: clear the in-memory cache. */
  clearCache(): void {
    this.cache.clear();
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= CACHE_MAX) return;
    // Drop the oldest entries (insertion order).
    const overflow = this.cache.size - CACHE_MAX;
    const keys = this.cache.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      this.cache.delete(next.value);
    }
  }
}

function parseOpenFoodFactsResponse(
  barcode: string,
  body: unknown,
): OpenFoodFactsProduct | null {
  if (
    typeof body !== "object" ||
    body === null ||
    "status" in body === false
  ) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (record.status !== 1) {
    return null; // OpenFoodFacts returns status=0 when not found
  }

  const product = (record.product ?? {}) as Record<string, unknown>;
  const productName = stringOrNull(product.product_name) ??
    stringOrNull(product.product_name_en) ??
    stringOrNull(product.generic_name);
  if (!productName) {
    // No usable name — treat as "not found" so the UI shows a fallback.
    return null;
  }

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  return {
    code: barcode,
    productName,
    brand: stringOrNull(product.brands) ?? stringOrNull(product.brand_owner),
    imageUrl: stringOrNull(product.image_front_url) ??
      stringOrNull(product.image_url),
    categories: stringOrNull(product.categories),
    servingSize: stringOrNull(product.serving_size),
    nutriments: {
      energyKcalPer100g: numberOrNull(nutriments["energy-kcal_100g"]) ??
        numberOrNull(nutriments["energy-kcal"]),
      proteinGPer100g: numberOrNull(nutriments.proteins_100g) ??
        numberOrNull(nutriments.proteins),
      carbsGPer100g: numberOrNull(nutriments.carbohydrates_100g) ??
        numberOrNull(nutriments.carbohydrates),
      fatGPer100g: numberOrNull(nutriments.fat_100g) ??
        numberOrNull(nutriments.fat),
      fiberGPer100g: numberOrNull(nutriments.fiber_100g) ??
        numberOrNull(nutriments.fiber),
      sugarGPer100g: numberOrNull(nutriments.sugars_100g) ??
        numberOrNull(nutriments.sugars),
      // OFF's sodium_100g / sodium fields are conventionally expressed in
      // grams, but our domain expects milligrams.
      sodiumMgPer100g: numberOrNull(nutriments.sodium_100g) !== null
        ? numberOrNull(nutriments.sodium_100g)! * 1000
        : typeof nutriments.sodium === "number"
          ? nutriments.sodium * 1000
          : null,
    },
  };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}