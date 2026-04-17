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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { env } from "../../config/env";

WebBrowser.maybeCompleteAuthSession();

interface RegisterScreenProps {
  theme: FitnessTheme;
  onRegisterSuccess: (user: { id: string; email: string; fullName?: string | null }) => void;
  onBack: () => void;
  onShowLogin: () => void;
}

export function RegisterScreen({
  theme,
  onRegisterSuccess,
  onBack,
  onShowLogin,
}: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: env.googleWebClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
    androidClientId: env.googleAndroidClientId || undefined,
    redirectUri: AuthSession.makeRedirectUri({
      scheme: "bioma",
    }),
  });

  useEffect(() => {
    console.log("[Register] Google Client ID:", env.googleWebClientId ? "Configurado" : "VACÍO");
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleAuth(id_token);
    }
  }, [response]);

  const handleGoogleAuth = async (idToken: string) => {
    console.log("[Register] Starting Google Registration...");
    setLoading(true);
    try {
      const user = await biomaApi.loginWithGoogle(idToken);
      console.log("[Register] Google Success:", user);
      onRegisterSuccess(user);
    } catch (err) {
      console.error("[Register] Google Error:", err);
      Alert.alert(
        "Error de Google",
        err instanceof Error ? err.message : "No se pudo registrar con Google.",
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
    console.log("[Register] Launching Google Login Prompt...");
    promptAsync();
  };

  const darkMode = theme.background === "#050505";
  const gradient: readonly [string, string, string] = darkMode
    ? ["#061612", "#0A1F18", "#050505"]
    : ["#FDF8EF", "#F2EADA", "#F7F4EE"];
  const panelTone = darkMode ? "rgba(17,24,21,0.90)" : "rgba(255,255,255,0.88)";
  const panelStroke = darkMode
    ? "rgba(255,255,255,0.10)"
    : "rgba(23,19,15,0.10)";

  const emailTrimmed = useMemo(() => email.trim().toLowerCase(), [email]);
  const passwordTrimmed = useMemo(() => password.trim(), [password]);
  const canSubmit =
    name.trim().length >= 2 &&
    emailTrimmed.length > 4 &&
    passwordTrimmed.length >= 6 &&
    confirmPassword.trim().length >= 6;

  const handleRegister = async () => {
    if (!canSubmit) {
      Alert.alert("Completa los campos", "Revisa nombre, correo y contrasena.");
      return;
    }
    if (passwordTrimmed !== confirmPassword.trim()) {
      Alert.alert("Contrasenas distintas", "Asegurate de que coincidan.");
      return;
    }

    console.log("[Register] Starting Email Registration for:", emailTrimmed);
    setLoading(true);
    try {
      const result = await biomaApi.registerWithEmail({
        name: name.trim(),
        email: emailTrimmed,
        password: passwordTrimmed,
      });
      console.log("[Register] Email Success:", result);
      onRegisterSuccess(result);
    } catch (err) {
      console.error("[Register] Email Error:", err);
      Alert.alert(
        "No se pudo crear la cuenta",
        err instanceof Error ? err.message : "Intenta de nuevo.",
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
      <LinearGradient colors={gradient} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
            <Text style={[styles.title, { color: theme.text }]}>Crear Cuenta</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Activa tu perfil y empieza tu onboarding en menos de dos minutos.
            </Text>

            <Pressable
              style={[styles.socialButton, { backgroundColor: theme.cardMuted }]}
              onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={[styles.socialButtonText, { color: theme.text }]}>
                Registrarte con Google
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.stroke }]} />
              <Text style={[styles.dividerText, { color: theme.muted }]}>o</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.stroke }]} />
            </View>

            <View style={styles.fields}>
              <Field
                label="Nombre"
                theme={theme}
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <Field
                inputRef={emailRef}
                label="Correo"
                theme={theme}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <PasswordField
                inputRef={passwordRef}
                label="Contrasena"
                theme={theme}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimo 6 caracteres"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((current) => !current)}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <PasswordField
                inputRef={confirmRef}
                label="Confirmar Contrasena"
                theme={theme}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contrasena"
                showPassword={showConfirmPassword}
                onTogglePassword={() =>
                  setShowConfirmPassword((current) => !current)
                }
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: canSubmit ? theme.accent : theme.cardMuted },
              ]}
              onPress={handleRegister}
              disabled={loading || !canSubmit}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: canSubmit ? theme.background : theme.muted },
                ]}
              >
                {loading ? "Creando Cuenta..." : "Crear Cuenta"}
              </Text>
            </Pressable>

            <Pressable onPress={onShowLogin} style={styles.linkWrap}>
              <Text style={[styles.linkText, { color: theme.muted }]}>
                Ya tienes cuenta?{" "}
                <Text style={[styles.linkAccent, { color: theme.accent }]}>
                  Inicia sesion
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function Field({
  inputRef,
  label,
  theme,
  icon,
  ...inputProps
}: {
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
  theme: FitnessTheme;
  icon: React.ComponentProps<typeof Ionicons>["name"];
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: theme.cardMuted }]}>
        <Ionicons name={icon} size={16} color={theme.muted} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.muted}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function PasswordField({
  inputRef,
  label,
  theme,
  showPassword,
  onTogglePassword,
  ...inputProps
}: {
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
  theme: FitnessTheme;
  showPassword: boolean;
  onTogglePassword: () => void;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: theme.cardMuted }]}>
        <Ionicons name="lock-closed-outline" size={16} color={theme.muted} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.muted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          {...inputProps}
        />
        <Pressable
          onPress={onTogglePassword}
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
