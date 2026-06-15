import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "bioma_access_token";
const REFRESH_TOKEN_KEY = "bioma_refresh_token";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenManager = {
  async setTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
