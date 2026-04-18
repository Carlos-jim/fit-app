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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { env } from "../../config/env";

WebBrowser.maybeCompleteAuthSession();

interface AuthScreenProps {
  theme: FitnessTheme;
  onLoginSuccess: (user: { id: string; email: string; fullName?: string | null }) => void;
  onBack: () => void;
  onShowRegister: () => void;
}

export function AuthScreen({
  theme,
  onLoginSuccess,
  onBack,
  onShowRegister,
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
  const gradient: readonly [string, string, string] = darkMode
    ? ["#061612", "#0A1F18", "#050505"]
    : ["#FDF8EF", "#F2EADA", "#F7F4EE"];
  const panelTone = darkMode ? "rgba(17,24,21,0.90)" : "rgba(255,255,255,0.88)";
  const panelStroke = darkMode
    ? "rgba(255,255,255,0.10)"
    : "rgba(23,19,15,0.10)";

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
      <LinearGradient colors={gradient} style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 16) }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={onBack}
            style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>

          <View
            style={[
              styles.panel,
              { backgroundColor: panelTone, borderColor: panelStroke },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Bienvenido Otra Vez
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Accede para continuar tu plan y tu progreso.
            </Text>

            <Pressable
              style={[styles.socialButton, { backgroundColor: theme.cardMuted }]}
              onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>
                Continuar con Google
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.stroke }]} />
              <Text style={[styles.dividerText, { color: theme.muted }]}>o</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.stroke }]} />
            </View>

            <View style={styles.fields}>
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Correo</Text>
                <View style={[styles.inputShell, { backgroundColor: theme.cardMuted }]}>
                  <Ionicons name="mail-outline" size={16} color={theme.muted} />
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
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                  Contrasena
                </Text>
                <View style={[styles.inputShell, { backgroundColor: theme.cardMuted }]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={theme.muted}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Tu contrasena"
                    placeholderTextColor={theme.muted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="go"
                    onSubmitEditing={handleEmailLogin}
                  />
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    accessibilityLabel={showPassword ? "Ocultar contrasena" : "Ver contrasena"}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={theme.muted}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: canSubmit ? theme.accent : theme.cardMuted },
              ]}
              onPress={handleEmailLogin}
              disabled={loading || !canSubmit}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: canSubmit ? theme.background : theme.muted },
                ]}
              >
                {loading ? "Ingresando..." : "Iniciar Sesion"}
              </Text>
            </Pressable>

            <Pressable onPress={onShowRegister} style={styles.linkWrap}>
              <Text style={[styles.linkText, { color: theme.muted }]}>
                No tienes cuenta?{" "}
                <Text style={[styles.linkAccent, { color: theme.accent }]}>
                  Registrate
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 34,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  socialButton: {
    marginTop: 20,
    borderRadius: 16,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  divider: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  fields: {
    marginTop: 16,
    gap: 12,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputShell: {
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 0,
  },
  primaryButton: {
    marginTop: 22,
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  linkWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  linkAccent: {
    fontFamily: "Inter_700Bold",
  },
});
