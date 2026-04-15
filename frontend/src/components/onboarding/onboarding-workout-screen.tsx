import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi, type GoalType, type WorkoutFrequency } from "../../services/bioma-api";
import { NextButton, OnboardingOptionCard, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 2;

const OPTIONS: {
  value: WorkoutFrequency;
  label: string;
  subtitle: string;
  icon: "walk-outline" | "bicycle-outline" | "flame-outline";
  iconColor: string;
  iconBg: string;
  badge: string;
}[] = [
  {
    value: "LOW",
    label: "Ritmo suave",
    subtitle: "Cambios graduales y sostenibles",
    icon: "walk-outline",
    iconColor: "#76EFE5",
    iconBg: "rgba(118,239,229,0.12)",
    badge: "0.1 – 0.5 kg / semana",
  },
  {
    value: "MEDIUM",
    label: "Ritmo moderado",
    subtitle: "Balance entre esfuerzo y resultado",
    icon: "bicycle-outline",
    iconColor: "#F5B700",
    iconBg: "rgba(245,183,0,0.12)",
    badge: "0.5 – 1.0 kg / semana",
  },
  {
    value: "HIGH",
    label: "Ritmo intenso",
    subtitle: "Máximo avance en menos tiempo",
    icon: "flame-outline",
    iconColor: "#FF7272",
    iconBg: "rgba(255,114,114,0.12)",
    badge: "1.0 – 1.5 kg / semana",
  },
];

interface OnboardingWorkoutProps {
  userId: string;
  goal: GoalType;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingWorkoutScreen({
  userId,
  goal: _goal,
  theme,
  onBack,
  onNext,
}: OnboardingWorkoutProps) {
  const [selected, setSelected] = useState<WorkoutFrequency | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await biomaApi.onboardingStep2(userId, selected);
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
      title="¿A qué ritmo quieres avanzar?"
      subtitle="Calibramos tu plan según la velocidad de cambio que prefieres."
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
          <View key={option.value}>
            <OnboardingOptionCard
              option={{ value: option.value, label: option.label }}
              subtitle={option.subtitle}
              icon={option.icon}
              iconColor={option.iconColor}
              iconBg={option.iconBg}
              selected={selected === option.value}
              onPress={setSelected}
              theme={theme}
            />
            {selected === option.value ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{option.badge}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    marginTop: -6,
    marginBottom: 4,
    marginLeft: 18,
    backgroundColor: "rgba(0,200,151,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#00C897",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
