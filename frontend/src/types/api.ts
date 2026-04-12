export interface BootstrapUserResponse {
  id: string;
  email: string;
  fullName?: string | null;
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
