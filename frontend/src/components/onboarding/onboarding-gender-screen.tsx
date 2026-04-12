import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import type { Gender } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, OnboardingOptionCard, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 5;

const OPTIONS: { value: Gender; label: string; subtitle: string }[] = [
  { value: "MALE", label: "Masculino", subtitle: "Referencia fisiologica masculina." },
  { value: "FEMALE", label: "Femenino", subtitle: "Referencia fisiologica femenina." },
  {
    value: "NON_BINARY",
    label: "No Binario",
    subtitle: "Configuracion inclusiva y personalizada.",
  },
];

interface OnboardingGenderProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingGenderScreen({
  userId,
  theme,
  onBack,
  onNext,
}: OnboardingGenderProps) {
  const [selected, setSelected] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await biomaApi.onboardingStep5(userId, selected);
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
      title="Como te identificas?"
      subtitle="Este dato nos ayuda a afinar estimaciones fisiologicas base."
      onBack={onBack}
      footer={
        <NextButton
          enabled={!!selected}
          onPress={handleNext}
          loading={loading}
          label="Continuar"
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
    gap: 2,
  },
});
