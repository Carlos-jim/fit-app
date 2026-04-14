import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import type { GoalType } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import { HorizontalSlider, NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 4;

const goalText: Record<GoalType, string> = {
  LOSE_WEIGHT: "Perder de peso",
  MAINTAIN: "Mantener peso",
  GAIN_WEIGHT: "Aumentar de peso",
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
    return { min: Math.max(35, currentWeightKg - 15), max: currentWeightKg + 15 };
  }, [currentWeightKg, goal]);

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

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿Cual es su peso deseado?"
      subtitle="Esto se utilizara para calibrar su plan personalizado."
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
      <View style={styles.contentBlock}>
        <Text style={styles.goalLabel}>{goalText[goal]}</Text>
        <HorizontalSlider
          value={desiredWeightKg}
          min={range.min}
          max={range.max}
          step={0.5}
          unit="kg"
          majorStep={10}
          centerBand
          formatValue={(current) => `${Math.round(current)}kg`}
          centerHint={`${Math.round(currentWeightKg)}kg`}
          theme={theme}
          onChange={setDesiredWeightKg}
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  contentBlock: {
    marginTop: 168,
  },
  goalLabel: {
    textAlign: "center",
    color: "#7A7D8E",
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    marginBottom: 8,
  },
});
