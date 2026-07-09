import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { FitnessTheme } from "../fitness-ui";
import {
  biomaApi,
  type GoalType,
  type WorkoutFrequency,
} from "../../services/bioma-api";
import { handleError } from "../../utils/toast";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 2;
const RECOMMENDED: WorkoutFrequency = "MEDIUM";

type PaceOption = {
  value: WorkoutFrequency;
  label: string;
  subtitle: string;
  description: string;
  weeklyRange: string;
  icon: "walk-outline" | "bicycle-outline" | "flame-outline";
  colors: {
    start: string;
    end: string;
    soft: string;
    border: string;
    text: string;
  };
  level: number;
  effortLabel: string;
};

const OPTIONS: PaceOption[] = [
  {
    value: "LOW",
    label: "Ritmo suave",
    subtitle: "Cambios graduales y sostenibles",
    description:
      "Ideal si prefieres un camino tranquilo sin pasar hambre y con mínimo esfuerzo.",
    weeklyRange: "0.1 – 0.5 kg / semana",
    icon: "walk-outline",
    colors: {
      start: "#22D3EE",
      end: "#2DD4BF",
      soft: "rgba(45,212,191,0.10)",
      border: "rgba(45,212,191,0.35)",
      text: "#0D9488",
    },
    level: 1,
    effortLabel: "Bajo esfuerzo",
  },
  {
    value: "MEDIUM",
    label: "Ritmo moderado",
    subtitle: "Balance entre esfuerzo y resultado",
    description:
      "Lo más recomendado. Verás cambios reales sin sacrificar tu vida social.",
    weeklyRange: "0.5 – 1.0 kg / semana",
    icon: "bicycle-outline",
    colors: {
      start: "#FBBF24",
      end: "#F59E0B",
      soft: "rgba(251,191,36,0.12)",
      border: "rgba(251,191,36,0.40)",
      text: "#B45309",
    },
    level: 2,
    effortLabel: "Esfuerzo medio",
  },
  {
    value: "HIGH",
    label: "Ritmo intenso",
    subtitle: "Máximo avance en menos tiempo",
    description:
      "Para quienes quieren resultados rápidos y están dispuestos a todo.",
    weeklyRange: "1.0 – 1.5 kg / semana",
    icon: "flame-outline",
    colors: {
      start: "#FB7185",
      end: "#F43F5E",
      soft: "rgba(244,63,94,0.10)",
      border: "rgba(244,63,94,0.35)",
      text: "#BE123C",
    },
    level: 3,
    effortLabel: "Alto compromiso",
  },
];

type VisualMode = "dark" | "light";

interface OnboardingWorkoutProps {
  userId: string;
  goal: GoalType;
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  onNext: () => void;
  onToggleMode: () => void;
}

