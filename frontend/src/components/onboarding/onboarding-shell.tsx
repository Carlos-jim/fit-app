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
  note = "* Su informacion se eliminara despues de generar un plan.",
  keyboardAware = false,
}: OnboardingShellProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const progressPercent = Math.round((step / Math.max(totalSteps, 1)) * 100);

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, step, translateY]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Decorative glow orbs */}
      <View style={styles.glowTopRight} pointerEvents="none" />
      <View style={styles.glowBottomLeft} pointerEvents="none" />

      {/* Progress badge */}
      <View style={styles.topBadge}>
        <View style={styles.topBadgeDot} />
        <Text style={styles.topBadgeText}>{progressPercent}</Text>
      </View>

      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
          style={[
            styles.body,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>
              {step} / {totalSteps}
            </Text>
          </View>
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
    backgroundColor: "#0D0F16",
  },
  glowTopRight: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0,200,151,0.07)",
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: 160,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(232,255,84,0.04)",
  },
  topBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  topBadgeDot: {
    width: 6,
    height: 18,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    backgroundColor: "#FFC612",
  },
  topBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    lineHeight: 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1C26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  progressWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
  },
  body: {
    flexGrow: 1,
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "#1A1C26",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  stepPillText: {
    color: "#555870",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: 10,
    color: "#7A7D8E",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  content: {
    marginTop: 24,
    gap: 18,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 26,
    gap: 16,
  },
  note: {
    color: "#353748",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
