import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";

interface OnboardingOption<T extends string> {
  value: T;
  label: string;
}

interface OnboardingOptionCardProps<T extends string> {
  option: OnboardingOption<T>;
  subtitle?: string;
  selected: boolean;
  onPress: (value: T) => void;
  theme: FitnessTheme;
}

export function OnboardingOptionCard<T extends string>({
  option,
  subtitle,
  selected,
  onPress,
  theme,
}: OnboardingOptionCardProps<T>) {
  return (
    <Pressable
      onPress={() => onPress(option.value)}
      style={[
        styles.card,
        selected && {
          backgroundColor: `${theme.accent}12`,
          borderColor: `${theme.accent}80`,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
    >
      <View style={styles.content}>
        <Text style={[styles.label, selected && { color: "#FFFFFF" }]}>
          {option.label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.indicator,
          selected && {
            backgroundColor: theme.accent,
            borderColor: theme.accent,
          },
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={14} color="#0D0F16" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    minHeight: 74,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: "#13151E",
    borderColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: "#A0A3B1",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  subtitle: {
    color: "#484B5E",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});
