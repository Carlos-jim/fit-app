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
  const [rateKgWeek, setRateKgWeek] = useState(0.5);
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
    if (goal === "LOSE_WEIGHT") return "Velocidad de perdida por semana";
    if (goal === "GAIN_WEIGHT") return "Velocidad de ganancia por semana";
    return "Velocidad de cambio por semana";
  }, [goal]);

  const speedLabel = useMemo(() => {
    if (rateKgWeek < 0.4) return "Muy suave";
    if (rateKgWeek < 0.7) return "Suave";
    if (rateKgWeek < 1.0) return "Moderado";
    if (rateKgWeek < 1.3) return "Intenso";
    return "Muy intenso";
  }, [rateKgWeek]);

  const setRateFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const bounded = Math.max(0, Math.min(trackWidth, x));
    const localRatio = bounded / trackWidth;
    const raw = MIN + localRatio * (MAX - MIN);
    const snapped = Number((Math.round(raw / STEP_SIZE) * STEP_SIZE).toFixed(1));
    setRateKgWeek(snapped);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 80, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 110, useNativeDriver: true }),
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

  const accent = theme.accent;
  const thumbLeft = trackWidth > 0 ? ratio * trackWidth - 15 : 0;

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿En cuánto tiempo?"
      subtitle="Elige la velocidad a la que quieres alcanzar tu objetivo."
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
      <View style={styles.card}>
        <Text style={styles.descriptor}>{descriptor}</Text>

        <Animated.Text
          style={[styles.value, { color: accent, transform: [{ scale: pulse }] }]}
        >
          {rateKgWeek.toFixed(1)}
          <Text style={styles.valueUnit}> kg/sem</Text>
        </Animated.Text>

        <Text style={[styles.speedLabel, { color: accent }]}>{speedLabel}</Text>

        <Pressable
          onLayout={handleTrackLayout}
          style={styles.track}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.trackFill,
              { width: `${ratio * 100}%` as any, backgroundColor: accent },
            ]}
          />
          <View
            style={[styles.thumb, { left: thumbLeft, borderColor: accent }]}
          />
        </Pressable>

        <View style={styles.scaleRow}>
          <Text style={styles.scaleText}>0.1 kg</Text>
          <Text style={styles.scaleText}>0.8 kg</Text>
          <Text style={styles.scaleText}>1.5 kg</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111318",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 6,
  },
  descriptor: {
    textAlign: "center",
    color: "#484B5E",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  value: {
    textAlign: "center",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 52,
    lineHeight: 60,
  },
  valueUnit: {
    fontFamily: "Inter_500Medium",
    fontSize: 20,
  },
  speedLabel: {
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 16,
  },
  track: {
    marginTop: 8,
    height: 8,
    backgroundColor: "#1C1E2A",
    borderRadius: 999,
    position: "relative",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  thumb: {
    position: "absolute",
    top: -11,
    marginLeft: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  scaleRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleText: {
    color: "#2E3044",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
