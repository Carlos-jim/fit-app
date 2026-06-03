import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import {
  biomaApi,
  type GoalType,
  type WorkoutFrequency,
} from "../../services/bioma-api";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 2;

const OPTIONS: {
  value: WorkoutFrequency;
  label: string;
  subtitle: string;
  description: string;
  icon: "walk-outline" | "bicycle-outline" | "flame-outline";
  iconColor: string;
  iconBg: string;
  accentBorder: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
}[] = [
  {
    value: "LOW",
    label: "Ritmo suave",
    subtitle: "Cambios graduales y sostenibles",
    description: "Ideal si prefieres un camino tranquilo sin pasar hambre.",
    icon: "walk-outline",
    iconColor: "#76EFE5",
    iconBg: "rgba(118,239,229,0.12)",
    accentBorder: "rgba(118,239,229,0.35)",
    badge: "0.1 – 0.5 kg / semana",
    badgeBg: "rgba(118,239,229,0.1)",
    badgeColor: "#76EFE5",
  },
  {
    value: "MEDIUM",
    label: "Ritmo moderado",
    subtitle: "Balance entre esfuerzo y resultado",
    description: "Lo más recomendado. Verás cambios sin sacrificar tu vida social.",
    icon: "bicycle-outline",
    iconColor: "#F5B700",
    iconBg: "rgba(245,183,0,0.12)",
    accentBorder: "rgba(245,183,0,0.35)",
    badge: "0.5 – 1.0 kg / semana",
    badgeBg: "rgba(245,183,0,0.1)",
    badgeColor: "#F5B700",
  },
  {
    value: "HIGH",
    label: "Ritmo intenso",
    subtitle: "Máximo avance en menos tiempo",
    description: "Para quienes quieren resultados rápidos y están dispuestos a todo.",
    icon: "flame-outline",
    iconColor: "#FF7272",
    iconBg: "rgba(255,114,114,0.12)",
    accentBorder: "rgba(255,114,114,0.35)",
    badge: "1.0 – 1.5 kg / semana",
    badgeBg: "rgba(255,114,114,0.1)",
    badgeColor: "#FF7272",
  },
];

const RECOMMENDED: WorkoutFrequency = "MEDIUM";

type VisualMode = "dark" | "light";

interface OnboardingWorkoutProps {
  userId: string;
  goal: GoalType;
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  onNext: () => void;
  onToggleMode: () => void;
}

export function OnboardingWorkoutScreen({
  userId,
  goal: _goal,
  theme,
  visualMode,
  onBack,
  onNext,
  onToggleMode,
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

  const s = getStyles(theme);

  return (
    <OnboardingShell
      theme={theme}
      visualMode={visualMode}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿A qué ritmo quieres avanzar?"
      subtitle="Calibramos tu plan según la velocidad de cambio que prefieres."
      onBack={onBack}
      onToggleMode={onToggleMode}
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
      <View style={s.list}>
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          const isRec = option.value === RECOMMENDED;
          return (
            <Pressable
              key={option.value}
              onPress={() => setSelected(option.value)}
              style={[
                s.card,
                isSelected && {
                  borderColor: option.accentBorder,
                  backgroundColor: option.iconBg,
                },
              ]}
            >
              <View style={s.cardTop}>
                <View style={[s.iconCircle, { backgroundColor: option.iconBg }]}>
                  <Ionicons name={option.icon} size={22} color={option.iconColor} />
                </View>
                {isRec && !isSelected ? (
                  <View style={[s.recPill, { backgroundColor: option.badgeBg }]}>
                    <Text style={[s.recPillText, { color: option.badgeColor }]}>
                      Recomendado
                    </Text>
                  </View>
                ) : null}
                <View style={[s.radioOuter, isSelected && { borderColor: option.iconColor }]}>
                  {isSelected ? (
                    <View style={[s.radioDot, { backgroundColor: option.iconColor }]} />
                  ) : null}
                </View>
              </View>

              <View style={s.cardBody}>
                <Text style={[s.cardLabel, isSelected && { color: theme.text }]}>
                  {option.label}
                </Text>
                <Text style={s.cardSubtitle}>{option.subtitle}</Text>
                <Text style={[s.cardDesc, isSelected && { color: theme.muted }]}>
                  {option.description}
                </Text>
              </View>

              {isSelected ? (
                <View style={[s.badgeRow, { backgroundColor: option.badgeBg }]}>
                  <Ionicons name="speedometer-outline" size={13} color={option.badgeColor} />
                  <Text style={[s.badgeText, { color: option.badgeColor }]}>
                    {option.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    list: {
      gap: 12,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.stroke,
      paddingVertical: 20,
      paddingHorizontal: 20,
      gap: 14,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      flexShrink: 0,
    },
    recPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginRight: 10,
      flexShrink: 0,
    },
    recPillText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      letterSpacing: 0.4,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.stroke,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "auto",
      flexShrink: 0,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    cardBody: {
      gap: 4,
      paddingLeft: 56,
    },
    cardLabel: {
      color: theme.muted,
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      lineHeight: 22,
    },
    cardSubtitle: {
      color: theme.muted,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 18,
    },
    cardDesc: {
      color: theme.muted,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginLeft: 56,
    },
    badgeText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      letterSpacing: 0.2,
    },
  });
}
