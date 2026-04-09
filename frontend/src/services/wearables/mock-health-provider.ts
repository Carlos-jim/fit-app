import type { HealthProvider } from "./health-provider";

export const mockHealthProvider: HealthProvider = {
  id: "mock-health-provider",
  description:
    "La capa de dispositivos ya esta separada para conectar Apple HealthKit con react-native-health y Android Health Connect con react-native-health-connect. En Expo necesitas una compilacion de desarrollo o prebuild para activar esos modulos nativos; mientras tanto se usa una muestra simulada para el MVP visual.",
  supportsAppleHealth: false,
  supportsHealthConnect: false,
  getSnapshot() {
    return {
      hrvMs: 72,
      steps: 9840,
      vo2Max: 42.3,
      sleep: {
        totalHours: 7.8,
        deepHours: 1.7,
        remHours: 1.6,
      },
    };
  },
};
