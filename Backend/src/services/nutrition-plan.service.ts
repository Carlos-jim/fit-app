import { type PrismaClient, type BodyMetric, BodyMetricType, type UserProfile } from "@prisma/client";

import type { BodyMetricType as BodyMetricTypeName } from "../contracts/body-metric-request.js";
import {
  nutritionPlanJsonSchema,
  nutritionPlanSchema,
  type NutritionPlanOutput,
} from "../contracts/nutrition-plan.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { llmClient, type LLMClient } from "../lib/llm-client.js";

export interface CreateBodyMetricInput {
  userId: string;
  type: BodyMetricTypeName;
  value: number;
  unit: string;
  notes?: string;
  recordedAt?: Date;
}

export class BodyMetricRepository {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateBodyMetricInput): Promise<BodyMetric> {
    return this.prisma.bodyMetric.create({
      data: {
        userId: input.userId,
        type: input.type as BodyMetricType,
        value: input.value,
        unit: input.unit,
        notes: input.notes ?? null,
        recordedAt: input.recordedAt ?? new Date(),
      },
    });
  }

  async list(
    userId: string,
    opts?: {
      type?: BodyMetricTypeName;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<BodyMetric[]> {
    return this.prisma.bodyMetric.findMany({
      where: {
        userId,
        type: opts?.type ? (opts.type as BodyMetricType) : undefined,
        recordedAt: {
          gte: opts?.from,
          lte: opts?.to,
        },
      },
      orderBy: { recordedAt: "desc" },
      take: opts?.limit ?? 100,
    });
  }

  async latestOfType(userId: string, type: BodyMetricTypeName): Promise<BodyMetric | null> {
    return this.prisma.bodyMetric.findFirst({
      where: { userId, type: type as BodyMetricType },
      orderBy: { recordedAt: "desc" },
    });
  }

  async delete(userId: string, id: string): Promise<BodyMetric | null> {
    const existing = await this.prisma.bodyMetric.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;
    return this.prisma.bodyMetric.delete({ where: { id: existing.id } });
  }
}

const PLAN_SYSTEM_PROMPT = [
  "Eres un nutricionista deportivo que diseña planes calóricos personalizados para una aplicación móvil de salud usada en Venezuela y Latinoamérica.",
  "Tu única tarea es producir un plan diario (calorías objetivo + distribución de macronutrientes) coherente con el perfil del usuario.",
  "Debes basarte en Mifflin-St Jeor para BMR y un multiplicador de actividad para TDEE, ajustando según el objetivo.",
  "Para LOSE_WEIGHT aplica un déficit moderado (10-20% bajo TDEE); para GAIN_WEIGHT aplica un superávit moderado (10-15% sobre TDEE); para MAINTAIN usa TDEE directo.",
  "Los porcentajes de macros deben sumar exactamente 100 y estar alineados con el objetivo (más proteína en déficit, más carbohidrato en superávit, ~25-35% grasa siempre).",
  "Nunca devuelvas calorías por debajo de 1200 kcal/día (límite de seguridad) ni por encima de 5000 kcal/día.",
  "Redondea los gramos a números enteros y los porcentajes también a enteros.",
  "Devuelve únicamente JSON válido que cumpla el esquema provisto; nada de texto adicional, markdown ni comentarios.",
  "Escribe la justificación (`rationale`) en español, máximo 2 frases cortas, sin revelar los números del cálculo.",
].join(" ");

interface GenerateOptions {
  llmClient?: LLMClient;
  model?: string;
  timeoutMs?: number;
}

export class NutritionPlanService {
  private readonly client: LLMClient;
  private readonly model: string;

  constructor(
    private prisma: PrismaClient,
    opts: GenerateOptions = {},
  ) {
    this.client = opts.llmClient ?? llmClient;
    this.model = opts.model ?? env.OLLAMA_MODEL ?? env.GEMINI_MODEL;
  }

  async ensurePlanForProfile(userId: string, profile: UserProfile | null) {
    if (!profile || !profile.weightKg || !profile.heightCm || !profile.age) {
      return null;
    }

    const existing = await this.prisma.nutritionPlan.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    const plan = await this.generateAndPersist(userId, profile);
    return plan;
  }

  async get(userId: string) {
    return this.prisma.nutritionPlan.findUnique({ where: { userId } });
  }

  async recompute(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    return this.generateAndPersist(userId, profile);
  }

  private async generateAndPersist(userId: string, profile: UserProfile) {
    const generated = await this.callGemini(profile);

    return this.prisma.nutritionPlan.upsert({
      where: { userId },
      create: {
        userId,
        dailyCalories: generated.dailyCalories,
        proteinGrams: generated.proteinGrams,
        carbsGrams: generated.carbsGrams,
        fatGrams: generated.fatGrams,
        proteinPercentage: generated.proteinPercentage,
        carbsPercentage: generated.carbsPercentage,
        fatPercentage: generated.fatPercentage,
        bmr: generated.bmr,
        tdee: generated.tdee,
        source: "gemini",
        generatedAt: new Date(),
      },
      update: {
        dailyCalories: generated.dailyCalories,
        proteinGrams: generated.proteinGrams,
        carbsGrams: generated.carbsGrams,
        fatGrams: generated.fatGrams,
        proteinPercentage: generated.proteinPercentage,
        carbsPercentage: generated.carbsPercentage,
        fatPercentage: generated.fatPercentage,
        bmr: generated.bmr,
        tdee: generated.tdee,
        source: "gemini",
        generatedAt: new Date(),
      },
    });
  }

  private async callGemini(profile: UserProfile): Promise<NutritionPlanOutput> {
    const prompt = buildPlanPrompt(profile);

    let raw: string;
    try {
      const response = await this.client.generate({
        model: this.model,
        messages: [
          { role: "system", content: PLAN_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        jsonMode: true,
        temperature: 0.4,
      });
      raw = response.text;
    } catch (error) {
      throw new AppError("Nutrition AI is currently unavailable. Please retry shortly.", {
        statusCode: 503,
        code: "GEMINI_UNAVAILABLE",
        cause: error,
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new AppError("Nutrition AI returned a malformed response.", {
        statusCode: 502,
        code: "GEMINI_INVALID_RESPONSE",
        cause: error,
      });
    }

    const result = nutritionPlanSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new AppError("Nutrition AI response did not match the expected schema.", {
        statusCode: 502,
        code: "GEMINI_SCHEMA_MISMATCH",
        cause: result.error,
      });
    }

    return result.data;
  }
}

function buildPlanPrompt(profile: UserProfile): string {
  const dietaryPrefs = Array.isArray(profile.dietaryPrefs)
    ? profile.dietaryPrefs.filter((entry): entry is string => typeof entry === "string")
    : [];

  return [
    "Genera un plan calórico diario para el siguiente usuario.",
    "",
    "Perfil:",
    `- Género: ${profile.gender ?? "no especificado"}`,
    `- Edad: ${profile.age ?? "no especificada"} años`,
    `- Peso actual: ${profile.weightKg} kg`,
    `- Estatura: ${profile.heightCm} cm`,
    `- Peso deseado: ${profile.desiredWeightKg ?? "no especificado"} kg`,
    `- Objetivo: ${profile.goal ?? "MAINTAIN"}`,
    `- Nivel de actividad reportado: ${profile.activityLevel ?? "no especificado"}`,
    `- Frecuencia de entrenamiento: ${profile.workoutFrequency ?? "no especificada"}`,
    `- País: ${profile.country ?? "no especificado"}`,
    `- Preferencias alimentarias: ${
      dietaryPrefs.length > 0 ? dietaryPrefs.join(", ") : "ninguna declarada"
    }`,
    "",
    "Devuelve el JSON con el esquema solicitado.",
  ].join("\n");
}