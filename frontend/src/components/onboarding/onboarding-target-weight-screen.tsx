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
    diff < 0 ? "#4B9FFF" : diff > 0 ? "#00C897" : "#4B4E65";

  const progress =
    ((desiredWeightKg - range.min) / (range.max - range.min)) * 100;

  const decDisabled = desiredWeightKg <= range.min;
  const incDisabled = desiredWeightKg >= range.max;

  const cfg = GOAL_CONFIG[goal];

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep4(userId, Number(desiredWeightKg.toFixed(1)));
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

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿Cuál es tu peso objetivo?"
      subtitle="Ajusta el valor a tu meta personal."
      onBack={onBack}
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
      <View style={styles.content}>
        <View style={[styles.goalPill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={15} color={cfg.color} />
          <Text style={[styles.goalPillText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <Ionicons name="scale-outline" size={15} color={accent} />
              <Text style={styles.label}>PESO OBJETIVO</Text>
            </View>
          </View>

          <View style={styles.counterRow}>
            <Pressable
              onPressIn={decDisabled ? undefined : () => startHold(() => changeWeight(-1))}
              onPressOut={endHold}
              disabled={decDisabled}
              style={[styles.adjBtn, decDisabled && styles.adjBtnDisabled]}
            >
              <Ionicons name="remove" size={24} color={decDisabled ? "#2E3148" : accent} />
            </Pressable>

            <Pressable
              onPress={() => { setDraft(String(Math.round(desiredWeightKg * 2) / 2)); setEditing(true); }}
              style={styles.valueWrap}
            >
              {editing ? (
                <TextInput
                  style={styles.bigNumberInput}
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
                  style={[styles.bigNumber, { transform: [{ scale: pulse }] }]}
                >
                  {Number.isInteger(desiredWeightKg) ? desiredWeightKg : desiredWeightKg.toFixed(1)}
                </Animated.Text>
              )}
              <Text style={styles.unitLabel}>kg</Text>
            </Pressable>

            <Pressable
              onPressIn={incDisabled ? undefined : () => startHold(() => changeWeight(1))}
              onPressOut={endHold}
              disabled={incDisabled}
              style={[styles.adjBtn, incDisabled && styles.adjBtnDisabled]}
            >
              <Ionicons name="add" size={24} color={incDisabled ? "#2E3148" : accent} />
            </Pressable>
          </View>

          <RangeBar progress={progress} minLabel={`${range.min}`} maxLabel={`${range.max}`} accent={accent} />
        </View>

        <View style={styles.diffCard}>
          <View style={styles.diffRow}>
            <View style={styles.diffItem}>
              <Text style={styles.diffLabel}>Actual</Text>
              <Text style={styles.diffValue}>{Math.round(currentWeightKg)} kg</Text>
            </View>

            <View style={styles.diffArrowWrap}>
              <Ionicons name={cfg.arrowIcon} size={14} color={diffColor} />
            </View>

            <View style={styles.diffItem}>
              <Text style={styles.diffLabel}>Diferencia</Text>
              <Text style={[styles.diffValue, { color: diffColor }]}>
                {diffLabel}
              </Text>
            </View>

            <View style={styles.diffArrowWrap}>
              <Ionicons name="flag-outline" size={14} color="#4B4E65" />
            </View>

            <View style={styles.diffItem}>
              <Text style={styles.diffLabel}>Objetivo</Text>
              <Text style={styles.diffValue}>
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
}: {
  progress: number;
  minLabel: string;
  maxLabel: string;
  accent: string;
}) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <View style={styles.rangeRow}>
      <Text style={styles.rangeText}>{minLabel}</Text>
      <View style={styles.rangeLine}>
        <View style={[styles.rangeFill, { width: `${clamped}%`, backgroundColor: accent }]} />
      </View>
      <Text style={styles.rangeText}>{maxLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#111219",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    color: "#484B5E",
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
  adjBtnDisabled: {
    backgroundColor: "#0F1018",
    borderColor: "rgba(255,255,255,0.04)",
  },
  valueWrap: {
    alignItems: "center",
    gap: 2,
  },
  bigNumber: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 64,
    lineHeight: 72,
  },
  bigNumberInput: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 64,
    lineHeight: 72,
    textAlign: "center",
    padding: 0,
    minWidth: 100,
  },
  unitLabel: {
    color: "#4B4E65",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rangeText: {
    color: "#3A3D58",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    minWidth: 24,
    textAlign: "center",
  },
  rangeLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#1E2030",
    borderRadius: 999,
    overflow: "hidden",
  },
  rangeFill: {
    height: "100%",
    borderRadius: 999,
  },
  diffCard: {
    backgroundColor: "#111219",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    color: "#3E4259",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  diffValue: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 20,
    lineHeight: 24,
  },
});