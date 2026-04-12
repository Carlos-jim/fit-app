import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  theme: FitnessTheme;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  theme: _theme,
}: ProgressBarProps) {
  const progress = useMemo(() => {
    return Math.min(Math.max(currentStep / totalSteps, 0), 1);
  }, [currentStep, totalSteps]);

  return (
    <View style={styles.container}>
      <View style={[styles.track]} />
      <View style={[styles.fill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 7,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#C2C4C9",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#101115",
    borderRadius: 999,
  },
});
