import type { DailyRecommendation, RecoverySnapshot, WearableSnapshot } from "../types/wellness";

export function createRecoverySnapshot(snapshot: WearableSnapshot): RecoverySnapshot {
  const hrvScore = normalize(snapshot.hrvMs, 35, 95);
  const sleepScore = normalize(snapshot.sleep.totalHours, 5, 9);
  const deepSleepScore = normalize(snapshot.sleep.deepHours, 0.8, 2.2);
  const remSleepScore = normalize(snapshot.sleep.remHours, 0.7, 2.0);

  const score = Math.round(
    hrvScore * 0.38 +
      sleepScore * 0.26 +
      deepSleepScore * 0.18 +
      remSleepScore * 0.18,
  );

  if (score >= 80) {
    return {
      score,
      label: "Recuperacion alta",
      state: "high",
    };
  }

  if (score >= 60) {
    return {
      score,
      label: "Recuperacion equilibrada",
      state: "medium",
    };
  }

  return {
    score,
    label: "Recuperacion baja",
    state: "low",
  };
}

export function createDailyRecommendation(
  recovery: RecoverySnapshot,
): DailyRecommendation {
  if (recovery.state === "high") {
    return {
      title: "Dia de empuje recomendado",
      summary:
        "Tu HRV y calidad de sueno sugieren buena recuperacion. Prioriza fuerza, zona 2 corta y una meta alta de proteina.",
    };
  }

  if (recovery.state === "medium") {
    return {
      title: "Carga moderada",
      summary:
        "Mantente activo con caminata, movilidad y un bloque breve de entrenamiento. Evita picos de fatiga innecesarios.",
    };
  }

  return {
      title: "Primero recuperacion",
    summary:
      "Hoy conviene bajar intensidad, caminar suave, hidratarte mejor y priorizar sueno para recuperar variabilidad y energia.",
  };
}

function normalize(value: number, min: number, max: number): number {
  if (value <= min) {
    return 0;
  }

  if (value >= max) {
    return 100;
  }

  return ((value - min) / (max - min)) * 100;
}
