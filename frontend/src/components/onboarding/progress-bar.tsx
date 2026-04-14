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
  theme,
}: ProgressBarProps) {
  const progress = useMemo(() => {
    return Math.min(Math.max(currentStep / totalSteps, 0), 1);
  }, [currentStep, totalSteps]);

  return (
    <View style={styles.container}>
      <View style={styles.track} />
      <View
        style={[
          styles.fill,
          {
            width: `${progress * 100}%`,
            backgroundColor: theme.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 5,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1E2030",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
});
