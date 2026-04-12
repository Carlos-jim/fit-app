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
import { biomaApi } from "../../services/bioma-api";
import { HorizontalSlider, NextButton, ProgressBar } from "../onboarding";

const TOTAL_STEPS = 6;
const STEP = 3;

interface OnboardingBodyProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: (weightKg: number) => void;
}

export function OnboardingBodyScreen({
  userId,
  theme,
  onBack,
  onNext,
}: OnboardingBodyProps) {
  const [weightKg, setWeightKg] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep3(userId, weightKg, heightCm);
      onNext(weightKg);
    } catch (err) {
      console.error("Error saving body data:", err);
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
        <Text style={[styles.title, { color: theme.text }]}>Altura y peso</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Esto se utilizará para calibrar su plan personalizado.
        </Text>

        <HorizontalSlider
          value={heightCm}
          min={140}
          max={220}
          step={1}
          unit="cm"
          label="Altura"
          theme={theme}
          onChange={setHeightCm}
        />

        <HorizontalSlider
          value={weightKg}
          min={40}
          max={200}
          step={1}
          unit="kg"
          label="Peso"
          theme={theme}
          onChange={setWeightKg}
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
    marginBottom: 40,
    lineHeight: 24,
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
