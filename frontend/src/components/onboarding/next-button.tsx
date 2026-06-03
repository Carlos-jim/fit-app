import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import type { FitnessTheme } from "../fitness-ui";

interface NextButtonProps {
  label?: string;
  enabled: boolean;
  onPress: () => void;
  loading?: boolean;
  theme: FitnessTheme;
}

export function NextButton({
  label = "Siguiente",
  enabled,
  onPress,
  loading,
  theme,
}: NextButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const isActive = enabled && !loading;

  return (
    <Pressable
      onPress={isActive ? onPress : undefined}
      onPressIn={isActive ? handlePressIn : undefined}
      onPressOut={isActive ? handlePressOut : undefined}
      disabled={!isActive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isActive }}
    >
      <Animated.View
        style={[
          styles.button,
          isActive
            ? { backgroundColor: theme.accent }
            : { backgroundColor: theme.cardMuted, borderColor: theme.stroke },
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isActive ? theme.background : theme.muted} />
        ) : (
          <Text
            style={[
              styles.text,
              { color: isActive ? theme.background : theme.muted },
            ]}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 62,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
