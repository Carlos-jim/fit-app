import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";

interface AuthScreenProps {
  theme: FitnessTheme;
  onLoginSuccess: (userId: string) => void;
  onBack: () => void;
  onShowRegister: () => void;
}

export function AuthScreen({ theme, onLoginSuccess, onBack, onShowRegister }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      const result = await biomaApi.loginWithEmail({ email: email.trim(), password: password.trim() });
      onLoginSuccess(result.id);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert("Google Sign-In", "Configura Google OAuth para habilitar esta función.");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={
          theme.accent === "#00C897" && theme.background === "#050505"
            ? ["#0A1F18", "#050505"]
            : ["#F7F4EE", "#E8E4DB"]
        }
        style={styles.gradient}
      >
        <Pressable onPress={onBack} style={[styles.backButton, { backgroundColor: theme.cardMuted }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: theme.text }]}>Bienvenido de vuelta</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            Inicia sesión para continuar.
          </Text>

          <Pressable
            style={[styles.socialButton, { backgroundColor: theme.cardMuted }]}
            onPress={handleGoogleLogin}
          >
            <Ionicons name="logo-google" size={22} color="#DB4437" />
            <Text style={[styles.socialButtonText, { color: theme.text }]}>
              Continuar con Google
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.stroke }]} />
            <Text style={[styles.dividerText, { color: theme.muted }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.stroke }]} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.muted }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardMuted, color: theme.text }]}
              placeholder="tu@email.com"
              placeholderTextColor={theme.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.muted }]}>Contraseña</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardMuted, color: theme.text }]}
              placeholder="••••••••"
              placeholderTextColor={theme.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={[
              styles.loginButton,
              { backgroundColor: email && password ? theme.accent : theme.cardMuted },
            ]}
            onPress={handleEmailLogin}
            disabled={loading || !email || !password}
          >
            <Text
              style={[
                styles.loginButtonText,
                { color: email && password ? theme.background : theme.muted },
              ]}
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Text>
          </Pressable>

          <Pressable onPress={onShowRegister} style={styles.switchLink}>
            <Text style={[styles.switchText, { color: theme.muted }]}>
              ¿No tienes cuenta?{" "}
              <Text style={[styles.switchLinkText, { color: theme.accent }]}>
                Regístrate
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 16,
  },
  content: { flex: 1, paddingHorizontal: 24 },
  scrollContent: { paddingBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  loginButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  switchLink: {
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
  },
  switchLinkText: {
    fontWeight: "600",
  },
});
