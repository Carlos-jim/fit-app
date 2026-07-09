import React, { type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import type { UserTip } from "../types/api";

type VisualMode = "dark" | "light";

interface TipsScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  tips: UserTip[];
  tipsLoading: boolean;
  userId: string | null;
  onGenerate: () => void;
}

/**
 * Personalised weekly tips view.
 *
 * SOLID notes
 * ───────────
 * • SRP — renders the tip list and its loading/empty states. Persistence
 *   and AI generation live in the parent (which delegates to the backend
 *   `/tips/generate` endpoint).
 * • ISP — exposes only what the tip view needs (tips + loading + a
 *   generate callback). No knowledge of the rest of the app.
 */
const ICON_MAP: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  nutrition: "nutrition-outline",
  fitness: "barbell-outline",
  heart: "heart-outline",
  bulb: "bulb-outline",
  restaurant: "restaurant-outline",
  water: "water-outline",
  sleep: "moon-outline",
  sunny: "sunny-outline",
};

const CATEGORY_LABEL: Record<string, string> = {
  nutricion: "Nutrición",
  habitos: "Hábitos",
  ejercicio: "Ejercicio",
  salud_mental: "Bienestar",
  planificacion: "Planificación",
};

const CATEGORY_COLOR: Record<string, string> = {
  nutricion: "#00C897",
  habitos: "#E8FF54",
  ejercicio: "#76EFE5",
  salud_mental: "#FF5260",
  planificacion: "#FFB866",
};

export function TipsScreen({
  theme,
  tips,
  tipsLoading,
  userId,
  onGenerate,
}: TipsScreenProps) {
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={[styles.headerEyebrow, { color: theme.accent }]}>
            Consejos semanales
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Tips personalizados para ti
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.muted }]}>
            Basados en tu perfil y comidas recientes, generados por IA.
          </Text>
        </View>

        {tipsLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} size="large" />
            <Text style={[styles.loadingText, { color: theme.muted }]}>
              Generando consejos...
            </Text>
          </View>
        ) : tips.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bulb-outline" size={48} color={theme.muted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Sin consejos aún
            </Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Completa el onboarding o registra comidas para recibir tips
              personalizados.
            </Text>
            {userId ? (
              <Pressable
                style={[
                  styles.generateButton,
                  { backgroundColor: theme.accent },
                ]}
                onPress={onGenerate}
              >
                <Text style={styles.generateButtonText}>
                  Generar consejos ahora
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {tips.map((tip, index) => {
              const iconName = tip.icon
                ? (ICON_MAP[tip.icon] ?? "bulb-outline")
                : "bulb-outline";
              const catLabel = CATEGORY_LABEL[tip.category] ?? tip.category;
              const catColor = CATEGORY_COLOR[tip.category] ?? theme.accent;

              return (
                <View
                  key={tip.id}
                  style={[
                    styles.card,
                    {
                      borderColor: theme.stroke,
                      backgroundColor: theme.card,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.cardIconWrap,
                        { backgroundColor: `${catColor}18` },
                      ]}
                    >
                      <Ionicons name={iconName} size={20} color={catColor} />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text
                        style={[
                          styles.cardCategory,
                          { color: catColor },
                        ]}
                      >
                        {catLabel}
                      </Text>
                      <Text
                        style={[styles.cardIndex, { color: theme.muted }]}
                      >
                        {index + 1} / {tips.length}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {tip.title}
                  </Text>
                  <Text style={[styles.cardBody, { color: theme.muted }]}>
                    {tip.body}
                  </Text>
                </View>
              );
            })}

            <Pressable
              style={[
                styles.regenerateButton,
                { borderColor: theme.stroke },
              ]}
              onPress={onGenerate}
            >
              <Ionicons name="refresh" size={18} color={theme.accent} />
              <Text style={[styles.regenerateText, { color: theme.accent }]}>
                Generar nuevos consejos
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: { gap: 4, marginBottom: 8 },
  headerEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 24,
    lineHeight: 30,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  loading: { alignItems: "center", gap: 12, paddingVertical: 48 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 48 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  generateButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  generateButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  list: { gap: 12 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardCategory: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardIndex: { fontFamily: "Inter_500Medium", fontSize: 12 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  cardBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  regenerateText: { fontFamily: "Inter_700Bold", fontSize: 15 },
});