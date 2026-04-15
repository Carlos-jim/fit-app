import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { FitnessTheme } from "../fitness-ui";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

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
  icon?: IoniconName;
  iconColor?: string;
  iconBg?: string;
}

export function OnboardingOptionCard<T extends string>({
  option,
  subtitle,
  selected,
  onPress,
  icon,
  iconColor = "#00C897",
  iconBg = "rgba(0,200,151,0.12)",
}: OnboardingOptionCardProps<T>) {
  return (
    <Pressable
      onPress={() => onPress(option.value)}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
    >
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.textBlock}>
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {option.label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#111219",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 72,
  },
  cardSelected: {
    backgroundColor: "rgba(0,200,151,0.07)",
    borderColor: "rgba(0,200,151,0.45)",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  label: {
    color: "#8E92A8",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  labelSelected: {
    color: "#FFFFFF",
  },
  subtitle: {
    color: "#474B64",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: "#00C897",
    backgroundColor: "rgba(0,200,151,0.1)",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00C897",
  },
});
