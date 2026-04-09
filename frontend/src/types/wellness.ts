export interface WearableSnapshot {
  hrvMs: number;
  steps: number;
  vo2Max: number;
  sleep: {
    totalHours: number;
    deepHours: number;
    remHours: number;
  };
}

export interface RecoverySnapshot {
  score: number;
  label: string;
  state: "low" | "medium" | "high";
}

export interface DailyRecommendation {
  title: string;
  summary: string;
}
