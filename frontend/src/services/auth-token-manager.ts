import * as SecureStore from "expo-secure-store";
import { biomaStorage } from "./bioma-storage";

const ACCESS_TOKEN_KEY = "bioma_access_token";
const REFRESH_TOKEN_KEY = "bioma_refresh_token";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function secureSetItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await biomaStorage.setItem(key, value);
  }
}

async function secureGetItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return biomaStorage.getItem(key);
  }
}

async function secureDeleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await biomaStorage.removeItem(key);
  }
}

export const tokenManager = {
  async setTokens(tokens: AuthTokens): Promise<void> {
    await secureSetItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    await secureSetItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    return secureGetItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return secureGetItem(REFRESH_TOKEN_KEY);
  },

  async clearTokens(): Promise<void> {
    await secureDeleteItem(ACCESS_TOKEN_KEY);
    await secureDeleteItem(REFRESH_TOKEN_KEY);
  },
};
