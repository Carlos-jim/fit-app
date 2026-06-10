export type PlanType = "FREE" | "PRO" | "ULTRA";

export interface BootstrapUserResponse {
  id: string;
  email: string;
  fullName?: string | null;
  plan: PlanType;
}

export interface UploadMealImageResponse {
  uploadUrl: string;
  bucket: string;
  path: string;
  key: string;
  fileUrl: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

export interface IngredientSummary {
  name: string;
  estimatedGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface MealAnalysisSummary {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  imageUrl: string | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  ingredients: IngredientSummary[];
  warnings: string[];
}

export interface MealLog extends MealAnalysisSummary {
  fiberGrams?: number | null;
  sugarGrams?: number | null;
  sodiumMg?: number | null;
  aiSuggestion?: MealSuggestionResponse | null;
}

export interface SuggestedMeal {
  title: string;
  description: string;
  estimatedCalories: number;
  estimatedProteinGrams: number;
  estimatedCarbsGrams: number;
  estimatedFatGrams: number;
  benefits: string[];
}

export interface MealSuggestionResponse {
  isHealthy: boolean;
  healthScore: number;
  analysis: string;
  positiveAspects: string[];
  concerns: string[];
  suggestion: SuggestedMeal;
}

export interface DishRecommendation {
  name: string;
  description: string;
  estimatedCalories: number;
  estimatedProteinGrams: number;
  estimatedCarbsGrams: number;
  estimatedFatGrams: number;
  matchScore: number;
  reason: string;
}

export interface MenuAnalysisResponse {
  dishesDetected: Array<{
    name: string;
    description: string;
    estimatedCalories: number;
    estimatedProteinGrams: number;
    estimatedCarbsGrams: number;
    estimatedFatGrams: number;
  }>;
  recommendedDishes: DishRecommendation[];
  dishesToAvoid: Array<{
    name: string;
    reason: string;
    estimatedCalories: number;
  }>;
  summary: string;
  totalCaloriesRemaining: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
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

export interface OnboardingSession {
  id: string;
  userId: string;
  goal: GoalType | null;
  weightKg: number | null;
  heightCm: number | null;
  desiredWeightKg: number | null;
  gender: Gender | null;
  age: number | null;
  country: string | null;
  workoutFrequency: WorkoutFrequency | null;
  activityLevel: ActivityLevel | null;
  dietaryPrefs: Record<string, unknown> | null;
  completed: boolean;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
}

export type TipCategory =
  | "nutricion"
  | "habitos"
  | "ejercicio"
  | "salud_mental"
  | "planificacion";

export type TipIcon =
  | "nutrition"
  | "fitness"
  | "heart"
  | "bulb"
  | "restaurant"
  | "water"
  | "sleep"
  | "sunny";

export interface UserTip {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: TipCategory;
  icon: TipIcon | null;
  weekYear: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}
