import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
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
  theme: _theme,
}: NextButtonProps) {
  const isActive = enabled && !loading;

  return (
    <Pressable
      onPress={isActive ? onPress : undefined}
      style={[
        styles.button,
        {
          backgroundColor: isActive ? "#101115" : "#B3B5BA",
        },
      ]}
      disabled={!isActive}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 60,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: "#FFFFFF",
  },
});
