import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  theme: FitnessTheme;
}

export function ProgressBar({ currentStep, totalSteps, theme }: ProgressBarProps) {
  const progress = Math.min(Math.max(currentStep / totalSteps, 0), 1);
  const widthAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, { width: widthInterpolated, backgroundColor: theme.accent }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#1C1E2A",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
});
