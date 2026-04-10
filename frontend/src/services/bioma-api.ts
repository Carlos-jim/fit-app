import { env } from "../config/env";
import type {
  BootstrapUserResponse,
  MealAnalysisSummary,
  MealLog,
  MealSuggestionResponse,
  UploadMealImageResponse,
} from "../types/api";

export interface AnalyzeMealPayload {
  userId: string;
  path: string;
  bucket?: string;
  mealLabel?: string;
  notes?: string;
  consumedAt?: string;
}

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
    const response = await this.request<BootstrapUserResponse>("/users/bootstrap", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async createMealUploadUrl(input: {
    userId: string;
    fileName: string;
    contentType: string;
  }): Promise<UploadMealImageResponse> {
    const response = await this.request<UploadMealImageResponse>("/uploads/meal-image-url", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async uploadImageToStorage(
    uploadUrl: string,
    imageUri: string,
    headers: Record<string, string>,
  ): Promise<void> {
    const imageResponse = await fetch(imageUri);
    const blob = await imageResponse.blob();

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Storage upload failed with status ${response.status}.`);
    }
  }

  async analyzeMeal(input: AnalyzeMealPayload): Promise<MealAnalysisSummary> {
    return this.analyzeMealImage(input);
  }

  async analyzeMealImage(input: AnalyzeMealPayload): Promise<MealAnalysisSummary> {
    const response = await this.request<MealAnalysisSummary>("/logs/analyze-meal-image", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async analyzeMealText(input: {
    userId: string;
    description: string;
    mealLabel?: string;
    consumedAt?: string;
  }): Promise<MealAnalysisSummary> {
    const response = await this.request<MealAnalysisSummary>("/logs/analyze-meal-text", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return response.data;
  }

  async getLogs(userId: string): Promise<MealLog[]> {
    const response = await this.request<MealLog[]>(`/logs?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
    });

    return response.data;
  }

  async suggestMeal(input: {
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
    const response = await this.request<MealSuggestionResponse>("/logs/suggest-meal", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return response.data;
  }

  private async request<T>(path: string, init: RequestInit): Promise<ApiEnvelope<T>> {
    if (!env.apiBaseUrl) {
      throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
    }

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

    if (!response.ok) {
      throw new Error(payload?.message ?? `Request failed with status ${response.status}.`);
    }

    if (!payload) {
      throw new Error("Empty API response.");
    }

    return payload;
  }
}

export const biomaApi = new BiomaApi();
