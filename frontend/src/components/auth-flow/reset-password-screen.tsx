import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";

type VisualMode = "dark" | "light";

interface ResetPasswordScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PASSWORD_RULES = [
  { test: (s: string) => s.length >= 8, label: "Mínimo 8 caracteres" },
  { test: (s: string) => /[A-Z]/.test(s), label: "Una mayúscula" },
  { test: (s: string) => /[a-z]/.test(s), label: "Una minúscula" },
  { test: (s: string) => /[0-9]/.test(s), label: "Un número" },
];

export function ResetPasswordScreen({
  theme,
  visualMode,
  token,
  onSuccess,
  onCancel,
}: ResetPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dark = theme.background === "#050505";
  const allValid = useMemo(
    () => PASSWORD_RULES.every((r) => r.test(password)),
    [password],
  );
  const matches = password === confirm && password.length > 0;
  const canSubmit = allValid && matches && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      setLoading(true);
      await biomaApi.resetPassword(token, password);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo restablecer la contraseña.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={onCancel} style={styles.iconButton} accessibilityLabel="Cancelar">
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.badge,
            {
              backgroundColor: dark
                ? "rgba(0,200,151,0.16)"
                : "rgba(0,200,151,0.12)",
            },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={18} color={theme.accent} />
          <Text style={[styles.badgeText, { color: theme.accent }]}>
            Nueva contraseña
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Define tu nueva contraseña
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Elige algo seguro y que puedas recordar. La necesitarás para entrar a Bioma.
        </Text>

        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: theme.muted }]}>
            Nueva contraseña
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderBottomColor: theme.stroke }]}
            placeholder="********"
            placeholderTextColor={theme.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: theme.muted }]}>
            Confirmar contraseña
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderBottomColor: theme.stroke }]}
            placeholder="********"
            placeholderTextColor={theme.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            textContentType="newPassword"
            value={confirm}
            onChangeText={setConfirm}
            editable={!loading}
          />
        </View>

        <View style={styles.rules}>
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <View key={rule.label} style={styles.ruleRow}>
                <Ionicons
                  name={ok ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={ok ? theme.accent : theme.muted}
                />
                <Text
                  style={[
                    styles.ruleText,
                    { color: ok ? theme.text : theme.muted },
                  ]}
                >
                  {rule.label}
                </Text>
              </View>
            );
          })}
          {confirm.length > 0 ? (
            <View style={styles.ruleRow}>
              <Ionicons
                name={matches ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={matches ? theme.accent : theme.muted}
              />
              <Text
                style={[
                  styles.ruleText,
                  { color: matches ? theme.text : theme.muted },
                ]}
              >
                Las contraseñas coinciden
              </Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: dark ? "#3A1212" : "#FDECEC",
                borderColor: theme.danger,
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.primaryButton,
            {
              backgroundColor: canSubmit ? theme.accent : theme.cardMuted,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                { color: canSubmit ? "#FFFFFF" : theme.muted },
              ]}
            >
              Guardar contraseña
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 18,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  input: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  rules: {
    gap: 6,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ruleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
