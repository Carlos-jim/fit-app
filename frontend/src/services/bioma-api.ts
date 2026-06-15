import { env } from "../config/env";
import type {
  BootstrapUserResponse,
  MealAnalysisSummary,
  MealLog,
  MealSuggestionResponse,
  MenuAnalysisResponse,
  OnboardingSession,
  UploadMealImageResponse,
  UserTip,
} from "../types/api";
import { tokenManager, type AuthTokens } from "./auth-token-manager";

export interface AnalyzeMealPayload {
  path?: string;
  bucket?: string;
  base64Image?: string;
  localImageUrl?: string;
  mealLabel?: string;
  notes?: string;
  consumedAt?: string;
}

export interface AuthResponse {
  user: BootstrapUserResponse;
  tokens: AuthTokens;
}

export type GoalType = "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_WEIGHT";
export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "VERY_ACTIVE";
export type WorkoutFrequency = "LOW" | "MEDIUM" | "HIGH";
export type Gender = "MALE" | "FEMALE" | "NON_BINARY";

interface ApiEnvelope<T> {
  data: T;
  error?: string;
  message?: string;
}

class BiomaApi {
  async bootstrapUser(input: {
    email: string;
    fullName?: string;
  }): Promise<BootstrapUserResponse> {
    const response = await this.request<BootstrapUserResponse>(
      "/users/bootstrap",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return response.data;
  }

  async registerWithEmail(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await tokenManager.setTokens(response.data.tokens);
    return response.data;
  }

  async loginWithEmail(input: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await tokenManager.setTokens(response.data.tokens);
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    await tokenManager.setTokens(response.data.tokens);
    return response.data;
  }

  async refreshAccessToken(): Promise<AuthTokens | null> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await this.request<AuthTokens>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      await tokenManager.setTokens(response.data);
      return response.data;
    } catch {
      await tokenManager.clearTokens();
      return null;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = await tokenManager.getRefreshToken();
    await tokenManager.clearTokens();

    try {
      await this.request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore logout errors
    }
  }

