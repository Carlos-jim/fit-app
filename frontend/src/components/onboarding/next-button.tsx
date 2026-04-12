import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      style={[
        styles.button,
        {
          backgroundColor: enabled ? theme.accent : theme.cardMuted,
        },
      ]}
      disabled={!enabled}
    >
      {loading ? (
        <Text
          style={[styles.text, { color: enabled ? "#000000" : theme.muted }]}
        >
          ...
        </Text>
      ) : (
        <Text
          style={[styles.text, { color: enabled ? "#000000" : theme.muted }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "700",
  },
});
