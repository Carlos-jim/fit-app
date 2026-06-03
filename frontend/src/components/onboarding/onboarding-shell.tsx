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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FitnessTheme } from "../fitness-ui";

type VisualMode = "dark" | "light";

interface OnboardingShellProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  onBack: () => void;
  onToggleMode: () => void;
  children: ReactNode;
  footer: ReactNode;
  keyboardAware?: boolean;
}

export function OnboardingShell({
  theme,
  visualMode,
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onToggleMode,
  children,
  footer,
  keyboardAware = false,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets();
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
  const isDark = theme.background === "#050505";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable
          onPress={onBack}
          style={[
            styles.backButton,
            {
              backgroundColor: isDark ? "#141520" : theme.cardMuted,
              borderColor: isDark ? "rgba(255,255,255,0.07)" : theme.stroke,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={16}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>

        <View style={styles.headerRight}>
          <Text style={[styles.stepCounter, { color: theme.muted }]}>
            {stepStr}
          </Text>
          <Pressable
            onPress={onToggleMode}
            style={[
              styles.themeToggle,
              {
                backgroundColor: isDark ? "#141520" : theme.cardMuted,
                borderColor: isDark ? "rgba(255,255,255,0.07)" : theme.stroke,
              },
            ]}
            accessibilityLabel="Cambiar tema"
            hitSlop={16}
          >
            <Ionicons
              name={visualMode === "dark" ? "moon-outline" : "sunny-outline"}
              size={18}
              color={theme.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: isDark ? "#181922" : theme.cardMuted },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
              backgroundColor: theme.accent,
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
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {subtitle}
          </Text>
        </Animated.View>

        <View style={styles.content}>{children}</View>

        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderWidth: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepCounter: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.4,
  },
  themeToggle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
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
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 8,
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
});
