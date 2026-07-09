import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "../fitness-ui";
import type { FoodProduct } from "../../types/api";

type VisualMode = "dark" | "light";

interface BarcodeProductCardProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  barcode: string;
  product: FoodProduct | null;
  loading: boolean;
  error: string | null;
  defaultServingGrams?: number;
  onRegister: (servingGrams: number) => void | Promise<void>;
  onDismiss: () => void;
  onRetry: () => void;
  registerLoading?: boolean;
}

/**
 * Overlay that appears on top of the camera when a barcode is scanned.
 * Shows the resolved product, lets the user tweak the serving size and
 * confirms the registration as a Log entry.
 *
 * SOLID notes
 * ───────────
 * • SRP — pure presentational component. Persistence, AI calls and the
 *   look-up itself all live in the parent.
 * • ISP — accepts the three pieces of state it actually renders
 *   (product / loading / error) and emits two events (register /
 *   dismiss / retry). No knowledge of auth or the API client.
 */
export function BarcodeProductCard({
  theme,
  visualMode,
  barcode,
  product,
  loading,
  error,
  defaultServingGrams = 100,
  onRegister,
  onDismiss,
  onRetry,
  registerLoading = false,
}: BarcodeProductCardProps) {
  const [servingGrams, setServingGrams] = useState(String(defaultServingGrams));
  const dark = theme.background === "#050505";
  const glassBg = dark ? "rgba(8, 16, 14, 0.94)" : "rgba(255, 255, 255, 0.97)";
  const mutedText = dark ? "rgba(255,255,255,0.7)" : "#5E6B65";
  const text = dark ? "#FFFFFF" : "#0E2A22";
  const border = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)";

  const numericGrams = Number(servingGrams);
  const canSubmit =
    Number.isFinite(numericGrams) && numericGrams > 0 && !registerLoading;

  const factor = Number.isFinite(numericGrams) ? numericGrams / 100 : 0;
  const k = product ? Math.round((product.nutriments.energyKcalPer100g ?? 0) * factor) : 0;
  const p = product ? Math.round((product.nutriments.proteinGPer100g ?? 0) * factor) : 0;
  const c = product ? Math.round((product.nutriments.carbsGPer100g ?? 0) * factor) : 0;
  const f = product ? Math.round((product.nutriments.fatGPer100g ?? 0) * factor) : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
      pointerEvents="box-none"
    >
      <View style={[styles.card, { backgroundColor: glassBg, borderColor: border }]}>
        <View style={styles.header}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: dark
                  ? "rgba(0,200,151,0.16)"
                  : "rgba(0,200,151,0.10)",
              },
            ]}
          >
            <Ionicons name="barcode-outline" size={16} color={theme.accent} />
            <Text style={[styles.badgeText, { color: theme.accent }]}>
              {barcode}
            </Text>
          </View>
          <Pressable onPress={onDismiss} hitSlop={12} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={20} color={mutedText} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.muted, { color: mutedText }]}>
              Buscando en OpenFoodFacts…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBlock}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.danger} />
            <Text style={[styles.errorText, { color: text }]}>{error}</Text>
            <Pressable
              onPress={onRetry}
              style={[styles.retryButton, { borderColor: border }]}
            >
              <Text style={[styles.retryText, { color: theme.accent }]}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : product ? (
          <>
            <View style={styles.productRow}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.thumb,
                    {
                      backgroundColor: dark ? "#13211D" : "#F4FBF7",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons name="cube-outline" size={28} color={mutedText} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: text }]} numberOfLines={2}>
                  {product.productName}
                </Text>
                {product.brand ? (
                  <Text
                    style={[styles.muted, { color: mutedText }]}
                    numberOfLines={1}
                  >
                    {product.brand}
                  </Text>
                ) : null}
                {product.categories ? (
                  <Text
                    style={[styles.mutedSmall, { color: mutedText }]}
                    numberOfLines={1}
                  >
                    {product.categories}
                  </Text>
                ) : null}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: mutedText }]}>
                Cantidad a registrar (g)
              </Text>
              <TextInput
                value={servingGrams}
                onChangeText={(v) => setServingGrams(v.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  {
                    color: text,
                    borderColor: border,
                    backgroundColor: dark ? "#13211D" : "#F4FBF7",
                  },
                ]}
              />
            </View>

            <View style={styles.macroRow}>
              <MacroPill label="kcal" value={k} accent={theme.accent} />
              <MacroPill label="Proteína" value={`${p} g`} accent={theme.mint} />
              <MacroPill label="Carbs" value={`${c} g`} accent={theme.lime} />
              <MacroPill label="Grasa" value={`${f} g`} accent={theme.danger} />
            </View>

            <Pressable
              onPress={() => onRegister(numericGrams)}
              disabled={!canSubmit}
              style={[
                styles.primary,
                { backgroundColor: canSubmit ? theme.accent : theme.cardMuted },
              ]}
            >
              {registerLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.primaryText,
                    { color: canSubmit ? "#FFFFFF" : mutedText },
                  ]}
                >
                  Registrar como comida
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function MacroPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <View style={[styles.pill, { borderColor: `${accent}33` }]}>
      <Text style={[styles.pillLabel, { color: accent }]}>{label}</Text>
      <Text style={[styles.pillValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 50,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  errorBlock: {
    gap: 8,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  retryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  productRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
    lineHeight: 20,
  },
  muted: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 2,
  },
  mutedSmall: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  input: {
    marginTop: 6,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  macroRow: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  pillLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pillValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
    marginTop: 2,
  },
  primary: {
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});