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
          <Ionicons name="arrow-back" size={30} color="#101115" />
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
    backgroundColor: "#F3F3F5",
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
    color: "#3A3B40",
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
    backgroundColor: "#E5E6EA",
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
  title: {
    color: "#111318",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: 12,
    color: "#27292D",
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
    color: "#9FA2A9",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
