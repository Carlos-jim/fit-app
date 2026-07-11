import { env } from "../config/env.js";
import {
  tipsResponseJsonSchema,
  tipsResponseSchema,
  type TipsResponse,
} from "../contracts/generate-tips-request.js";
import { AppError } from "../lib/app-error.js";
import { getCandidateModels, llmClient } from "../lib/llm-client.js";
import { logger } from "../lib/logger.js";

const log = logger.child("tips-service");

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

    const candidateModels = getCandidateModels();
    let lastError: unknown;

    log.debug("Starting tips generation", {
      models: candidateModels,
      promptLength: prompt.length,
    });

    for (const modelName of candidateModels) {
      try {
        log.debug("Trying model", { model: modelName });

        const response = await llmClient.generate({
          model: modelName,
          messages: [
            { role: "system", content: TIPS_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          jsonMode: true,
          temperature: 0.6,
          maxTokens: 4096,
        });

        log.debug("LLM response received", { model: response.model });

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(this.stripCodeFences(response.text));
        } catch (error) {
          log.error("JSON parse failed", { error });
          throw new AppError(
            "LLM returned invalid JSON for tips generation.",
            {
              statusCode: 502,
              code: "GEMINI_INVALID_JSON",
              cause: error,
            },
          );
        }

        const parsed = tipsResponseSchema.safeParse(parsedJson);

        if (!parsed.success) {
          log.error("Schema validation failed", {
            issues: parsed.error.flatten(),
          });
          throw new AppError(
            "LLM tips response did not match schema.",
            {
              statusCode: 502,
              code: "GEMINI_SCHEMA_MISMATCH",
              cause: parsed.error.flatten(),
            },
          );
        }

        log.info("Generated tips", { count: parsed.data.tips.length });
        return parsed.data;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        log.error("Model failed", { model: modelName, error });
        lastError = error;
      }
    }

    log.error("All models exhausted", { lastError });

    const isRateLimited =
      typeof lastError === "object" &&
      lastError !== null &&
      "status" in lastError &&
      (lastError as { status?: number }).status === 429;

    if (isRateLimited) {
      log.warn("LLM rate limited (429) — returning fallback tips");
      return this.getMockTips();
    }

    throw new AppError("Failed to generate tips.", {
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

  private stripCodeFences(value: string): string {
    return value.replace(/^```json\s*/u, "").replace(/\s*```$/u, "");
  }
}
