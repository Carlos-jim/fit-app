import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStore = new Map<string, string>();
let useMemory = false;

async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  if (useMemory) {
    return fallback();
  }
  try {
    const result = await operation();
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Native module is null") || msg.includes("legacy storage")) {
      console.warn(
        "[Storage] AsyncStorage native module unavailable. Falling back to in-memory storage. " +
          "Run 'expo start -c' or rebuild the development client to restore persistence.",
      );
      useMemory = true;
      return fallback();
    }
    throw e;
  }
}

export const biomaStorage = {
  async getItem(key: string): Promise<string | null> {
    return safeOperation(
      () => AsyncStorage.getItem(key),
      () => memoryStore.get(key) ?? null,
    );
  },

  async setItem(key: string, value: string): Promise<void> {
    return safeOperation(
      () => AsyncStorage.setItem(key, value),
      () => {
        memoryStore.set(key, value);
      },
    );
  },

  async removeItem(key: string): Promise<void> {
    return safeOperation(
      () => AsyncStorage.removeItem(key),
      () => {
        memoryStore.delete(key);
      },
    );
  },

  async clear(): Promise<void> {
    return safeOperation(
      () => AsyncStorage.clear(),
      () => {
        memoryStore.clear();
      },
    );
  },
};
