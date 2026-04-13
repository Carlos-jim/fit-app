import { create } from "zustand";

interface WaterState {
  waterGlasses: number;
  waterGoal: number;
  increment: () => void;
  decrement: () => void;
  setWaterGlasses: (amount: number) => void;
}

export const useWaterStore = create<WaterState>((set) => ({
  waterGlasses: 0,
  waterGoal: 8,
  increment: () =>
    set((state) => ({ waterGlasses: Math.min(state.waterGlasses + 1, 20) })),
  decrement: () =>
    set((state) => ({ waterGlasses: Math.max(state.waterGlasses - 1, 0) })),
  setWaterGlasses: (amount) => set({ waterGlasses: amount }),
}));
