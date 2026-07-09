import { create } from "zustand";

import { biomaApi } from "../services/bioma-api";

/**
 * Hydration store with optimistic updates + backend persistence.
 *
 * SOLID notes
 * ───────────
 * • SRP — this store only owns water-glass state. Persistence, sync
 *   and rollback live here too because the store is the single source
 *   of truth for the home screen counter.
 * • DIP — depends on the {@link biomaApi} interface, not on fetch
 *   directly. Tests can swap in a stub.
 *
 * Sync semantics
 * ──────────────
 * On login the store is hydrated from the server. Subsequent
 * increment/decrement calls optimistically update local state and
 * queue a backend call. If the backend rejects (rate limit, network)
 * the change is rolled back and the error re-thrown so the UI can
 * surface it.
 */
interface WaterState {
  waterGlasses: number;
  waterGoal: number;
  syncing: boolean;
  hydrate: (force?: boolean) => Promise<void>;
  increment: () => Promise<void>;
  decrement: () => Promise<void>;
  reset: () => void;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  waterGlasses: 0,
  waterGoal: 8,
  syncing: false,

  async hydrate(force = false) {
    if (get().syncing && !force) return;
    set({ syncing: true });
    try {
      const today = await biomaApi.getTodayHydration();
      set({
        waterGlasses: today.glasses,
        waterGoal: today.target || 8,
        syncing: false,
      });
    } catch {
      // Silently swallow — the home screen will show the last local
      // value and the user can still increment/decrement offline.
      set({ syncing: false });
    }
  },

  async increment() {
    const current = get().waterGlasses;
    const next = Math.min(current + 1, 50);
    if (next === current) return;

    set({ waterGlasses: next });
    try {
      await biomaApi.recordHydration({ glasses: 1 });
    } catch (err) {
      // Roll back and re-throw so the UI can show a toast.
      set({ waterGlasses: current });
      throw err;
    }
  },

  async decrement() {
    const current = get().waterGlasses;
    const next = Math.max(current - 1, 0);
    if (next === current) return;

    set({ waterGlasses: next });
    try {
      // Use a dedicated endpoint that pops the latest entry for the
      // user's current day, instead of fetching a list first. This is
      // ~one round-trip instead of two and avoids race conditions with
      // other clients modifying the list concurrently.
      await biomaApi.deleteLatestHydrationToday();
    } catch (err) {
      // 404 means there was nothing to delete on the server side
      // (e.g. server was restarted and the local counter is stale).
      // Treat that as a no-op rather than rolling back.
      if (err instanceof Error && /NOT_FOUND|HYDRATION_NOT_FOUND/.test(err.message)) {
        return;
      }
      set({ waterGlasses: current });
      throw err;
    }
  },

  reset() {
    set({ waterGlasses: 0, waterGoal: 8, syncing: false });
  },
}));