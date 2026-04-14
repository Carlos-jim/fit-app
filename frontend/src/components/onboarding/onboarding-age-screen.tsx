import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { HorizontalSlider, NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 6;

interface OnboardingAgeProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingAgeScreen({
  userId,
  theme,
  onBack,
  onNext,
}: OnboardingAgeProps) {
  const [age, setAge] = useState(21);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep6(userId, age);
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
      title="Tu edad"
      subtitle="La usamos para definir objetivos y recomendaciones seguras."
      onBack={onBack}
      footer={
        <NextButton
          label="Continuar"
          enabled
          onPress={handleNext}
          loading={loading}
          theme={theme}
        />
      }
    >
      <HorizontalSlider
        value={age}
        min={13}
        max={100}
        step={1}
        unit="anos"
        label="Edad"
        theme={theme}
        onChange={setAge}
      />

      <View style={styles.hintCard}>
        <Text style={styles.hintText}>
          Si eres menor de edad, consulta con un profesional de salud para un
          plan nutricional supervisado.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hintCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#13151E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  hintText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    color: "#555870",
  },
});
