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
import { ProgressBar } from "./progress-bar";

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
  note = "* Tu información se eliminará después de generar tu plan.",
  keyboardAware = false,
}: OnboardingShellProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(32)).current;
  const prevStepRef = useRef(step);

  useEffect(() => {
    const dir = step >= prevStepRef.current ? 1 : -1;
    prevStepRef.current = step;
    opacity.setValue(0);
    translateX.setValue(dir * 32);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, step, translateX]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={16}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.progressWrap}>
          <ProgressBar currentStep={step} totalSteps={totalSteps} theme={_theme} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.page, { opacity, transform: [{ translateX }] }]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.content}>{children}</View>
        </Animated.View>

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
    backgroundColor: "#0A0A0F",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  page: {
    flexGrow: 1,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 10,
    marginTop: 4,
  },
  subtitle: {
    color: "#5C5F73",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    marginTop: 28,
    gap: 10,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 24,
    gap: 10,
  },
  note: {
    color: "#252738",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
