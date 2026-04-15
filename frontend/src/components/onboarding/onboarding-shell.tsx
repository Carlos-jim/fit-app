import React, { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";

interface OnboardingShellProps {
  theme: FitnessTheme;
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
  footer: ReactNode;
  note?: string;
  keyboardAware?: boolean;
}

export function OnboardingShell({
  theme: _theme,
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  children,
  footer,
  note = "* Tu información se elimina tras generar el plan.",
  keyboardAware = false,
}: OnboardingShellProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(20);
    const target = step / Math.max(totalSteps, 1);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: target,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [step, totalSteps]);

  const stepStr = `${String(step).padStart(2, "0")} / ${String(totalSteps).padStart(2, "0")}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={16}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.stepCounter}>{stepStr}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.titleBlock, { opacity, transform: [{ translateY }] }]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>

        <View style={styles.content}>{children}</View>

        <View style={styles.footer}>
          <Text style={styles.note}>{note}</Text>
          {footer}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141520",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  stepCounter: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.4,
    color: "#3E4159",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#181922",
    borderRadius: 999,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00C897",
    borderRadius: 999,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
  },
  titleBlock: {
    marginBottom: 32,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 8,
    color: "#767894",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    gap: 10,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 28,
    gap: 14,
  },
  note: {
    color: "#2C2E45",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
