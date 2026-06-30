import { useCallback, useState } from "react";

import { biomaApi } from "../services/bioma-api";
import type { NutritionPlan } from "../types/api";

/**
 * Centralises the side-effects of finishing onboarding:
 *   1) load the server-side nutrition plan (lazy-created by /me/plan),
 *   2) delete the OnboardingSession row so it does not become a zombie.
 *
 * SOLID notes
 * ───────────
 * • SRP — the hook only orchestrates "finish onboarding" cleanup. UI
 *   navigation stays in the caller.
 * • LSP — both operations are best-effort; a 404 on the session delete
 *   (because the session was already cleaned) is silently tolerated.
 */
export interface UseOnboardingCompletion {
  loading: boolean;
  error: string | null;
  finish(): Promise<NutritionPlan | null>;
}

export function useOnboardingCompletion(): UseOnboardingCompletion {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(async (): Promise<NutritionPlan | null> => {
    setLoading(true);
    setError(null);
    try {
      // Try to clean up the OnboardingSession before the plan call so the
      // plan can be built from the freshly-promoted UserProfile.
      try {
        await biomaApi.deleteOnboardingSession();
      } catch (err) {
        // 404 / already deleted → fine, keep going.
        if (!(err instanceof Error) || !err.message.includes("404")) {
          // Surface unexpected failures but don't block the user.
          console.warn("[onboarding] session cleanup warning", err);
        }
      }

      try {
        const plan = await biomaApi.getNutritionPlan();
        return plan;
      } catch (err) {
        console.warn("[onboarding] plan not ready yet", err);
        return null;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo completar el onboarding.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, finish };
}