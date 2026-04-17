export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "",
  defaultEmail: process.env.EXPO_PUBLIC_DEFAULT_EMAIL ?? "demo@bioma.app",
  defaultName: process.env.EXPO_PUBLIC_DEFAULT_NAME ?? "Valentina",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
};
