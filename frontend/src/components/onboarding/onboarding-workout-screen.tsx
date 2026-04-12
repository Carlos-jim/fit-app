import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import {
  biomaApi,
  type GoalType,
  type WorkoutFrequency,
} from "../../services/bioma-api";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 2;

interface OnboardingWorkoutProps {
  userId: string;
  goal: GoalType;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingWorkoutScreen({
  userId,
  goal,
  theme,
  onBack,
  onNext,
}: OnboardingWorkoutProps) {
  const [rateKgWeek, setRateKgWeek] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  const MIN = 0.1;
  const MAX = 1.5;
  const STEP_SIZE = 0.1;
  const ratio = (rateKgWeek - MIN) / (MAX - MIN);

  const category = useMemo<WorkoutFrequency>(() => {
    if (rateKgWeek < 0.6) return "LOW";
    if (rateKgWeek < 1.1) return "MEDIUM";
    return "HIGH";
  }, [rateKgWeek]);

  const descriptor = useMemo(() => {
    if (goal === "LOSE_WEIGHT") return "Perder peso velocidad por semana";
    if (goal === "GAIN_WEIGHT") return "Ganar peso velocidad por semana";
    return "Cambiar peso velocidad por semana";
  }, [goal]);

  const setRateFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const bounded = Math.max(0, Math.min(trackWidth, x));
    const localRatio = bounded / trackWidth;
    const raw = MIN + localRatio * (MAX - MIN);
    const snapped = Number((Math.round(raw / STEP_SIZE) * STEP_SIZE).toFixed(1));
    setRateKgWeek(snapped);
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.04,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          setRateFromX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          setRateFromX(event.nativeEvent.locationX);
        },
      }),
    [trackWidth],
  );

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep2(userId, category);
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
      title="¿En cuánto tiempo desea alcanzar su objetivo?"
      subtitle="Esto se utilizará para calibrar su plan personalizado."
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
      <View style={styles.contentBlock}>
        <Text style={styles.descriptor}>{descriptor}</Text>
        <Animated.Text
          style={[styles.value, { transform: [{ scale: pulse }] }]}
        >
          {rateKgWeek.toFixed(1)}kg
        </Animated.Text>

        <Pressable
          onPress={(event) => setRateFromX(event.nativeEvent.locationX)}
          onLayout={handleTrackLayout}
          style={styles.track}
          {...panResponder.panHandlers}
        >
          <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
          <View style={[styles.thumb, { left: `${ratio * 100}%` }]} />
        </Pressable>

        <View style={styles.scaleRow}>
          <Text style={styles.scaleText}>0.1kg</Text>
          <Text style={styles.scaleText}>0.8kg</Text>
          <Text style={styles.scaleText}>1.5kg</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  contentBlock: {
    marginTop: 280,
    gap: 14,
  },
  descriptor: {
    textAlign: "center",
    color: "#222429",
    fontFamily: "Inter_500Medium",
    fontSize: 22,
  },
  value: {
    color: "#111318",
    textAlign: "center",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 48,
    lineHeight: 54,
  },
  track: {
    marginTop: 18,
    height: 10,
    backgroundColor: "#C2C4CA",
    borderRadius: 999,
    position: "relative",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#101115",
    borderRadius: 999,
  },
  thumb: {
    position: "absolute",
    top: -10,
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    borderWidth: 1,
    borderColor: "#D4D7DD",
  },
  scaleRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleText: {
    color: "#222429",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
