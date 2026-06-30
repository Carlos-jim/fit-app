import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";

type VisualMode = "dark" | "light";

interface VerifyEmailScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  token: string;
  email?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VerifyEmailScreen({
  theme,
  visualMode,
  token,
  email,
  onSuccess,
  onCancel,
}: VerifyEmailScreenProps) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const dark = theme.background === "#050505";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await biomaApi.verifyEmail(token);
        if (!cancelled) setStatus("success");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "El enlace es inválido o ya expiró.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    if (!email) return;
    try {
      await biomaApi.resendVerification(email);
    } catch {
      // swallow - we don't want to surface internal errors here
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          onPress={onCancel}
          style={styles.iconButton}
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
          <Ionicons
            name={status === "success" ? "mail-unread-outline" : "mail-outline"}
            size={18}
            color={theme.accent}
          />
          <Text style={[styles.badgeText, { color: theme.accent }]}>
            Verificación de correo
          </Text>
        </View>

        {status === "loading" ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              Verificando tu correo…
            </Text>
            <ActivityIndicator color={theme.accent} size="large" />
          </>
        ) : null}

        {status === "success" ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              ¡Listo! Correo verificado
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Tu cuenta ya puede usar todo el poder de Bioma, incluyendo
              recuperación de contraseña y futuras alertas de salud.
            </Text>
            <Pressable
              onPress={onSuccess}
              style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </Pressable>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              No pudimos verificar
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              {error ??
                "El enlace es inválido o ya expiró. Puedes pedir uno nuevo."}
            </Text>
            {email ? (
              <Pressable
                onPress={handleResend}
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.stroke },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Reenviar enlace de verificación
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onCancel}
              style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.primaryButtonText}>Volver</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
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
    gap: 16,
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
    color: "#FFFFFF",
  },
  secondaryButton: {
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
});
