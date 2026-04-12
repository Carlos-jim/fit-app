import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
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
  const darkMode = theme.background === "#050505";
  const heroGradient: readonly [string, string, string] = darkMode
    ? ["#04110D", "#0A1F18", "#050505"]
    : ["#FFF8EC", "#F5EEE2", "#ECE4D8"];
  const heroText = darkMode ? "#FFFFFF" : theme.text;
  const heroMuted = darkMode ? "rgba(255,255,255,0.74)" : theme.muted;
  const cardTone = darkMode
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.72)";
  const cardStroke = darkMode
    ? "rgba(255,255,255,0.12)"
    : "rgba(23,19,15,0.08)";
  const pillTone = darkMode
    ? "rgba(118,239,229,0.16)"
    : "rgba(0,200,151,0.12)";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={heroGradient} style={styles.gradient}>
        <View
          style={[
            styles.heroGlowPrimary,
            {
              backgroundColor: darkMode
                ? "rgba(118,239,229,0.22)"
                : "rgba(0,200,151,0.16)",
            },
          ]}
        />
        <View
          style={[
            styles.heroGlowSecondary,
            {
              backgroundColor: darkMode
                ? "rgba(232,255,84,0.18)"
                : "rgba(232,255,84,0.14)",
            },
          ]}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={[styles.badge, { backgroundColor: pillTone }]}> 
              <Ionicons name="sparkles" size={14} color={theme.accent} />
              <Text style={[styles.badgeText, { color: heroText }]}>BIOMA PREMIER</Text>
            </View>

            <Text style={[styles.title, { color: heroText }]}>Tu salud en modo elite.</Text>
            <Text style={[styles.subtitle, { color: heroMuted }]}> 
              Nutricion, macros y seguimiento inteligente en una experiencia
              limpia, rapida y personalizada para ti.
            </Text>

            <View style={styles.kpiRow}>
              <KpiCard
                value="24/7"
                label="Asistente IA"
                textColor={heroText}
                mutedColor={heroMuted}
                tone={cardTone}
                stroke={cardStroke}
              />
              <KpiCard
                value="+98%"
                label="Precision estimada"
                textColor={heroText}
                mutedColor={heroMuted}
                tone={cardTone}
                stroke={cardStroke}
              />
            </View>

            <View style={styles.features}>
              <FeatureItem
                icon="camera-outline"
                title="Escaneo instantaneo"
                text="Foto o texto, resultado nutricional en segundos."
                textColor={heroText}
                mutedColor={heroMuted}
                tone={cardTone}
                stroke={cardStroke}
              />
              <FeatureItem
                icon="fitness-outline"
                title="Plan dinamico"
                text="Objetivos y calorias ajustados a tu progreso real."
                textColor={heroText}
                mutedColor={heroMuted}
                tone={cardTone}
                stroke={cardStroke}
              />
              <FeatureItem
                icon="trending-up-outline"
                title="Seguimiento premium"
                text="Visualiza mejoras diarias con metricas claras."
                textColor={heroText}
                mutedColor={heroMuted}
                tone={cardTone}
                stroke={cardStroke}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.continueButton, loading && styles.buttonDisabled]}
              onPress={onContinue}
              disabled={loading}
            >
              <LinearGradient
                colors={[theme.accent, darkMode ? "#76EFE5" : "#00B889"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueButtonFill}
              >
                <Text
                  style={[
                    styles.continueButtonText,
                    { color: darkMode ? "#03130E" : "#FFFFFF" },
                  ]}
                >
                  {loading ? "Conectando..." : "Continuar"}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={onLogin} style={styles.loginLink}>
              <Text style={[styles.loginText, { color: heroMuted }]}> 
                Ya tienes cuenta?{" "}
                <Text style={[styles.loginLinkText, { color: theme.accent }]}> 
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
  tone,
  stroke,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  text: string;
  textColor: string;
  mutedColor: string;
  tone: string;
  stroke: string;
}) {
  return (
    <View
      style={[
        styles.featureItem,
        {
          backgroundColor: tone,
          borderColor: stroke,
        },
      ]}
    >
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={20} color={textColor} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.featureText, { color: mutedColor }]}>{text}</Text>
      </View>
    </View>
  );
}

function KpiCard({
  value,
  label,
  textColor,
  mutedColor,
  tone,
  stroke,
}: {
  value: string;
  label: string;
  textColor: string;
  mutedColor: string;
  tone: string;
  stroke: string;
}) {
  return (
    <View
      style={[
        styles.kpiCard,
        {
          backgroundColor: tone,
          borderColor: stroke,
        },
      ]}
    >
      <Text style={[styles.kpiValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    minHeight: height,
    paddingTop: 54,
    paddingBottom: 44,
  },
  heroGlowPrimary: {
    position: "absolute",
    top: -90,
    right: -48,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  heroGlowSecondary: {
    position: "absolute",
    bottom: 140,
    left: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
  },
  content: {
    paddingHorizontal: 24,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.1,
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: width > 380 ? 44 : 38,
    lineHeight: width > 380 ? 50 : 44,
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 540,
  },
  kpiRow: {
    marginTop: 22,
    flexDirection: "row",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  kpiValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 24,
    lineHeight: 28,
  },
  kpiLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  features: {
    marginTop: 18,
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
    marginRight: 12,
  },
  featureTextWrap: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  featureText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 24,
    paddingHorizontal: 24,
    gap: 14,
  },
  continueButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  continueButtonFill: {
    borderRadius: 20,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 17,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  loginLinkText: {
    fontFamily: "Inter_700Bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
