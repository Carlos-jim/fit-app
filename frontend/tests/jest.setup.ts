// Polyfill EXPO_PUBLIC_* env vars before any module import that reads them.
process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";
process.env.EXPO_PUBLIC_DEFAULT_EMAIL = "demo@bioma.app";
process.env.EXPO_PUBLIC_DEFAULT_NAME = "Valentina";

// Mock expo-secure-store so token manager can run in a Node test env.
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Mock @sentry/react-native so Sentry.init is a no-op.
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage so bioma-storage.ts
// can run in a Node test env (the real native module uses ESM and
// can't be required from Jest's CommonJS runtime).
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  },
}));

// Mock expo-location for tests that touch circadian engine.
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 10.6, longitude: -71.6 },
  })),
}));

// Mock expo-linking — the native module uses ESM and Jest's CommonJS
// runtime can't require it. We only need `parse`, `getInitialURL` and
// `addEventListener` for the deep-link handler tests.
jest.mock("expo-linking", () => {
  const paramsFromQuery = (query: string | null): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!query) return out;
    for (const [k, v] of new URLSearchParams(query)) {
      out[k] = v;
    }
    return out;
  };
  return {
    __esModule: true,
    parse: (input: string) => {
      // Custom schemes like `bioma://reset-password?token=x` aren't
      // understood by node's URL parser, so we extract them by hand.
      const match = /^([a-z][a-z0-9+\-.]*):\/\/([^?]*)(?:\?(.*))?$/iu.exec(
        input,
      );
      if (!match) return { path: "", queryParams: {} };
      const path = match[2] ?? "";
      return { path, queryParams: paramsFromQuery(match[3] ?? null) };
    },
    getInitialURL: jest.fn(async () => null),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
});