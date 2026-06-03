import React from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";

type VisualMode = "dark" | "light";

interface WelcomeScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  onContinue: () => void;
  onLogin: () => void;
  onToggleMode: () => void;
  loading?: boolean;
}

const { width } = Dimensions.get("window");

export function WelcomeScreen({
  theme,
  visualMode,
  onContinue,
  onLogin,
  onToggleMode,
  loading = false,
}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const isDark = theme.background === "#050505";

  const textPrimary = theme.text;
  const textMuted = theme.muted;
  const textSecondary = isDark ? "rgba(245,251,248,0.60)" : "rgba(23,19,15,0.55)";
  const featureIconBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(23,19,15,0.06)";
  const featureIconColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(23,19,15,0.40)";
  const buttonBg = isDark ? "#1A1A1A" : "#17130F";
  const buttonText = isDark ? "#FFFFFF" : "#FFFFFF";

  const features = [
    {
      icon: "camera-outline" as const,
      title: "Escanea tu comida",
      description: "Analiza comidas por foto o texto en segundos.",
    },
    {
      icon: "bar-chart-outline" as const,
      title: "Analiza tu progreso",
      description: "Mira tus macros y tu progreso diario sin ruido.",
    },
    {
      icon: "pulse-outline" as const,
      title: "Ajusta tu plan",
      description: "Tu plan evoluciona con tus resultados reales.",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 60), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme toggle */}
        <Pressable
          onPress={onToggleMode}
          style={[styles.themeToggle, { top: Math.max(insets.top, 16) }]}
          accessibilityLabel="Cambiar tema"
        >
          <Ionicons
            name={visualMode === "dark" ? "moon-outline" : "sunny-outline"}
            size={22}
            color={theme.text}
          />
        </Pressable>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoIconWrap, { backgroundColor: featureIconBg }]}>
            <Ionicons name="leaf-outline" size={32} color={theme.accent} />
          </View>
          <Text style={[styles.logoText, { color: textPrimary }]}>bioma</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIconBox, { backgroundColor: featureIconBg }]}>
                <Ionicons name={feature.icon} size={20} color={featureIconColor} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: textPrimary }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDesc, { color: textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={onContinue}
            disabled={loading}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: buttonBg, opacity: pressed || loading ? 0.75 : 1 },
            ]}
          >
            <Text style={[styles.ctaButtonText, { color: buttonText }]}>
              {loading ? "Conectando..." : "Comenzar Ahora"}
            </Text>
          </Pressable>

          <Pressable onPress={onLogin} style={styles.loginWrap}>
            <Text style={[styles.loginText, { color: textMuted }]}>
              Ya tienes cuenta?{" "}
              <Text style={[styles.loginLink, { color: theme.accent }]}>
                Inicia sesion
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginTop: 40,
    gap: 14,
  },
  logoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 32,
    letterSpacing: -0.5,
  },
  featuresSection: {
    marginTop: 48,
    gap: 28,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  featureDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: "auto",
    gap: 16,
    paddingTop: 32,
  },
  ctaButton: {
    borderRadius: 16,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  loginWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  loginLink: {
    fontFamily: "Inter_700Bold",
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
});
