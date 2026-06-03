import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { env } from "../../config/env";

WebBrowser.maybeCompleteAuthSession();

type VisualMode = "dark" | "light";

interface AuthScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  onLoginSuccess: (user: { id: string; email: string; fullName?: string | null; plan: string }) => void;
  onBack: () => void;
  onShowRegister: () => void;
  onToggleMode: () => void;
}

export function AuthScreen({
  theme,
  visualMode,
  onLoginSuccess,
  onBack,
  onShowRegister,
  onToggleMode,
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: env.googleWebClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
    androidClientId: env.googleAndroidClientId || undefined,
    redirectUri: AuthSession.makeRedirectUri({
      scheme: "bioma",
    }),
  });

  useEffect(() => {
    console.log("[Auth] Google Client ID:", env.googleWebClientId ? "Configurado" : "VACÍO");
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleAuth(id_token);
    }
  }, [response]);

  const handleGoogleAuth = async (idToken: string) => {
    console.log("[Auth] Starting Google Auth with ID Token...");
    setLoading(true);
    try {
      const user = await biomaApi.loginWithGoogle(idToken);
      console.log("[Auth] Google Login Success:", user);
      onLoginSuccess(user);
    } catch (err) {
      console.error("[Auth] Google Login Error:", err);
      Alert.alert(
        "Error de Google",
        err instanceof Error ? err.message : "No se pudo iniciar sesion con Google.",
      );
    } finally {
      setLoading(false);
    }
  };

  const darkMode = theme.background === "#050505";
  const canSubmit = email.trim().length > 4 && password.trim().length > 0;

  const emailTrimmed = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleEmailLogin = async () => {
    if (!canSubmit) {
      Alert.alert("Completa los campos", "Ingresa correo y contrasena.");
      return;
    }

    console.log("[Auth] Starting Email Login for:", emailTrimmed);
    setLoading(true);
    try {
      const result = await biomaApi.loginWithEmail({
        email: emailTrimmed,
        password: password.trim(),
      });
      console.log("[Auth] Email Login Success:", result);
      onLoginSuccess(result);
    } catch (err) {
      console.error("[Auth] Email Login Error:", err);
      Alert.alert(
        "No se pudo iniciar sesion",
        err instanceof Error ? err.message : "Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!env.googleWebClientId) {
      Alert.alert(
        "OAuth no configurado",
        "Configura las variables de entorno EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en el frontend para habilitar Google Sign-In.",
      );
      return;
    }
    promptAsync();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Header Area */}
        <View
          style={[
            styles.headerArea,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
        >
          <Pressable
            onPress={onBack}
            style={[styles.backButton, { top: Math.max(insets.top, 16) }]}
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>

          <Pressable
            onPress={onToggleMode}
            style={[styles.themeToggle, { top: Math.max(insets.top, 16) }]}
            accessibilityLabel="Cambiar tema"
          >
            <Ionicons
              name={visualMode === "dark" ? "moon-outline" : "sunny-outline"}
              size={20}
              color={theme.text}
            />
          </Pressable>

          {/* Geometric shapes */}
          <View
            style={[
              styles.shape,
              styles.shape1,
              {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          />
          <View
            style={[
              styles.shape,
              styles.shape2,
              {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(0,0,0,0.02)",
              },
            ]}
          />
          <View
            style={[
              styles.shape,
              styles.shape3,
              {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.025)"
                  : "rgba(0,0,0,0.025)",
              },
            ]}
          />
          <View
            style={[
              styles.shape,
              styles.shape4,
              {
                backgroundColor: darkMode
                  ? "rgba(0,200,151,0.06)"
                  : "rgba(0,200,151,0.08)",
              },
            ]}
          />

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View
              style={[styles.logoBox, { backgroundColor: theme.text }]}
            >
              <Text
                style={[styles.logoText, { color: theme.background }]}
              >
                B
              </Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: darkMode ? "#111111" : "#FFFFFF" },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Login
            </Text>

            <View style={styles.fields}>
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                  Email
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="tu@email.com"
                  placeholderTextColor={theme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                  Contrasena
                </Text>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Tu contrasena"
                  placeholderTextColor={theme.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleEmailLogin}
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: canSubmit
                    ? theme.accent
                    : theme.cardMuted,
                },
              ]}
              onPress={handleEmailLogin}
              disabled={loading || !canSubmit}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  {
                    color: canSubmit ? "#FFFFFF" : theme.muted,
                  },
                ]}
              >
                {loading ? "Ingresando..." : "Log in"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.socialButton,
                { borderColor: theme.stroke },
              ]}
              onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text
                style={[
                  styles.socialButtonText,
                  { color: theme.text },
                ]}
              >
                Continuar con Google
              </Text>
            </Pressable>

            <Pressable onPress={onShowRegister} style={styles.linkWrap}>
              <Text style={[styles.linkText, { color: theme.muted }]}>
                No tienes cuenta?{" "}
                <Text
                  style={[styles.linkAccent, { color: theme.accent }]}
                >
                  Sign Up
                </Text>
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    height: "32%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    zIndex: 10,
  },
  themeToggle: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.12)",
    zIndex: 10,
  },
  shape: {
    position: "absolute",
    borderRadius: 999,
  },
  shape1: {
    width: 180,
    height: 180,
    top: 20,
    left: -40,
  },
  shape2: {
    width: 140,
    height: 140,
    top: 60,
    right: -20,
  },
  shape3: {
    width: 100,
    height: 100,
    bottom: 20,
    left: 40,
  },
  shape4: {
    width: 120,
    height: 120,
    top: 10,
    right: 60,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 32,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 48,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
  },
  scrollContent: {
    gap: 24,
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 8,
  },
  fields: {
    gap: 20,
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
    fontSize: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  socialButton: {
    borderRadius: 16,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  socialButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  linkWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  linkAccent: {
    fontFamily: "Inter_700Bold",
  },
});
