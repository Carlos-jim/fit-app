import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import type { GoalType } from "../../services/bioma-api";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 4;

const GOAL_CONFIG: Record<
  GoalType,
  {
    label: string;
    icon: "trending-down" | "remove-circle-outline" | "trending-up";
    color: string;
    bg: string;
    arrowIcon: "arrow-down" | "arrow-forward" | "arrow-up";
  }
> = {
  LOSE_WEIGHT: {
    label: "Perder peso",
    icon: "trending-down",
    color: "#4B9FFF",
    bg: "rgba(75,159,255,0.1)",
    arrowIcon: "arrow-down",
  },
  MAINTAIN: {
    label: "Mantener peso",
    icon: "remove-circle-outline",
    color: "#F5B700",
    bg: "rgba(245,183,0,0.1)",
    arrowIcon: "arrow-forward",
  },
  GAIN_WEIGHT: {
    label: "Ganar peso",
    icon: "trending-up",
    color: "#00C897",
    bg: "rgba(0,200,151,0.1)",
    arrowIcon: "arrow-up",
  },
};

type VisualMode = "dark" | "light";

interface OnboardingTargetWeightProps {
  userId: string;
  goal: GoalType;
  currentWeightKg: number;
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  onNext: () => void;
  onToggleMode: () => void;
}

