import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi, type GoalType } from "../../services/bioma-api";
import { NextButton, OnboardingOptionCard, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 1;

const OPTIONS: { value: GoalType; label: string; subtitle: string }[] = [
  {
    value: "LOSE_WEIGHT",
    label: "Perder peso",
    subtitle: "",
  },
  {
    value: "MAINTAIN",
    label: "Mantener",
    subtitle: "",
  },
  {
    value: "GAIN_WEIGHT",
    label: "Aumentar de peso",
    subtitle: "",
  },
];

interface OnboardingGoalProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: (goal: GoalType) => void;
}

export function OnboardingGoalScreen({
  userId,
  theme,
  onBack,
  onNext,
}: OnboardingGoalProps) {
  const [selected, setSelected] = useState<GoalType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await biomaApi.onboardingStep1(userId, selected);
      onNext(selected);
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
      title="¿Cuál es su objetivo?"
      subtitle="Esto nos ayuda a generar un plan para su ingesta de calorías."
      onBack={onBack}
      footer={
        <NextButton
          enabled={!!selected}
          onPress={handleNext}
          loading={loading}
          label="Siguiente"
          theme={theme}
        />
      }
    >
      <View style={styles.optionsContainer}>
        {OPTIONS.map((option) => (
          <OnboardingOptionCard
            key={option.value}
            option={{ value: option.value, label: option.label }}
            subtitle={option.subtitle}
            selected={selected === option.value}
            onPress={setSelected}
            theme={theme}
          />
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    gap: 10,
  },
});
