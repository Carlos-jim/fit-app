import React, { useState, useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import type { GoalType } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import { HorizontalSlider, NextButton, ProgressBar } from "../onboarding";

const TOTAL_STEPS = 6;
const STEP = 4;

const goalLabel: Record<GoalType, string> = {
  LOSE_WEIGHT: "Perder peso",
  MAINTAIN: "Mantener",
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
    switch (goal) {
      case "LOSE_WEIGHT":
        return Math.max(40, currentWeightKg - 10);
      case "GAIN_WEIGHT":
        return Math.min(150, currentWeightKg + 10);
      default:
        return currentWeightKg;
    }
  });
  const [loading, setLoading] = useState(false);

  const sliderRange = useMemo(() => {
    switch (goal) {
      case "LOSE_WEIGHT":
        return { min: 40, max: currentWeightKg };
      case "GAIN_WEIGHT":
        return { min: currentWeightKg, max: 150 };
      default:
        return { min: Math.max(40, currentWeightKg - 20), max: Math.min(150, currentWeightKg + 20) };
    }
  }, [goal, currentWeightKg]);

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep4(userId, desiredWeightKg);
      onNext();
    } catch (err) {
      console.error("Error saving target weight:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={[styles.backButton, { backgroundColor: theme.cardMuted }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.progressWrapper}>
          <ProgressBar currentStep={STEP} totalSteps={TOTAL_STEPS} theme={theme} />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>¿Cuál es su peso deseado?</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Esto se utilizará para calibrar su plan personalizado.
        </Text>

        <View style={styles.goalLabel}>
          <Text style={[styles.goalText, { color: theme.muted }]}>
            {goalLabel[goal]}
          </Text>
        </View>

        <HorizontalSlider
          value={desiredWeightKg}
          min={sliderRange.min}
          max={sliderRange.max}
          step={0.5}
          unit="kg"
          theme={theme}
          onChange={setDesiredWeightKg}
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            * Su información se eliminará después de generar un plan.
          </Text>
          <NextButton
            enabled
            onPress={handleNext}
            loading={loading}
            theme={theme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrapper: { flex: 1 },
  placeholder: { width: 44 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  goalLabel: {
    alignItems: "center",
    marginBottom: 24,
  },
  goalText: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
    gap: 20,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
  },
});