export function OnboardingTargetWeightScreen({
  userId,
  goal,
  currentWeightKg,
  theme,
  visualMode,
  onBack,
  onNext,
  onToggleMode,
}: OnboardingTargetWeightProps) {
  const [desiredWeightKg, setDesiredWeightKg] = useState(() => {
    if (goal === "LOSE_WEIGHT") return Math.max(40, currentWeightKg - 5);
    if (goal === "GAIN_WEIGHT") return Math.min(150, currentWeightKg + 5);
    return currentWeightKg;
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const pulse = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const range = useMemo(() => {
    if (goal === "LOSE_WEIGHT") {
      return { min: 35, max: Math.max(45, currentWeightKg + 2) };
    }
    if (goal === "GAIN_WEIGHT") {
      return { min: Math.max(40, currentWeightKg - 2), max: 180 };
    }
    return {
      min: Math.max(35, currentWeightKg - 15),
      max: currentWeightKg + 15,
    };
  }, [currentWeightKg, goal]);

  const step = goal === "LOSE_WEIGHT" ? -0.5 : goal === "GAIN_WEIGHT" ? 0.5 : 0.5;

  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 80, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [pulse]);

  const changeWeight = useCallback(
    (delta: number) => {
      setDesiredWeightKg((prev) => {
        const next = Math.round((prev + delta * 0.5) * 2) / 2;
        if (next < range.min || next > range.max) return prev;
        triggerPulse();
        return next;
      });
    },
    [range, triggerPulse],
  );

  const startHold = useCallback((cb: () => void) => {
    cb();
    timeoutTimer.current = setTimeout(() => {
      holdTimer.current = setInterval(cb, 80);
    }, 400);
  }, []);

  const endHold = useCallback(() => {
    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current);
      timeoutTimer.current = null;
    }
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const commitEdit = useCallback((text: string) => {
    const num = parseFloat(text);
    if (!isNaN(num)) {
      const rounded = Math.round(num * 2) / 2;
      if (rounded >= range.min && rounded <= range.max) {
        setDesiredWeightKg(rounded);
        triggerPulse();
      }
    }
    setEditing(false);
  }, [range, triggerPulse]);

  const diff = Math.round(desiredWeightKg - currentWeightKg);
  const diffLabel =
    diff === 0 ? "Sin cambio" : diff > 0 ? `+${diff} kg` : `${diff} kg`;

  const diffColor =
    diff < 0 ? "#4B9FFF" : diff > 0 ? "#00C897" : theme.muted;

  const progress =
    ((desiredWeightKg - range.min) / (range.max - range.min)) * 100;

  const decDisabled = desiredWeightKg <= range.min;
  const incDisabled = desiredWeightKg >= range.max;

  const cfg = GOAL_CONFIG[goal];

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep4(Number(desiredWeightKg.toFixed(1)));
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

  const accent = theme.accent;
  const s = getStyles(theme);

  return (
    <OnboardingShell
      theme={theme}
      visualMode={visualMode}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿Cuál es tu peso objetivo?"
      subtitle="Ajusta el valor a tu meta personal."
      onBack={onBack}
      onToggleMode={onToggleMode}
      footer={
        <NextButton
          enabled
          onPress={handleNext}
          loading={loading}
          label="Siguiente"
          theme={theme}
        />
      }
    >
      <View style={s.content}>
        <View style={[s.goalPill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={15} color={cfg.color} />
          <Text style={[s.goalPillText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.labelRow}>
              <Ionicons name="scale-outline" size={15} color={accent} />
              <Text style={s.label}>PESO OBJETIVO</Text>
            </View>
          </View>

          <View style={s.counterRow}>
            <Pressable
              onPressIn={decDisabled ? undefined : () => startHold(() => changeWeight(-1))}
              onPressOut={endHold}
              disabled={decDisabled}
              style={[s.adjBtn, decDisabled && { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}
            >
              <Ionicons name="remove" size={24} color={decDisabled ? theme.muted : accent} />
            </Pressable>

            <Pressable
              onPress={() => { setDraft(String(Math.round(desiredWeightKg * 2) / 2)); setEditing(true); }}
              style={s.valueWrap}
            >
              {editing ? (
                <TextInput
                  style={s.bigNumberInput}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => commitEdit(draft)}
                  onBlur={() => commitEdit(draft)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={6}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Animated.Text
                  style={[s.bigNumber, { transform: [{ scale: pulse }] }]}
                >
                  {Number.isInteger(desiredWeightKg) ? desiredWeightKg : desiredWeightKg.toFixed(1)}
                </Animated.Text>
              )}
              <Text style={s.unitLabel}>kg</Text>
            </Pressable>

            <Pressable
              onPressIn={incDisabled ? undefined : () => startHold(() => changeWeight(1))}
              onPressOut={endHold}
              disabled={incDisabled}
              style={[s.adjBtn, incDisabled && { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}
            >
              <Ionicons name="add" size={24} color={incDisabled ? theme.muted : accent} />
            </Pressable>
          </View>

          <RangeBar progress={progress} minLabel={`${range.min}`} maxLabel={`${range.max}`} accent={accent} theme={theme} />
        </View>

        <View style={s.diffCard}>
          <View style={s.diffRow}>
            <View style={s.diffItem}>
              <Text style={s.diffLabel}>Actual</Text>
              <Text style={s.diffValue}>{Math.round(currentWeightKg)} kg</Text>
            </View>

            <View style={s.diffArrowWrap}>
              <Ionicons name={cfg.arrowIcon} size={14} color={diffColor} />
            </View>

            <View style={s.diffItem}>
              <Text style={s.diffLabel}>Diferencia</Text>
              <Text style={[s.diffValue, { color: diffColor }]}>
                {diffLabel}
              </Text>
            </View>

            <View style={s.diffArrowWrap}>
              <Ionicons name="flag-outline" size={14} color={theme.muted} />
            </View>

            <View style={s.diffItem}>
              <Text style={s.diffLabel}>Objetivo</Text>
              <Text style={s.diffValue}>
                {Number.isInteger(desiredWeightKg) ? desiredWeightKg : desiredWeightKg.toFixed(1)} kg
              </Text>
            </View>
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}

function RangeBar({
  progress,
  minLabel,
  maxLabel,
  accent,
  theme,
}: {
  progress: number;
  minLabel: string;
  maxLabel: string;
  accent: string;
  theme: FitnessTheme;
}) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <View style={styles.rangeRow}>
      <Text style={[styles.rangeText, { color: theme.muted }]}>{minLabel}</Text>
      <View style={[styles.rangeLine, { backgroundColor: theme.cardMuted }]}>
        <View style={[styles.rangeFill, { width: `${clamped}%`, backgroundColor: accent }]} />
      </View>
      <Text style={[styles.rangeText, { color: theme.muted }]}>{maxLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rangeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    minWidth: 24,
    textAlign: "center",
  },
  rangeLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  rangeFill: {
    height: "100%",
    borderRadius: 999,
  },
});

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    content: {
      gap: 16,
    },
    goalPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    goalPillText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.stroke,
      paddingVertical: 28,
      paddingHorizontal: 24,
      gap: 28,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    label: {
      color: theme.muted,
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      letterSpacing: 0.9,
      textTransform: "uppercase",
    },
    counterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    adjBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(0,200,151,0.08)",
      borderWidth: 1,
      borderColor: "rgba(0,200,151,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    valueWrap: {
      alignItems: "center",
      gap: 2,
    },
    bigNumber: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 64,
      lineHeight: 72,
    },
    bigNumberInput: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 64,
      lineHeight: 72,
      textAlign: "center",
      padding: 0,
      minWidth: 100,
    },
    unitLabel: {
      color: theme.muted,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      letterSpacing: 0.5,
    },
    diffCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.stroke,
      paddingVertical: 20,
      paddingHorizontal: 18,
    },
    diffRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    diffItem: {
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    diffArrowWrap: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    diffLabel: {
      color: theme.muted,
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      letterSpacing: 0.3,
    },
    diffValue: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 20,
      lineHeight: 24,
    },
  });
}
