import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, ProgressBar } from "../onboarding";

const TOTAL_STEPS = 6;
const STEP = 6;
const MIN_AGE = 13;
const MAX_AGE = 100;
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

interface OnboardingAgeProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingAgeScreen({
  userId,
  theme,
  onBack,
  onNext,
}: OnboardingAgeProps) {
  const [age, setAge] = useState(21);
  const [loading, setLoading] = useState(false);
  const scrollOffset = useRef(0);

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep6(userId, age);
      onNext();
    } catch (err) {
      console.error("Error saving age:", err);
    } finally {
      setLoading(false);
    }
  };

  const ages = useMemo(() => {
    const result: number[] = [];
    for (let i = MIN_AGE; i <= MAX_AGE; i++) result.push(i);
    return result;
  }, []);

  const handleScroll = useCallback((_event: any) => {
    // We'll use pan responder for the wheel effect
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gestureState) => {
          const delta = -gestureState.dy / ITEM_HEIGHT;
          const newAge = Math.round(age + delta);
          setAge(Math.max(MIN_AGE, Math.min(MAX_AGE, newAge)));
        },
        onPanResponderRelease: () => {},
      }),
    [age],
  );

  const renderItems = () => {
    const items: React.ReactNode[] = [];
    const startIdx = Math.max(0, age - 3 - MIN_AGE);
    const endIdx = Math.min(ages.length, age + 3 - MIN_AGE + 1);

    for (let i = startIdx; i < endIdx; i++) {
      const itemAge = ages[i];
      const isActive = itemAge === age;
      items.push(
        <View key={itemAge} style={styles.ageItem}>
          <Text
            style={[
              styles.ageText,
              { color: isActive ? theme.text : `${theme.muted}80` },
              isActive && styles.ageTextActive,
            ]}
          >
            {itemAge}
          </Text>
        </View>,
      );
    }
    return items;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.progressWrapper}>
          <ProgressBar
            currentStep={STEP}
            totalSteps={TOTAL_STEPS}
            theme={theme}
          />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          ¿Cuántos años tiene?
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Este dato se utilizará para calibrar su plan personalizado.
        </Text>

        <View style={styles.pickerContainer}>
          <View
            style={[
              styles.pickerHighlight,
              { backgroundColor: theme.cardMuted },
            ]}
          />
          <View
            style={[styles.pickerIndicator, { backgroundColor: theme.accent }]}
          />
          <View style={styles.pickerContent} {...panResponder.panHandlers}>
            {renderItems()}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            * Su información se eliminará después de generar un plan.
          </Text>
          <NextButton
            label="Siguiente"
            enabled
            onPress={handleNext}
            loading={loading}
            theme={theme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrapper: { flex: 1 },
  placeholder: { width: 44 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    lineHeight: 24,
  },
  pickerContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: "relative",
    marginBottom: 40,
  },
  pickerHighlight: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 12,
  },
  pickerIndicator: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    zIndex: 2,
  },
  pickerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ageItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  ageText: {
    fontSize: 22,
    fontWeight: "500",
  },
  ageTextActive: {
    fontSize: 32,
    fontWeight: "800",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
    gap: 20,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
  },
});
