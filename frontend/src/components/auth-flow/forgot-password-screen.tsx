import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

interface ForgotPasswordScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  initialEmail?: string;
}

export function ForgotPasswordScreen({
  theme,
  visualMode,
  onBack,
  initialEmail = "",
}: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const dark = theme.background === "#050505";
  const isValidEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );

  const handleSubmit = async () => {
    if (!isValidEmail) {
      Alert.alert("Correo inválido", "Ingresa un correo válido.");
      return;
    }
    try {
      setLoading(true);
      await biomaApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      Alert.alert(
        "No se pudo enviar",
        err instanceof Error ? err.message : "Intenta de nuevo en unos minutos.",
      );
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
        <Pressable onPress={onBack} style={styles.iconButton} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={20} color={theme.text} />
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
          <Ionicons name="key-outline" size={18} color={theme.accent} />
          <Text style={[styles.badgeText, { color: theme.accent }]}>
            Recuperar acceso
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Restablece tu contraseña
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Te enviaremos un enlace seguro a tu correo para definir una nueva contraseña.
          El enlace caduca en 1 hora.
        </Text>

        {sent ? (
          <View
            style={[
              styles.successBox,
              {
                backgroundColor: dark ? "#0F221D" : "#EAF8F2",
                borderColor: theme.accent,
              },
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={theme.accent} />
            <Text style={[styles.successText, { color: theme.text }]}>
              Si la cuenta existe, enviamos las instrucciones a {email.trim()}. Revisa tu bandeja y la carpeta de spam.
            </Text>
            <Pressable
              onPress={onBack}
              style={[styles.secondaryButton, { borderColor: theme.stroke }]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                Volver al inicio
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Correo</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderBottomColor: theme.stroke,
                  },
                ]}
                placeholder="tu@email.com"
                placeholderTextColor={theme.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !isValidEmail}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: isValidEmail ? theme.accent : theme.cardMuted,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: isValidEmail ? "#FFFFFF" : theme.muted },
                  ]}
                >
                  Enviar enlace
                </Text>
              )}
            </Pressable>
          </>
        )}
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
    marginTop: 8,
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
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  successBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  successText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
});