export function OnboardingWorkoutScreen({
  userId,
  goal: _goal,
  theme,
  visualMode,
  onBack,
  onNext,
  onToggleMode,
}: OnboardingWorkoutProps) {
  const [selected, setSelected] = useState<WorkoutFrequency | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await biomaApi.onboardingStep2(selected);
      onNext();
    } catch (err) {
      handleError(err, "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(theme);

  return (
    <OnboardingShell
      theme={theme}
      visualMode={visualMode}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿A qué ritmo quieres avanzar?"
      subtitle="Calibramos tu plan según la velocidad de cambio que prefieres."
      onBack={onBack}
      onToggleMode={onToggleMode}
      footer={
        <NextButton
          enabled={!!selected}
          onPress={handleNext}
          loading={loading}
          label="Siguiente"
          theme={theme}
        />
      }
    >
      <View style={s.list}>
        {OPTIONS.map((option) => (
          <PaceCard
            key={option.value}
            option={option}
            selected={selected === option.value}
            isRecommended={option.value === RECOMMENDED}
            theme={theme}
            onPress={() => setSelected(option.value)}
          />
        ))}
      </View>

      <View style={s.footerHint}>
        <Ionicons name="information-circle-outline" size={16} color={theme.muted} />
        <Text style={[s.footerHintText, { color: theme.muted }]}>
          Puedes cambiar el ritmo más adelante desde tu perfil.
        </Text>
      </View>
    </OnboardingShell>
  );
}

function PaceCard({
  option,
  selected,
  isRecommended,
  theme,
  onPress,
}: {
  option: PaceOption;
  selected: boolean;
  isRecommended: boolean;
  theme: FitnessTheme;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: selected ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [selected, expandAnim]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const s = getStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [s.cardContainer, pressed && s.cardPressed]}
    >
      <Animated.View
        style={[
          s.card,
          selected && {
            borderColor: option.colors.border,
            backgroundColor: option.colors.soft,
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Accent top bar */}
        <LinearGradient
          colors={
            selected
              ? [option.colors.start, option.colors.end]
              : [theme.stroke, theme.stroke]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.accentBar}
        />

        <View style={s.cardInner}>
          {/* Icon */}
          <View
            style={[
              s.iconCircle,
              {
                backgroundColor: selected
                  ? option.colors.soft
                  : theme.cardMuted,
              },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={24}
              color={selected ? option.colors.text : theme.muted}
            />
          </View>

          {/* Text content */}
          <View style={s.textBlock}>
            <View style={s.titleRow}>
              <Text
                style={[
                  s.cardLabel,
                  { color: selected ? theme.text : theme.muted },
                ]}
              >
                {option.label}
              </Text>
              {isRecommended && (
                <View
                  style={[
                    s.recBadge,
                    { backgroundColor: option.colors.soft },
                  ]}
                >
                  <Text
                    style={[
                      s.recBadgeText,
                      { color: option.colors.text },
                    ]}
                  >
                    Recomendado
                  </Text>
                </View>
              )}
            </View>

            <Text style={[s.cardSubtitle, { color: theme.muted }]}>
              {option.subtitle}
            </Text>

            {/* Expanded details */}
            <Animated.View
              style={[
                s.details,
                {
                  maxHeight: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 120],
                  }),
                  opacity: expandAnim,
                },
              ]}
            >
              <Text style={[s.cardDescription, { color: theme.muted }]}>
                {option.description}
              </Text>

              <View style={s.metricsRow}>
                <View
                  style={[
                    s.metricPill,
                    { backgroundColor: option.colors.soft },
                  ]}
                >
                  <Ionicons
                    name="trending-down-outline"
                    size={13}
                    color={option.colors.text}
                  />
                  <Text
                    style={[
                      s.metricPillText,
                      { color: option.colors.text },
                    ]}
                  >
                    {option.weeklyRange}
                  </Text>
                </View>

                <View
                  style={[
                    s.metricPill,
                    { backgroundColor: theme.cardMuted },
                  ]}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={13}
                    color={theme.muted}
                  />
                  <Text style={[s.metricPillText, { color: theme.muted }]}>
                    {option.effortLabel}
                  </Text>
                </View>
              </View>

              {/* Pace dots */}
              <View style={s.dotsRow}>
                {[1, 2, 3].map((dot) => (
                  <View
                    key={dot}
                    style={[
                      s.paceDot,
                      dot <= option.level && {
                        backgroundColor: option.colors.end,
                      },
                      dot > option.level && {
                        backgroundColor: theme.stroke,
                      },
                    ]}
                  />
                ))}
              </View>
            </Animated.View>
          </View>

          {/* Selection indicator */}
          <View
            style={[
              s.checkCircle,
              {
                borderColor: selected
                  ? option.colors.end
                  : theme.stroke,
                backgroundColor: selected
                  ? option.colors.end
                  : "transparent",
              },
            ]}
          >
            {selected && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    list: {
      gap: 14,
    },
    cardContainer: {
      borderRadius: 24,
    },
    cardPressed: {
      opacity: 0.95,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.stroke,
      overflow: "hidden",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.background === "#050505" ? 0.15 : 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    accentBar: {
      height: 4,
      width: "100%",
    },
    cardInner: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 20,
      paddingHorizontal: 18,
      gap: 14,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    textBlock: {
      flex: 1,
      gap: 4,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    cardLabel: {
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 17,
      lineHeight: 24,
    },
    recBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: "flex-start",
    },
    recBadgeText: {
      fontFamily: "Inter_700Bold",
      fontSize: 10,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    cardSubtitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      lineHeight: 19,
    },
    details: {
      overflow: "hidden",
      gap: 10,
      marginTop: 6,
    },
    cardDescription: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 19,
    },
    metricsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    metricPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    metricPillText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      letterSpacing: 0.2,
    },
    dotsRow: {
      flexDirection: "row",
      gap: 5,
      marginTop: 4,
    },
    paceDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    checkCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 2,
    },
    footerHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 20,
      paddingHorizontal: 16,
    },
    footerHintText: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
    },
  });
}
