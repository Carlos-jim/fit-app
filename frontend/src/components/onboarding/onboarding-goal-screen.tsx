import React, { useState } from "react";
import { Alert, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi, type GoalType } from "../../services/bioma-api";
import { NextButton, OnboardingOptionCard, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 1;

const OPTIONS: {
  value: GoalType;
  label: string;
  subtitle: string;
  icon: "trending-down" | "remove-circle-outline" | "trending-up";
  iconColor: string;
  iconBg: string;
}[] = [
  {
    value: "LOSE_WEIGHT",
    label: "Perder peso",
    subtitle: "Calcula tu déficit calórico ideal",
    icon: "trending-down",
    iconColor: "#4B9FFF",
    iconBg: "rgba(75,159,255,0.12)",
  },
  {
    value: "MAINTAIN",
    label: "Mantener peso",
    subtitle: "Equilibra tu ingesta energética",
    icon: "remove-circle-outline",
    iconColor: "#F5B700",
    iconBg: "rgba(245,183,0,0.12)",
  },
  {
    value: "GAIN_WEIGHT",
    label: "Ganar peso",
    subtitle: "Incrementa masa de forma saludable",
    icon: "trending-up",
    iconColor: "#00C897",
    iconBg: "rgba(0,200,151,0.12)",
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
      title="¿Cuál es tu objetivo?"
      subtitle="Esto nos ayuda a generar un plan de calorías adaptado a ti."
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
      <View>
        {OPTIONS.map((option) => (
          <OnboardingOptionCard
            key={option.value}
            option={{ value: option.value, label: option.label }}
            subtitle={option.subtitle}
            icon={option.icon}
            iconColor={option.iconColor}
            iconBg={option.iconBg}
            selected={selected === option.value}
            onPress={setSelected}
            theme={theme}
          />
        ))}
      </View>
    </OnboardingShell>
  );
}
