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
}
