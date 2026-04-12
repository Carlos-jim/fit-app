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
import type { Gender } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import {
  NextButton,
  OnboardingOptionCard,
  ProgressBar,
} from "../onboarding";

const TOTAL_STEPS = 6;
const STEP = 5;

const OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: "MALE", label: "Masculino", icon: "male" },
  { value: "FEMALE", label: "Mujer", icon: "female" },
  { value: "NON_BINARY", label: "No binario", icon: "ellipse-outline" },
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
      console.error("Error saving gender:", err);
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
        <Text style={[styles.title, { color: theme.text }]}>¿Cómo se identifica?</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Esto se utilizará para calibrar su plan personalizado.
        </Text>

        <View style={styles.optionsContainer}>
          {OPTIONS.map((option) => (
            <GenderOptionCard
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

function GenderOptionCard({
  option,
  selected,
  onPress,
  theme,
}: {
  option: (typeof OPTIONS)[number];
  selected: boolean;
  onPress: (value: Gender) => void;
  theme: FitnessTheme;
}) {
  return (
    <Pressable
      onPress={() => onPress(option.value)}
      style={[
        styles.genderCard,
        {
          backgroundColor: selected ? theme.text : theme.cardMuted,
          borderColor: selected ? theme.text : "transparent",
        },
      ]}
    >
      <Ionicons
        name={option.icon as any}
        size={24}
        color={selected ? theme.background : theme.text}
      />
      <Text
        style={[
          styles.genderLabel,
          { color: selected ? theme.background : theme.text },
        ]}
      >
        {option.label}
      </Text>
    </Pressable>
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
  optionsContainer: {
    marginTop: 20,
    gap: 12,
  },
  genderCard: {
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
  },
  genderLabel: {
    fontSize: 18,
    fontWeight: "700",
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
