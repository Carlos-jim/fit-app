import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import {
  tipsResponseJsonSchema,
  tipsResponseSchema,
  type TipsResponse,
} from "../contracts/generate-tips-request.js";
import { AppError } from "../lib/app-error.js";

const geminiClient = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: { timeout: 45_000 },
});

const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";
const SECONDARY_FALLBACK_GEMINI_MODEL = "gemini-2.5-flash-lite";

const TIPS_SYSTEM_PROMPT = [
  "You are a warm, knowledgeable Latin American nutrition and wellness coach AI for a mobile health app.",
  "You generate weekly personalized tips in Spanish (Latin American) to help users improve their eating habits, make healthier choices, and understand how poor eating affects their body.",
  "Be encouraging, practical, and culturally relevant to Latin America and Venezuela.",
  "Never shame the user. Focus on small, actionable changes.",
  "Return only valid JSON that matches the provided schema.",
].join(" ");

export interface UserProfileSummary {
  goal?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  desiredWeightKg?: number | null;
  gender?: string | null;
  age?: number | null;
  country?: string | null;
  workoutFrequency?: string | null;
  activityLevel?: string | null;
}

export interface RecentMealSummary {
  title: string | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  createdAt: string;
}

export class TipsService {
  async generateWeeklyTips(params: {
    profile: UserProfileSummary;
    recentMeals: RecentMealSummary[];
  }): Promise<TipsResponse> {
    const prompt = this.buildTipsPrompt(params);

    const candidateModels = Array.from(
      new Set([
        env.GEMINI_MODEL,
        FALLBACK_GEMINI_MODEL,
        SECONDARY_FALLBACK_GEMINI_MODEL,
      ]),
    );

    let lastError: unknown;

    console.log("[TipsService] Starting tips generation with models:", candidateModels);
    console.log("[TipsService] Prompt length:", prompt.length);

    for (const modelName of candidateModels) {
      try {
        const maxAttempts =
          modelName === SECONDARY_FALLBACK_GEMINI_MODEL ? 1 : 2;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            console.log(`[TipsService] Trying model ${modelName}, attempt ${attempt}/${maxAttempts}`);

            const response = await geminiClient.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              config: {
                systemInstruction: TIPS_SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseJsonSchema: tipsResponseJsonSchema,
                temperature: 0.6,
                topP: 0.9,
                maxOutputTokens: 4096,
              },
            });

            console.log("[TipsService] Gemini response received, model:", response.modelVersion);

            const rawOutput = response.text?.trim();

            if (!rawOutput) {
              console.error("[TipsService] Gemini returned empty response");
              throw new AppError(
                "Gemini returned an empty response for tips generation.",
                {
                  statusCode: 502,
                  code: "GEMINI_EMPTY_RESPONSE",
                },
              );
            }

            console.log("[TipsService] Raw output length:", rawOutput.length);
            console.log("[TipsService] Raw output preview:", rawOutput.slice(0, 200));

            let parsedJson: unknown;

            try {
              parsedJson = JSON.parse(this.stripCodeFences(rawOutput));
            } catch (error) {
              console.error("[TipsService] JSON parse failed:", error);
              throw new AppError(
                "Gemini returned invalid JSON for tips generation.",
                {
                  statusCode: 502,
                  code: "GEMINI_INVALID_JSON",
                  cause: error,
                },
              );
            }

            const parsed = tipsResponseSchema.safeParse(parsedJson);

            if (!parsed.success) {
              console.error("[TipsService] Schema validation failed:", parsed.error.flatten());
              throw new AppError(
                "Gemini tips response did not match schema.",
                {
                  statusCode: 502,
                  code: "GEMINI_SCHEMA_MISMATCH",
                  cause: parsed.error.flatten(),
                },
              );
            }

            console.log("[TipsService] Successfully generated", parsed.data.tips.length, "tips");
            return parsed.data;
          } catch (error) {
            console.error(`[TipsService] Error on model ${modelName}, attempt ${attempt}:`, error);

            if (error instanceof AppError) {
              throw error;
            }

            if (!this.shouldRetrySameModel(error, attempt, maxAttempts)) {
              throw error;
            }

            await this.delay(800 * attempt);
          }
        }

        throw new Error(
          `Gemini tips attempts exhausted for model ${modelName}.`,
        );
      } catch (error) {
        console.error(`[TipsService] Model ${modelName} failed:`, error);

        if (error instanceof AppError) {
          throw error;
        }

        lastError = error;

        if (!this.shouldRetryWithFallback(error, modelName)) {
          break;
        }
      }
    }

    console.error("[TipsService] All models exhausted. Last error:", lastError);

    const isRateLimited =
      typeof lastError === "object" &&
      lastError !== null &&
      "status" in lastError &&
      (lastError as { status?: number }).status === 429;

    if (isRateLimited) {
      console.warn("[TipsService] Gemini rate limited (429). Returning fallback mock tips.");
      return this.getMockTips();
    }

    throw new AppError("Failed to generate tips with Gemini.", {
      statusCode: 502,
      code: "GEMINI_REQUEST_FAILED",
      cause: lastError,
    });
  }

  private getMockTips(): TipsResponse {
    return {
      tips: [
        {
          title: "Empieza el día con proteína",
          body: "Un desayuno con huevos, arepa integral o yogurt griego te mantiene saciado por más tiempo y evita antojos de azúcar a media mañana.",
          category: "nutricion",
          icon: "nutrition",
        },
        {
          title: "Hidrata antes de cada comida",
          body: "Tomar un vaso de agua 20 minutos antes de comer mejora la digestión y ayuda a controlar las porciones. Apunta a 8 vasos al día.",
          category: "habitos",
          icon: "water",
        },
        {
          title: "Caminar 30 minutos diarios",
          body: "No necesitas un gimnasio. Una caminata rápida después del almuerzo acelera el metabolismo, mejora el estado de ánimo y ayuda a quemar calorías.",
          category: "ejercicio",
          icon: "fitness",
        },
        {
          title: "Dormir bien = peso ideal",
          body: "Dormir menos de 7 horas aumenta la hormona del hambre (ghrelina) y reduce la saciedad. Prioriza un horario de sueño regular.",
          category: "salud_mental",
          icon: "sleep",
        },
        {
          title: "Planifica tus comidas del domingo",
          body: "Dedicar 1 hora el domingo a planificar la semana reduce la tentación de pedir comida rápida. Prepara proteínas y verduras por adelantado.",
          category: "planificacion",
          icon: "bulb",
        },
        {
          title: "Sustituye refrescos por agua con limón",
          body: "Un solo refresco de 350ml tiene hasta 10 cucharadas de azúcar. El agua con limón o hierbabuena es refrescante, hidratante y cero calorías.",
          category: "nutricion",
          icon: "water",
        },
        {
          title: "Come despacio y disfruta cada bocado",
          body: "Tu cerebro tarda 20 minutos en sentirse satisfecho. Comer despacio mejora la digestión y previene el exceso de comida.",
          category: "habitos",
          icon: "restaurant",
        },
      ],
    };
  }

  private buildTipsPrompt(params: {
    profile: UserProfileSummary;
    recentMeals: RecentMealSummary[];
  }): string {
    const { profile, recentMeals } = params;

    const lines = [
      "Genera entre 5 y 7 consejos semanales personalizados para este usuario.",
      "",
      "=== PERFIL DEL USUARIO ===",
    ];

    if (profile.goal) lines.push(`Objetivo: ${profile.goal}`);
    if (profile.weightKg) lines.push(`Peso actual: ${profile.weightKg} kg`);
    if (profile.heightCm) lines.push(`Altura: ${profile.heightCm} cm`);
    if (profile.desiredWeightKg)
      lines.push(`Peso deseado: ${profile.desiredWeightKg} kg`);
    if (profile.gender) lines.push(`Género: ${profile.gender}`);
    if (profile.age) lines.push(`Edad: ${profile.age}`);
    if (profile.country) lines.push(`País: ${profile.country}`);
    if (profile.workoutFrequency)
      lines.push(`Frecuencia de ejercicio: ${profile.workoutFrequency}`);
    if (profile.activityLevel)
      lines.push(`Nivel de actividad: ${profile.activityLevel}`);

    lines.push("");

    if (recentMeals.length > 0) {
      lines.push("=== COMIDAS RECIENTES (última semana) ===");
      for (const meal of recentMeals.slice(0, 10)) {
        lines.push(
          `- ${meal.title ?? "Comida"}: ${Math.round(meal.calories)} kcal, P=${Math.round(meal.proteinGrams)}g, C=${Math.round(meal.carbsGrams)}g, G=${Math.round(meal.fatGrams)}g`,
        );
      }
      lines.push("");
    }

    lines.push("=== INSTRUCCIONES ===");
    lines.push(
      "Cada consejo debe tener un título corto (máx 60 caracteres), un cuerpo explicativo (2-3 oraciones), una categoría y un icono sugerido.",
    );
    lines.push(
      "Los consejos deben ser variados: nutrición, hábitos, ejercicio, salud mental y planificación.",
    );
    lines.push(
      "Sé específico según el objetivo del usuario (perder peso, mantener o ganar).",
    );
    lines.push(
      "Si come mal frecuentemente, explica cómo afecta su metabolismo, energía o sueño sin ser alarmista.",
    );
    lines.push(
      "Sugiere alternativas saludables realistas para Latinoamérica (no ingredientes exóticos o caros).",
    );
    lines.push(
      "Incluye al menos un tip sobre opciones saludables para desayuno, almuerzo o cena.",
    );
    lines.push("Usa un tono cercano, motivador y sin juzgar.");

    return lines.join("\n");
  }

  private shouldRetryWithFallback(
    error: unknown,
    currentModel: string,
  ): boolean {
    if (currentModel === SECONDARY_FALLBACK_GEMINI_MODEL) {
      return false;
    }

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    return status === 404 || status === 503;
  }

  private shouldRetrySameModel(
    error: unknown,
    attempt: number,
    maxAttempts: number,
  ): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    return status === 503;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private stripCodeFences(value: string): string {
    return value.replace(/^```json\s*/u, "").replace(/\s*```$/u, "");
  }
}
