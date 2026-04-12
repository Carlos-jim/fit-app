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
  theme: _theme,
}: OnboardingOptionCardProps<T>) {
  return (
    <Pressable
      onPress={() => onPress(option.value)}
      style={[
        styles.card,
        {
          backgroundColor: selected ? "#D0D2D8" : "#E3E4E8",
          borderColor: selected ? "#101115" : "transparent",
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{option.label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    minHeight: 74,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  content: {
    gap: 4,
  },
  label: {
    color: "#111318",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  subtitle: {
    color: "#6E727B",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
});
