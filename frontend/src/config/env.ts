export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "",
  defaultEmail: process.env.EXPO_PUBLIC_DEFAULT_EMAIL ?? "demo@bioma.app",
  defaultName: process.env.EXPO_PUBLIC_DEFAULT_NAME ?? "Valentina",
};
