import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  const isActive = enabled && !loading;

  if (isActive) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <LinearGradient
          colors={[theme.accent, "#009E7A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0D0F16" />
          ) : (
            <Text style={[styles.text, { color: "#0D0F16" }]}>{label}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.button, styles.buttonDisabled]} disabled>
      {loading ? (
        <ActivityIndicator size="small" color="#555870" />
      ) : (
        <Text style={[styles.text, styles.textDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 60,
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  gradient: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#1A1C26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  textDisabled: {
    color: "#3A3D4E",
  },
});
