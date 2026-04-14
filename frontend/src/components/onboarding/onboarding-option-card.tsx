import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
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
  const scale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(borderOpacity, {
      toValue: selected ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [borderOpacity, selected]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress(option.value);
  };

  const accent = theme.accent;

  const bgColor = borderOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ["#111318", `${accent}12`],
  });

  const borderColor = borderOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.07)", accent],
  });

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            borderColor,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.label, selected && { color: "#FFFFFF" }]}>
            {option.label}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View
          style={[
            styles.dot,
            selected && { backgroundColor: accent, borderColor: accent },
          ]}
        >
          {selected ? <View style={styles.dotInner} /> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    minHeight: 72,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: "#6B6E82",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  subtitle: {
    color: "#3A3D52",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0A0A0F",
  },
});
