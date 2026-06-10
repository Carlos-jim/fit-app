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

export interface AnalyzeMealPayload {
  userId: string;
  path?: string;
  bucket?: string;
  base64Image?: string;
  localImageUrl?: string;
  mealLabel?: string;
  notes?: string;
  consumedAt?: string;
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
  }): Promise<BootstrapUserResponse> {
    const response = await this.request<BootstrapUserResponse>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    return response.data;
  }

  async loginWithEmail(input: {
    email: string;
    password: string;
  }): Promise<BootstrapUserResponse> {
    const response = await this.request<BootstrapUserResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<BootstrapUserResponse> {
    const response = await this.request<BootstrapUserResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", {
      method: "POST",
    });
  }

  async createMealUploadUrl(input: {
    userId: string;
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
    console.log("[API Request] PUT uploadImageToStorage", { uploadUrl, imageUri });

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
          { uploadUrl, imageUri },
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
    userId: string;
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

  async getLogs(userId: string): Promise<MealLog[]> {
    const response = await this.request<MealLog[]>(
      `/logs?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
      },
    );

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

  async analyzeMenuImage(
    imageUrl: string,
    userId: string,
  ): Promise<MenuAnalysisResponse> {
    const response = await this.request<MenuAnalysisResponse>(
      "/logs/analyze-menu-image",
      {
        method: "POST",
        body: JSON.stringify({
          userId,
          imageUrl,
        }),
      },
    );

    return response.data;
  }

  // ─── Onboarding ──────────────────────────────────────────────────

  async onboardingStep1(
    userId: string,
    goal: GoalType,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/1",
      {
        method: "POST",
        body: JSON.stringify({ userId, goal }),
      },
    );
    return response.data;
  }

  async onboardingStep2(
    userId: string,
    workoutFrequency: WorkoutFrequency,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/2",
      {
        method: "POST",
        body: JSON.stringify({ userId, workoutFrequency }),
      },
    );
    return response.data;
  }

  async onboardingStep3(
    userId: string,
    weightKg?: number,
    heightCm?: number,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/3",
      {
        method: "POST",
        body: JSON.stringify({ userId, weightKg, heightCm }),
      },
    );
    return response.data;
  }

  async onboardingStep4(
    userId: string,
    desiredWeightKg?: number,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/4",
      {
        method: "POST",
        body: JSON.stringify({ userId, desiredWeightKg }),
      },
    );
    return response.data;
  }

  async onboardingStep5(
    userId: string,
    gender: Gender,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/5",
      {
        method: "POST",
        body: JSON.stringify({ userId, gender }),
      },
    );
    return response.data;
  }

  async onboardingStep6(
    userId: string,
    age: number,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/6",
      {
        method: "POST",
        body: JSON.stringify({ userId, age }),
      },
    );
    return response.data;
  }

  async onboardingStep7(
    userId: string,
    country: string,
  ): Promise<OnboardingSession> {
    const response = await this.request<OnboardingSession>(
      "/onboarding/step/7",
      {
        method: "POST",
        body: JSON.stringify({ userId, country }),
      },
    );
    return response.data;
  }

  async getOnboardingSession(
    userId: string,
  ): Promise<OnboardingSession | null> {
    try {
      const response = await this.request<OnboardingSession | null>(
        `/onboarding/session?userId=${encodeURIComponent(userId)}`,
        { method: "GET" },
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async deleteOnboardingSession(userId: string): Promise<void> {
    await this.request<void>(
      `/onboarding/session?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
  }

  async generateTips(userId: string, force?: boolean): Promise<UserTip[]> {
    const response = await this.request<UserTip[]>("/tips/generate", {
      method: "POST",
      body: JSON.stringify({ userId, force }),
    });
    return response.data;
  }

  async getTips(userId: string): Promise<UserTip[]> {
    const response = await this.request<UserTip[]>(
      `/tips?userId=${encodeURIComponent(userId)}`,
      { method: "GET" },
    );
    return response.data;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiEnvelope<T>> {
    if (!env.apiBaseUrl) {
      console.error("[API Error] EXPO_PUBLIC_API_BASE_URL is not configured.");
      throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
    }

    const url = `${env.apiBaseUrl}${path}`;
    const method = (init.method ?? "GET").toUpperCase();
    const bodyData = init.body ? JSON.parse(init.body as string) : null;

    console.log(`[API Request] ${method} ${url}`, bodyData ? { body: bodyData } : "");

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });

      const text = await response.text();
      let payload: ApiEnvelope<T> | null = null;

      try {
        payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
      } catch (parseError) {
        console.error(`[API Error] ${method} ${path}: Failed to parse JSON response. Raw text:`, text);
        throw new Error(`Invalid JSON response from ${path}: ${text}`);
      }

      if (!response.ok) {
        console.error(
          `[API Error] ${method} ${path} | Status: ${response.status}`,
          { error: payload?.error, message: payload?.message, body: payload?.data },
        );
        throw new Error(
          payload?.message ?? `Request failed with status ${response.status}.`,
        );
      }

      if (!payload) {
        console.error(`[API Error] ${method} ${path}: Empty response body`);
        throw new Error("Empty API response.");
      }

      console.log(`[API Response] ${method} ${path} | Status: ${response.status}`, { data: payload.data });

      return payload;
    } catch (error) {
      if (error instanceof TypeError) {
        console.error(`[API Network Error] ${method} ${path}:`, error.message);
      } else if (error instanceof Error) {
        console.error(`[API Error] ${method} ${path}:`, error.message);
      }
      throw error;
    }
  }
}

export const biomaApi = new BiomaApi();