  async createMealUploadUrl(input: {
    fileName: string;
    contentType: string;
  }): Promise<UploadMealImageResponse> {
    const response = await this.request<UploadMealImageResponse>(
      "/uploads/meal-image-url",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return response.data;
  }

  async uploadImageToStorage(
    uploadUrl: string,
    imageUri: string,
    headers: Record<string, string>,
  ): Promise<void> {
    console.log("[API Request] PUT uploadImageToStorage", { uploadUrl });

    try {
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: blob,
      });

      if (!response.ok) {
        console.error(
          `[API Error] PUT uploadImageToStorage | Status: ${response.status}`,
          { uploadUrl },
        );
        throw new Error(`Storage upload failed with status ${response.status}.`);
      }

      console.log("[API Response] PUT uploadImageToStorage | Status:", response.status);
    } catch (error) {
      console.error("[API Error] PUT uploadImageToStorage:", error);
      throw error;
    }
  }

  async analyzeMeal(input: AnalyzeMealPayload): Promise<MealAnalysisSummary> {
    return this.analyzeMealImage(input);
  }

  async analyzeMealImage(
    input: AnalyzeMealPayload,
  ): Promise<MealAnalysisSummary> {
    const response = await this.request<MealAnalysisSummary>(
      "/logs/analyze-meal-image",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return response.data;
  }

  async analyzeMealText(input: {
    description: string;
    mealLabel?: string;
    consumedAt?: string;
  }): Promise<MealAnalysisSummary> {
    const response = await this.request<MealAnalysisSummary>(
      "/logs/analyze-meal-text",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return response.data;
  }

  async getLogs(): Promise<MealLog[]> {
    const response = await this.request<MealLog[]>("/logs", {
      method: "GET",
    });

    return response.data;
  }

  async suggestMeal(input: {
    logId?: string;
    mealTitle: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams?: number | null;
    sugarGrams?: number | null;
    sodiumMg?: number | null;
    ingredients: Array<{
      name: string;
      estimatedGrams: number;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
    }>;
  }): Promise<MealSuggestionResponse> {
    const response = await this.request<MealSuggestionResponse>(
      "/logs/suggest-meal",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    return response.data;
  }

  async analyzeMenuImage(imageUrl: string): Promise<MenuAnalysisResponse> {
    const response = await this.request<MenuAnalysisResponse>(
      "/logs/analyze-menu-image",
      {
        method: "POST",
        body: JSON.stringify({ imageUrl }),
      },
    );

    return response.data;
  }

  // ─── Onboarding ──────────────────────────────────────────────────

  async onboardingStep1(goal: GoalType): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/1",
      {
        method: "POST",
        body: JSON.stringify({ goal }),
      },
    );
    return response.data;
  }

  async onboardingStep2(
    workoutFrequency: WorkoutFrequency,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/2",
      {
        method: "POST",
        body: JSON.stringify({ workoutFrequency }),
      },
    );
    return response.data;
  }

  async onboardingStep3(
    weightKg?: number,
    heightCm?: number,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/3",
      {
        method: "POST",
        body: JSON.stringify({ weightKg, heightCm }),
      },
    );
    return response.data;
  }

  async onboardingStep4(
    desiredWeightKg?: number,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/4",
      {
        method: "POST",
        body: JSON.stringify({ desiredWeightKg }),
      },
    );
    return response.data;
  }

  async onboardingStep5(gender: Gender): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/5",
      {
        method: "POST",
        body: JSON.stringify({ gender }),
      },
    );
    return response.data;
  }

  async onboardingStep6(age: number): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/6",
      {
        method: "POST",
        body: JSON.stringify({ age }),
      },
    );
    return response.data;
  }

  async onboardingStep7(country: string): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/7",
      {
        method: "POST",
        body: JSON.stringify({ country }),
      },
    );
    return response.data;
  }

  async getOnboardingSession(): Promise<OnboardingSession | null> {
    try {
      const response = await this.request<OnboardingSession | null>(
        "/onboarding/session",
        { method: "GET" },
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async deleteOnboardingSession(): Promise<void> {
    await this.request<void>("/onboarding/session", { method: "DELETE" });
  }

  async generateTips(force?: boolean): Promise<UserTip[]> {
    const response = await this.request<UserTip[]>("/tips/generate", {
      method: "POST",
      body: JSON.stringify({ force }),
    });
    return response.data;
  }

  async getTips(): Promise<UserTip[]> {
    const response = await this.request<UserTip[]>("/tips", {
      method: "GET",
    });
    return response.data;
  }

  private refreshPromise: Promise<AuthTokens | null> | null = null;

  private async request<T>(
    path: string,
    init: RequestInit,
    retry = true,
  ): Promise<ApiEnvelope<T>> {
    if (!env.apiBaseUrl) {
      console.error("[API Error] EXPO_PUBLIC_API_BASE_URL is not configured.");
      throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
    }

    const url = `${env.apiBaseUrl}${path}`;
    const method = (init.method ?? "GET").toUpperCase();

    const accessToken = await tokenManager.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (init.headers && typeof init.headers === "object") {
      Object.entries(init.headers).forEach(([key, value]) => {
        if (typeof value === "string") {
          headers[key] = value;
        }
      });
    }
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    console.log(`[API Request] ${method} ${path}`);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
      });

      if (response.status === 401 && retry && path !== "/auth/refresh") {
        const newTokens = await this.performRefresh();
        if (newTokens) {
          headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
          const retryResponse = await fetch(url, {
            ...init,
            headers,
          });
          return this.parseResponse<T>(retryResponse, path, method);
        }
      }

      return this.parseResponse<T>(response, path, method);
    } catch (error) {
      if (error instanceof TypeError) {
        console.error(`[API Network Error] ${method} ${path}:`, error.message);
      } else if (error instanceof Error) {
        console.error(`[API Error] ${method} ${path}:`, error.message);
      }
      throw error;
    }
  }

  private async parseResponse<T>(
    response: Response,
    path: string,
    method: string,
  ): Promise<ApiEnvelope<T>> {
    const text = await response.text();
    let payload: ApiEnvelope<T> | null = null;

    try {
      payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
    } catch {
      console.error(`[API Error] ${method} ${path}: Failed to parse JSON response`);
      throw new Error(`Invalid JSON response from ${path}`);
    }

    if (!response.ok) {
      console.error(`[API Error] ${method} ${path} | Status: ${response.status}`, {
        error: payload?.error,
        message: payload?.message,
      });
      throw new Error(
        payload?.message ?? `Request failed with status ${response.status}.`,
      );
    }

    if (!payload) {
      console.error(`[API Error] ${method} ${path}: Empty response body`);
      throw new Error("Empty API response.");
    }

    console.log(`[API Response] ${method} ${path} | Status: ${response.status}`);

    return payload;
  }

  private async performRefresh(): Promise<AuthTokens | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken();
    }
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }
}

export const biomaApi = new BiomaApi();
