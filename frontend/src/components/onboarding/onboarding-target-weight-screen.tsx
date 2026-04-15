import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import type { GoalType } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import { HorizontalSlider, NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 4;

const GOAL_CONFIG: Record<
  GoalType,
  { label: string; icon: "trending-down" | "remove-circle-outline" | "trending-up"; color: string; bg: string }
> = {
  LOSE_WEIGHT: {
    label: "Perder peso",
    icon: "trending-down",
    color: "#4B9FFF",
    bg: "rgba(75,159,255,0.1)",
  },
  MAINTAIN: {
    label: "Mantener peso",
    icon: "remove-circle-outline",
    color: "#F5B700",
    bg: "rgba(245,183,0,0.1)",
  },
  GAIN_WEIGHT: {
    label: "Ganar peso",
    icon: "trending-up",
    color: "#00C897",
    bg: "rgba(0,200,151,0.1)",
  },
};

interface OnboardingTargetWeightProps {
  userId: string;
  goal: GoalType;
  currentWeightKg: number;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingTargetWeightScreen({
  userId,
  goal,
  currentWeightKg,
  theme,
  onBack,
  onNext,
}: OnboardingTargetWeightProps) {
  const [desiredWeightKg, setDesiredWeightKg] = useState(() => {
    if (goal === "LOSE_WEIGHT") return Math.max(40, currentWeightKg - 5);
    if (goal === "GAIN_WEIGHT") return Math.min(150, currentWeightKg + 5);
    return currentWeightKg;
  });
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    if (goal === "LOSE_WEIGHT") {
      return { min: 35, max: Math.max(45, currentWeightKg + 2) };
    }
    if (goal === "GAIN_WEIGHT") {
      return { min: Math.max(40, currentWeightKg - 2), max: 180 };
    }
    return {
      min: Math.max(35, currentWeightKg - 15),
      max: currentWeightKg + 15,
    };
  }, [currentWeightKg, goal]);

  const diff = Math.round(desiredWeightKg - currentWeightKg);
  const diffLabel =
    diff === 0 ? "Sin cambio" : diff > 0 ? `+${diff} kg` : `${diff} kg`;

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep4(userId, Number(desiredWeightKg.toFixed(1)));
      onNext();
    } catch (err) {
      Alert.alert(
        "No se pudo guardar",
        err instanceof Error ? err.message : "Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const cfg = GOAL_CONFIG[goal];

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿Cuál es tu peso objetivo?"
      subtitle="Ajusta el deslizador a tu meta personal."
      onBack={onBack}
      footer={
        <NextButton
          enabled
          onPress={handleNext}
          loading={loading}
          label="Siguiente"
          theme={theme}
        />
      }
    >
      {/* Goal pill */}
      <View style={[styles.goalPill, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={15} color={cfg.color} />
        <Text style={[styles.goalPillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      <HorizontalSlider
        value={desiredWeightKg}
        min={range.min}
        max={range.max}
        step={0.5}
        unit="kg"
        majorStep={10}
        centerBand
        formatValue={(current) => `${Math.round(current)}kg`}
        centerHint={`Actual: ${Math.round(currentWeightKg)}kg`}
        theme={theme}
        onChange={setDesiredWeightKg}
      />

      {/* Diff indicator */}
      <View style={styles.diffRow}>
        <View style={styles.diffItem}>
          <Text style={styles.diffLabel}>Peso actual</Text>
          <Text style={styles.diffValue}>{Math.round(currentWeightKg)} kg</Text>
        </View>
        <View style={styles.diffSep} />
        <View style={styles.diffItem}>
          <Text style={styles.diffLabel}>Diferencia</Text>
          <Text style={[styles.diffValue, { color: diff < 0 ? "#4B9FFF" : diff > 0 ? "#00C897" : "#4B4E65" }]}>
            {diffLabel}
          </Text>
        </View>
        <View style={styles.diffSep} />
        <View style={styles.diffItem}>
          <Text style={styles.diffLabel}>Objetivo</Text>
          <Text style={styles.diffValue}>{Math.round(desiredWeightKg)} kg</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 4,
  },
  goalPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  diffRow: {
    flexDirection: "row",
    backgroundColor: "#111219",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 16,
  },
  diffItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  diffSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  diffLabel: {
    color: "#3E4259",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  diffValue: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 20,
  },
});
