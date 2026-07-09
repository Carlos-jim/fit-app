import { sessionStore, type PersistedSession } from "../src/services/session-store";

const memoryStore = new Map<string, string>();

jest.mock("../src/services/bioma-storage", () => ({
  biomaStorage: {
    getItem: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      memoryStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      memoryStore.delete(key);
    }),
    clear: jest.fn(async () => {
      memoryStore.clear();
    }),
  },
}));

beforeEach(() => {
  memoryStore.clear();
});

describe("sessionStore", () => {
  const fixture: PersistedSession = {
    userId: "u-123",
    email: "valentina@bioma.app",
    fullName: "Valentina Pérez",
    plan: "FREE",
    onboardingStep: "goal",
    onboardingGoal: "LOSE_WEIGHT",
    onboardingWeightKg: 62,
    loggedInAt: 1700000000000,
  };

  it("round-trips a session through save / load", async () => {
    await sessionStore.save(fixture);
    const loaded = await sessionStore.load();
    expect(loaded).toEqual(fixture);
  });

  it("returns null when nothing has been saved", async () => {
    expect(await sessionStore.load()).toBeNull();
  });

  it("clear removes the persisted snapshot", async () => {
    await sessionStore.save(fixture);
    await sessionStore.clear();
    expect(await sessionStore.load()).toBeNull();
  });

  it("ignores corrupt JSON payloads instead of throwing", async () => {
    memoryStore.set("bioma_session_v1", "{not json");
    expect(await sessionStore.load()).toBeNull();
  });

  it("rejects entries missing required fields", async () => {
    memoryStore.set(
      "bioma_session_v1",
      JSON.stringify({ email: "x@y.com" /* missing userId */ }),
    );
    expect(await sessionStore.load()).toBeNull();
  });

  it("persists onboarding completion (onboardingStep=null)", async () => {
    await sessionStore.save({ ...fixture, onboardingStep: null });
    expect((await sessionStore.load())?.onboardingStep).toBeNull();
  });
});