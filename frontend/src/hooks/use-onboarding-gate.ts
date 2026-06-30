import { useCallback } from "react";

import { biomaApi } from "../services/bioma-api";
import type { MeProfileResponse } from "../types/api";

/**
 * Resolves whether a freshly authenticated user still needs to walk
 * through onboarding, or can jump straight to the home screen.
 *
 * SOLID notes
 * ───────────
 * • SRP — this hook owns exactly one decision: "skip onboarding?". It
 *   exposes that decision through {@link resolveOnboardingState} and
 *   does NOT touch navigation state, analytics, or persistence.
 * • DIP — it depends on the {@link BiomaApi} interface, not on the
 *   concrete fetch implementation. Tests can pass a stub.
 * • OCP — adding a new rule (e.g. "force re-onboarding if the app
 *   version changed") only requires updating this single file.
 */
export interface OnboardingGateDecision {
  /** True when the user has a complete `UserProfile` and should land on home. */
  skipOnboarding: boolean;
  /** The raw profile response so callers can hydrate local state. */
  profile: MeProfileResponse;
}

export interface UseOnboardingGate {
  resolveOnboardingState(): Promise<OnboardingGateDecision>;
}

export function useOnboardingGate(): UseOnboardingGate {
  const resolveOnboardingState = useCallback(async (): Promise<OnboardingGateDecision> => {
    const profile = await biomaApi.getMeProfile();
    return {
      skipOnboarding: profile.onboardingComplete,
      profile,
    };
  }, []);

  return { resolveOnboardingState };
}