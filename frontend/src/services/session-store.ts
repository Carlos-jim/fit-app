import { biomaStorage } from "./bioma-storage";

/**
 * Persisted snapshot of the auth/onboarding session.
 *
 * Splitting this from the auth tokens (which already live in SecureStore)
 * lets us rehydrate `userId`, `email`, `fullName`, `plan`, and the
 * in-flight onboarding step on app launch — so the user lands directly
 * on their last screen instead of the welcome splash even when the
 * process was killed.
 */
export interface PersistedSession {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  /** Step where the user left onboarding. `null` means onboarding completed. */
  onboardingStep: PersistedOnboardingStep | null;
  onboardingGoal: "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_WEIGHT" | null;
  onboardingWeightKg: number | null;
  /** Epoch ms of the last successful login — useful for telemetry. */
  loggedInAt: number;
}

export type PersistedOnboardingStep =
  | "goal"
  | "workout"
  | "body"
  | "targetWeight"
  | "gender"
  | "age"
  | "country";

const SESSION_KEY = "bioma_session_v1";

export const sessionStore = {
  async load(): Promise<PersistedSession | null> {
    try {
      const raw = await biomaStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PersistedSession>;
      if (
        typeof parsed.userId !== "string" ||
        typeof parsed.email !== "string"
      ) {
        return null;
      }
      return {
        userId: parsed.userId,
        email: parsed.email,
        fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
        plan: typeof parsed.plan === "string" ? parsed.plan : "FREE",
        onboardingStep: parsed.onboardingStep ?? null,
        onboardingGoal: parsed.onboardingGoal ?? null,
        onboardingWeightKg:
          typeof parsed.onboardingWeightKg === "number"
            ? parsed.onboardingWeightKg
            : null,
        loggedInAt:
          typeof parsed.loggedInAt === "number"
            ? parsed.loggedInAt
            : Date.now(),
      };
    } catch {
      // Corrupt or missing storage entry — treat as no session.
      return null;
    }
  },

  async save(session: PersistedSession): Promise<void> {
    await biomaStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  async clear(): Promise<void> {
    await biomaStorage.removeItem(SESSION_KEY);
  },
};