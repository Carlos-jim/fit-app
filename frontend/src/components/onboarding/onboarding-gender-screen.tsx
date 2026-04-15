import React, { useState } from "react";
import { Alert, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import type { Gender } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, OnboardingOptionCard, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 5;

const OPTIONS: {
  value: Gender;
  label: string;
  subtitle: string;
  icon: "male" | "female" | "male-female";
  iconColor: string;
  iconBg: string;
}[] = [
  {
    value: "MALE",
    label: "Masculino",
    subtitle: "Referencia fisiológica masculina",
    icon: "male",
    iconColor: "#4B9FFF",
    iconBg: "rgba(75,159,255,0.12)",
  },
  {
    value: "FEMALE",
    label: "Femenino",
    subtitle: "Referencia fisiológica femenina",
    icon: "female",
    iconColor: "#FF7BAC",
    iconBg: "rgba(255,123,172,0.12)",
  },
  {
    value: "NON_BINARY",
    label: "No binario",
    subtitle: "Configuración inclusiva y personalizada",
    icon: "male-female",
    iconColor: "#A78FFF",
    iconBg: "rgba(167,143,255,0.12)",
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
      title="¿Cómo te identificas?"
      subtitle="Lo usamos para afinar estimaciones fisiológicas de base."
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
