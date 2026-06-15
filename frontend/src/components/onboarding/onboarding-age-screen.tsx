import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 6;

const MIN_AGE = 13;
const MAX_AGE = 100;

type VisualMode = "dark" | "light";

interface OnboardingAgeProps {
  userId: string;
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  onNext: () => void;
  onToggleMode: () => void;
}

export function OnboardingAgeScreen({
  userId,
  theme,
  visualMode,
  onBack,
  onNext,
  onToggleMode,
}: OnboardingAgeProps) {
  const [age, setAge] = useState(21);
  const [loading, setLoading] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 70, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [pulse]);

  const changeAge = useCallback(
    (delta: number) => {
      setAge((prev) => {
        const next = prev + delta;
        if (next < MIN_AGE || next > MAX_AGE) return prev;
        triggerPulse();
        return next;
      });
    },
    [triggerPulse],
  );

  const startHold = (delta: number) => {
    changeAge(delta);
    timeoutTimer.current = setTimeout(() => {
      holdTimer.current = setInterval(() => changeAge(delta), 100);
    }, 400);
  };

  const endHold = () => {
    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current);
      timeoutTimer.current = null;
    }
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep6(age);
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

  const isMinor = age < 18;
  const s = getStyles(theme);

  return (
    <OnboardingShell
      theme={theme}
      visualMode={visualMode}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿Cuántos años tienes?"
      subtitle="Lo usamos para definir objetivos y recomendaciones seguras."
      onBack={onBack}
      onToggleMode={onToggleMode}
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
      <View style={s.card}>
        <View style={s.counterRow}>
          {/* Decrement */}
          <Pressable
            style={[s.adjBtn, age <= MIN_AGE && { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}
            onPressIn={() => startHold(-1)}
            onPressOut={endHold}
            accessibilityLabel="Restar un año"
          >
            <Ionicons
              name="remove"
              size={26}
              color={age <= MIN_AGE ? theme.muted : theme.accent}
            />
          </Pressable>

          {/* Display */}
          <View style={s.ageDisplay}>
            <Animated.Text
              style={[s.ageNumber, { transform: [{ scale: pulse }] }]}
            >
              {age}
            </Animated.Text>
            <Text style={s.ageUnit}>años</Text>
          </View>

          {/* Increment */}
          <Pressable
            style={[s.adjBtn, age >= MAX_AGE && { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}
            onPressIn={() => startHold(1)}
            onPressOut={endHold}
            accessibilityLabel="Sumar un año"
          >
            <Ionicons
              name="add"
              size={26}
              color={age >= MAX_AGE ? theme.muted : theme.accent}
            />
          </Pressable>
        </View>

        {/* Range hint */}
        <View style={s.rangeRow}>
          <Text style={[s.rangeText, { color: theme.muted }]}>{MIN_AGE}</Text>
          <View style={[s.rangeLine, { backgroundColor: theme.cardMuted }]}>
            <View
              style={[
                s.rangeFill,
                {
                  width: `${((age - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
          <Text style={[s.rangeText, { color: theme.muted }]}>{MAX_AGE}</Text>
        </View>
      </View>

      {isMinor ? (
        <View style={[s.minorCard, { backgroundColor: "rgba(245,183,0,0.07)", borderColor: "rgba(245,183,0,0.2)" }]}>
          <Ionicons name="information-circle-outline" size={16} color="#F5B700" />
          <Text style={s.minorText}>
            Si eres menor de edad, consulta con un profesional de salud antes de seguir un plan nutricional.
          </Text>
        </View>
      ) : null}
    </OnboardingShell>
  );
}

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.stroke,
      paddingVertical: 36,
      paddingHorizontal: 24,
      gap: 32,
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
    ageDisplay: {
      alignItems: "center",
      gap: 2,
    },
    ageNumber: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 72,
      lineHeight: 80,
    },
    ageUnit: {
      color: theme.muted,
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
    minorCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    minorText: {
      flex: 1,
      color: "#A08030",
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
