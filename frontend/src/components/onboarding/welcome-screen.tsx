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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";

interface WelcomeScreenProps {
  theme: FitnessTheme;
  onContinue: () => void;
  onLogin: () => void;
  loading?: boolean;
}

const { width, height } = Dimensions.get("window");

export function WelcomeScreen({
  theme,
  onContinue,
  onLogin,
  loading = false,
}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const darkMode = theme.background === "#050505";
  const gradient: readonly [string, string, string] = darkMode
    ? ["#04100D", "#0B1F18", "#050505"]
    : ["#FCF7EE", "#F3EBDC", "#F7F4EE"];
  const heroText = darkMode ? "#FCFFFD" : theme.text;
  const heroMuted = darkMode ? "rgba(245,251,248,0.74)" : theme.muted;
  const panelTone = darkMode ? "rgba(17,24,21,0.84)" : "rgba(255,255,255,0.82)";
  const panelStroke = darkMode
    ? "rgba(255,255,255,0.10)"
    : "rgba(23,19,15,0.09)";
  const chipTone = darkMode ? "rgba(118,239,229,0.16)" : "rgba(0,200,151,0.11)";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={gradient} style={styles.container}>
        <View
          style={[
            styles.glowPrimary,
            {
              backgroundColor: darkMode
                ? "rgba(118,239,229,0.20)"
                : "rgba(0,200,151,0.16)",
            },
          ]}
        />
        <View
          style={[
            styles.glowSecondary,
            {
              backgroundColor: darkMode
                ? "rgba(232,255,84,0.14)"
                : "rgba(232,255,84,0.12)",
            },
          ]}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 24) }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroPanel,
              { backgroundColor: panelTone, borderColor: panelStroke },
            ]}
          >
            <View style={[styles.badge, { backgroundColor: chipTone }]}>
              <Ionicons name="sparkles" size={13} color={theme.accent} />
              <Text style={[styles.badgeText, { color: heroText }]}>BIOMA FIT</Text>
            </View>

            <Text style={[styles.title, { color: heroText }]}>
              Tu plan de nutricion inteligente.
            </Text>
            <Text style={[styles.subtitle, { color: heroMuted }]}>
              Personaliza calorias, sigue tu progreso y mejora cada semana con
              un flujo simple, visual y accionable.
            </Text>

            <View style={styles.metricsRow}>
              <InfoMetric
                value="2 min"
                label="Setup inicial"
                textColor={heroText}
                mutedColor={heroMuted}
              />
              <InfoMetric
                value="24/7"
                label="Asistente IA"
                textColor={heroText}
                mutedColor={heroMuted}
              />
              <InfoMetric
                value="100%"
                label="Personal"
                textColor={heroText}
                mutedColor={heroMuted}
              />
            </View>

            <View style={styles.featureList}>
              <FeatureItem
                icon="camera-outline"
                title="Escaneo Rapido"
                text="Analiza comidas por foto o texto en segundos."
                textColor={heroText}
                mutedColor={heroMuted}
              />
              <FeatureItem
                icon="bar-chart-outline"
                title="Seguimiento Claro"
                text="Mira tus macros y tu progreso diario sin ruido."
                textColor={heroText}
                mutedColor={heroMuted}
              />
              <FeatureItem
                icon="pulse-outline"
                title="Ajustes Inteligentes"
                text="Tu plan evoluciona con tus resultados reales."
                textColor={heroText}
                mutedColor={heroMuted}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={onContinue}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
            >
              <LinearGradient
                colors={[theme.accent, darkMode ? "#75EDE2" : "#00B88A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonFill}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: darkMode ? "#03130E" : "#FFFFFF" },
                  ]}
                >
                  {loading ? "Conectando..." : "Comenzar Ahora"}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={onLogin} style={styles.loginWrap}>
              <Text style={[styles.loginText, { color: heroMuted }]}>
                Ya tienes cuenta?{" "}
                <Text style={[styles.loginLink, { color: theme.accent }]}>
                  Inicia sesion
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  text,
  textColor,
  mutedColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  text: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={18} color={textColor} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.featureText, { color: mutedColor }]}>{text}</Text>
      </View>
    </View>
  );
}

function InfoMetric({
  value,
  label,
  textColor,
  mutedColor,
}: {
  value: string;
  label: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowPrimary: {
    position: "absolute",
    top: -96,
    right: -52,
    width: 264,
    height: 264,
    borderRadius: 132,
  },
  glowSecondary: {
    position: "absolute",
    bottom: 120,
    left: -88,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  scrollContent: {
    minHeight: height,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
    gap: 18,
  },
  heroPanel: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 20,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 14,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: width > 380 ? 40 : 34,
    lineHeight: width > 380 ? 46 : 40,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  metricsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  metricValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 20,
  },
  metricLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  featureList: {
    marginTop: 18,
    gap: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  featureText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    marginTop: "auto",
    gap: 12,
  },
  primaryButton: {
    borderRadius: 18,
    overflow: "hidden",
  },
  primaryButtonFill: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
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
});
