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
    return Math.min(currentStep / totalSteps, 1);
  }, [currentStep, totalSteps]);

  return (
    <View style={[styles.container, { backgroundColor: theme.stroke }]}>
      <View
        style={[
          styles.fill,
          { width: `${progress * 100}%`, backgroundColor: theme.accent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 4,
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});
