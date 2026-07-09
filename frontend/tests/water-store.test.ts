import { useWaterStore } from "../src/store/water-store";
import type { DailyHydration, HydrationEntry } from "../src/types/api";

// Mock biomaApi so the store can call into it.
const mockRecord = jest.fn<Promise<HydrationEntry>, [unknown]>(async () => ({} as HydrationEntry));
const mockGetToday = jest.fn<Promise<DailyHydration>, [unknown]>(async () => ({
  date: "2026-06-30",
  glasses: 4,
  target: 8,
  entries: 4,
}));
const mockList = jest.fn<Promise<HydrationEntry[]>, [unknown]>(async () => []);
const mockDelete = jest.fn<Promise<void>, [string]>(async () => undefined);
const mockDeleteLatest = jest.fn<Promise<void>, [unknown]>(async () => undefined);

jest.mock("../src/services/bioma-api", () => ({
  biomaApi: {
    recordHydration: (input: unknown) => mockRecord(input),
    getTodayHydration: (...args: unknown[]) =>
      (mockGetToday as (...a: unknown[]) => Promise<DailyHydration>)(...args),
    listHydration: (...args: unknown[]) =>
      (mockList as (...a: unknown[]) => Promise<HydrationEntry[]>)(...args),
    deleteHydration: (id: string) => mockDelete(id),
    deleteLatestHydrationToday: (...args: unknown[]) =>
      (mockDeleteLatest as (...a: unknown[]) => Promise<void>)(...args),
  },
}));

beforeEach(() => {
  useWaterStore.getState().reset();
  mockRecord.mockClear();
  mockGetToday.mockClear();
  mockList.mockClear();
  mockDelete.mockClear();
  mockDeleteLatest.mockClear();
});

describe("useWaterStore.hydrate", () => {
  it("loads today's total from the server", async () => {
    await useWaterStore.getState().hydrate();
    expect(useWaterStore.getState().waterGlasses).toBe(4);
    expect(useWaterStore.getState().waterGoal).toBe(8);
    expect(mockGetToday).toHaveBeenCalledTimes(1);
  });

  it("swallows network errors (offline-friendly)", async () => {
    mockGetToday.mockRejectedValueOnce(new Error("network"));
    await useWaterStore.getState().hydrate();
    // State should keep its default values, no throw.
    expect(useWaterStore.getState().waterGlasses).toBe(0);
  });
});

describe("useWaterStore.increment / decrement", () => {
  it("persists a 1-glass entry to the backend", async () => {
    await useWaterStore.getState().increment();
    expect(useWaterStore.getState().waterGlasses).toBe(1);
    expect(mockRecord).toHaveBeenCalledWith({ glasses: 1 });
  });

  it("rolls back on backend failure", async () => {
    mockRecord.mockRejectedValueOnce(new Error("rate limited"));
    await expect(useWaterStore.getState().increment()).rejects.toThrow(
      "rate limited",
    );
    expect(useWaterStore.getState().waterGlasses).toBe(0);
  });

  it("decrement pops the latest entry via the dedicated endpoint", async () => {
    await useWaterStore.getState().hydrate(); // waterGlasses = 4
    await useWaterStore.getState().decrement();
    expect(useWaterStore.getState().waterGlasses).toBe(3);
    expect(mockDeleteLatest).toHaveBeenCalledTimes(1);
    // The old list-then-delete flow must NOT be used any more.
    expect(mockList).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("decrement treats a 404 as a no-op (server already empty)", async () => {
    await useWaterStore.getState().hydrate();
    mockDeleteLatest.mockRejectedValueOnce(
      new Error("HYDRATION_NOT_FOUND"),
    );
    await expect(useWaterStore.getState().decrement()).resolves.toBeUndefined();
    expect(useWaterStore.getState().waterGlasses).toBe(3);
  });

  it("decrement rolls back on other backend failures", async () => {
    await useWaterStore.getState().hydrate();
    mockDeleteLatest.mockRejectedValueOnce(new Error("network"));
    await expect(useWaterStore.getState().decrement()).rejects.toThrow(
      "network",
    );
    expect(useWaterStore.getState().waterGlasses).toBe(4);
  });

  it("decrement is a no-op when already at zero", async () => {
    await useWaterStore.getState().hydrate(); // 4 glasses
    useWaterStore.setState({ waterGlasses: 0 });
    await useWaterStore.getState().decrement();
    expect(mockDeleteLatest).not.toHaveBeenCalled();
  });
});