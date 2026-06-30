import { env } from "../config/env";
import type {
  BodyMetric,
  BodyMetricType,
  BootstrapUserResponse,
  DailyHydration,
  HydrationEntry,
  MealAnalysisSummary,
  MealLog,
  MealSuggestionResponse,
  MeProfileResponse,
  MenuAnalysisResponse,
  NutritionPlan,
  OnboardingSession,
  UploadMealImageResponse,
  UserProfile,
  UserTip,
  Workout,
  WorkoutType,
} from "../types/api";
import { tokenManager, type AuthTokens } from "./auth-token-manager";

export interface AnalyzeMealPayload {
  path?: string;
  bucket?: string;
  mealLabel?: string;
  notes?: string;
  consumedAt?: string;
}

export interface AuthResponse {
  user: BootstrapUserResponse;
  tokens: AuthTokens;
}

/**
 * Structured API error that preserves the backend's machine-readable
 * `code` and `details` so callers can branch on failure mode
 * (e.g. show a "Resend verification" CTA for `UNVERIFIED_GOOGLE_EMAIL`).
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(opts: {
    message: string;
    statusCode: number;
    code: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
  }

  /** Convenience helpers for the most common cases. */
  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isValidation(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
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

    // Always invalidate the server-side session FIRST so the refresh
    // token can't be replayed even if local cleanup later fails.
    try {
      if (refreshToken) {
        await this.request<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Even if the network call fails, we still scrub local state.
    } finally {
      await tokenManager.clearTokens();
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
    blob: Blob,
    headers: Record<string, string>,
  ): Promise<void> {
    if (__DEV__) {
      // Avoid logging the signed URL in production — it embeds a
      // capability token that grants access to a user-uploaded asset.
      console.log("[upload] PUT to storage");
    }

    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: blob,
      });

      if (!response.ok) {
        throw new ApiError({
          message: `Storage upload failed with status ${response.status}.`,
          statusCode: response.status,
          code: "STORAGE_UPLOAD_FAILED",
        });
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError({
        message:
          error instanceof Error ? error.message : "Storage upload failed.",
        statusCode: 0,
        code: "STORAGE_UPLOAD_FAILED",
      });
    }
  }

  /**
   * End-to-end flow for image analysis:
   * 1) Request a signed upload URL.
   * 2) PUT the image directly to Supabase Storage.
   * 3) Call /logs/analyze-meal-image with the storage path.
   *
   * This avoids sending raw base64 over our backend.
   */
  async analyzeMealImageFromUri(input: {
    imageUri: string;
    fileName: string;
    contentType: string;
    mealLabel?: string;
    notes?: string;
    consumedAt?: string;
  }): Promise<MealAnalysisSummary> {
    const imageResponse = await fetch(input.imageUri);
    const blob = await imageResponse.blob();

    const upload = await this.createMealUploadUrl({
      fileName: input.fileName,
      contentType: input.contentType,
    });
    await this.uploadImageToStorage(upload.uploadUrl, blob, upload.requiredHeaders);

    return this.analyzeMealImage({
      path: upload.path,
      bucket: upload.bucket,
      mealLabel: input.mealLabel,
      notes: input.notes,
      consumedAt: input.consumedAt,
    });
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

  // ─── Me (profile + nutrition plan) ────────────────────────────────

  async getMeProfile(): Promise<MeProfileResponse> {
    const response = await this.request<MeProfileResponse>("/me/profile", {
      method: "GET",
    });
    return response.data;
  }

  async getNutritionPlan(): Promise<NutritionPlan | null> {
    const response = await this.request<NutritionPlan | null>("/me/plan", {
      method: "GET",
    });
    return response.data;
  }

  async recomputeNutritionPlan(): Promise<NutritionPlan | null> {
    const response = await this.request<NutritionPlan | null>(
      "/me/plan/recompute",
      { method: "POST" },
    );
    return response.data;
  }

  // ─── Hydration tracking ─────────────────────────────────────────

  async recordHydration(input: {
    glasses: number;
    notes?: string;
    recordedAt?: string;
  }): Promise<HydrationEntry> {
    const response = await this.request<HydrationEntry>("/hydration", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async getTodayHydration(): Promise<DailyHydration> {
    const response = await this.request<DailyHydration>(
      "/hydration/today",
      { method: "GET" },
    );
    return response.data;
  }

  async listHydration(params?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<HydrationEntry[]> {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    const response = await this.request<HydrationEntry[]>(
      `/hydration${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
    return response.data;
  }

  async deleteHydration(id: string): Promise<void> {
    await this.request<{ id: string }>(`/hydration/${id}`, {
      method: "DELETE",
    });
  }

  // ─── Workouts ────────────────────────────────────────────────────

  async createWorkout(input: {
    type: WorkoutType;
    name: string;
    durationMinutes: number;
    caloriesBurned?: number;
    intensity?: string;
    notes?: string;
    performedAt?: string;
    sets: Array<{
      exercise: string;
      reps?: number;
      weightKg?: number;
      durationSec?: number;
      distanceMeters?: number;
    }>;
  }): Promise<Workout> {
    const response = await this.request<Workout>("/workouts", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async listWorkouts(params?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<Workout[]> {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    const response = await this.request<Workout[]>(
      `/workouts${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
    return response.data;
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.request<{ id: string }>(`/workouts/${id}`, {
      method: "DELETE",
    });
  }

  async updateMyProfile(patch: {
    goal?: "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_WEIGHT";
    weightKg?: number;
    heightCm?: number;
    desiredWeightKg?: number;
    gender?: "MALE" | "FEMALE" | "NON_BINARY";
    age?: number;
    country?: string;
    workoutFrequency?: "LOW" | "MEDIUM" | "HIGH";
    activityLevel?:
      | "SEDENTARY"
      | "LIGHT"
      | "MODERATE"
      | "ACTIVE"
      | "VERY_ACTIVE";
    dietaryPrefs?: unknown;
  }): Promise<UserProfile> {
    const response = await this.request<UserProfile>("/me/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return response.data;
  }

  async exportMyData(): Promise<Record<string, unknown>> {
    const response = await this.request<Record<string, unknown>>(
      "/me/data-export",
      { method: "GET" },
    );
    return response.data;
  }

  async deleteMyAccount(): Promise<{ id: string; deletedAt: string }> {
    const response = await this.request<{ id: string; deletedAt: string }>(
      "/me/account",
      { method: "DELETE" },
    );
    return response.data;
  }

  // ─── Body metrics ────────────────────────────────────────────────

  async createBodyMetric(input: {
    type: BodyMetricType;
    value: number;
    unit: string;
    notes?: string;
    recordedAt?: string;
  }): Promise<BodyMetric> {
    const response = await this.request<BodyMetric>("/body-metrics", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  }

  async listBodyMetrics(params?: {
    type?: BodyMetricType;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<BodyMetric[]> {
    const search = new URLSearchParams();
    if (params?.type) search.set("type", params.type);
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    const response = await this.request<BodyMetric[]>(
      `/body-metrics${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
    return response.data;
  }

  async deleteBodyMetric(id: string): Promise<void> {
    await this.request<{ id: string }>(`/body-metrics/${id}`, {
      method: "DELETE",
    });
  }

  // ─── Password reset & email verification ─────────────────────────

  async forgotPassword(email: string): Promise<{ delivered: boolean }> {
    const response = await this.request<{ delivered: boolean }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) },
    );
    return response.data;
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>(
      "/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, password }) },
    );
    return response.data;
  }

  async verifyEmail(token: string): Promise<{
    success: boolean;
    user: { id: string; email: string; emailVerified: boolean };
  }> {
    const response = await this.request<{
      success: boolean;
      user: { id: string; email: string; emailVerified: boolean };
    }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    return response.data;
  }

  async resendVerification(email: string): Promise<{ delivered: boolean }> {
    const response = await this.request<{ delivered: boolean }>(
      "/auth/resend-verification",
      { method: "POST", body: JSON.stringify({ email }) },
    );
    return response.data;
  }

  private refreshPromise: Promise<AuthTokens | null> | null = null;

  private async request<T>(
    path: string,
    init: RequestInit,
    retry = true,
  ): Promise<ApiEnvelope<T>> {
    if (!env.apiBaseUrl) {
      throw new ApiError({
        message: "EXPO_PUBLIC_API_BASE_URL is not configured.",
        statusCode: 0,
        code: "API_NOT_CONFIGURED",
      });
    }

    const url = `${env.apiBaseUrl}${path}`;

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
          return this.parseResponse<T>(retryResponse, path);
        }
      }

      return this.parseResponse<T>(response, path);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError({
        message:
          error instanceof Error ? error.message : "Network error.",
        statusCode: 0,
        code: "NETWORK_ERROR",
      });
    }
  }

  private async parseResponse<T>(
    response: Response,
    path: string,
  ): Promise<ApiEnvelope<T>> {
    const text = await response.text();
    let payload: ApiEnvelope<T> | null = null;

    try {
      payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
    } catch {
      throw new ApiError({
        message: `Invalid JSON response from ${path}`,
        statusCode: response.status,
        code: "INVALID_RESPONSE",
      });
    }

    if (!response.ok) {
      throw new ApiError({
        message:
          payload?.message ?? `Request failed with status ${response.status}.`,
        statusCode: response.status,
        code: payload?.error ?? `HTTP_${response.status}`,
        details: payload?.error ? payload : null,
      });
    }

    if (!payload) {
      throw new ApiError({
        message: "Empty API response.",
        statusCode: response.status,
        code: "EMPTY_RESPONSE",
      });
    }

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
