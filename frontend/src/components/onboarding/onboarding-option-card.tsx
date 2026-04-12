import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
        {
          backgroundColor: theme.cardMuted,
          borderColor: selected ? theme.accent : "transparent",
        },
      ]}
    >
      <Text style={[styles.label, { color: theme.text }]}>{option.label}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {subtitle}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 2,
    gap: 4,
  },
  label: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
});
