import React, { useState } from "react";
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
import { biomaApi, type GoalType } from "../../services/bioma-api";
import { NextButton, OnboardingOptionCard, ProgressBar } from "../onboarding";

const TOTAL_STEPS = 5;
const STEP = 1;

const OPTIONS: { value: GoalType; label: string }[] = [
  { value: "LOSE_WEIGHT", label: "Perder peso" },
  { value: "MAINTAIN", label: "Mantener" },
  { value: "GAIN_WEIGHT", label: "Aumentar de peso" },
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
      console.error("Error saving goal:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.progressWrapper}>
          <ProgressBar
            currentStep={STEP}
            totalSteps={TOTAL_STEPS}
            theme={theme}
          />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          ¿Cuál es su objetivo?
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Esto nos ayuda a generar un plan para su ingesta de calorías.
        </Text>

        <View style={styles.optionsContainer}>
          {OPTIONS.map((option) => (
            <OnboardingOptionCard
              key={option.value}
              option={option}
              selected={selected === option.value}
              onPress={setSelected}
              theme={theme}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            * Su información se eliminará después de generar un plan.
          </Text>
          <NextButton
            enabled={!!selected}
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
  container: {
    flex: 1,
  },
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
  progressWrapper: {
    flex: 1,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    lineHeight: 24,
  },
  optionsContainer: {
    marginTop: 20,
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
