import type { WearableSnapshot } from "../../types/wellness";

export interface HealthProvider {
  id: string;
  description: string;
  supportsAppleHealth: boolean;
  supportsHealthConnect: boolean;
  getSnapshot(): WearableSnapshot;
}
