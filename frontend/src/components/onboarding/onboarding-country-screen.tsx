import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 7;

const COUNTRIES = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Estados Unidos",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
];

type VisualMode = "dark" | "light";

interface OnboardingCountryProps {
  userId: string;
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  onFinish: () => void;
  onToggleMode: () => void;
}

export function OnboardingCountryScreen({
  userId,
  theme,
  visualMode,
  onBack,
  onFinish,
  onToggleMode,
}: OnboardingCountryProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [search]);

  const handleFinish = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await biomaApi.onboardingStep7(userId, selected);
      await biomaApi.deleteOnboardingSession(userId);
      onFinish();
    } catch (err) {
      Alert.alert(
        "No se pudo guardar",
        err instanceof Error ? err.message : "Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(theme);

  return (
    <OnboardingShell
      theme={theme}
      visualMode={visualMode}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿De qué país eres?"
      subtitle="Personalizamos referencias y recomendaciones según tu región."
      onBack={onBack}
      onToggleMode={onToggleMode}
      keyboardAware
      footer={
        <NextButton
          label="Finalizar"
          enabled={!!selected}
          onPress={handleFinish}
          loading={loading}
          theme={theme}
        />
      }
    >
      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={17} color={theme.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar país..."
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* List */}
      <View style={s.list}>
        {filtered.length > 0 ? (
          filtered.map((country) => {
            const active = selected === country;
            return (
              <Pressable
                key={country}
                onPress={() => setSelected(country)}
                style={[s.row, active && { backgroundColor: "rgba(0,200,151,0.07)", borderColor: "rgba(0,200,151,0.45)" }]}
              >
                <Text style={[s.rowLabel, active && { color: theme.text }]}>
                  {country}
                </Text>
                {active ? (
                  <View style={[s.checkCircle, { backgroundColor: theme.accent }]}>
                    <Ionicons name="checkmark" size={13} color={theme.background} />
                  </View>
                ) : (
                  <View style={[s.emptyCircle, { borderColor: theme.stroke }]} />
                )}
              </Pressable>
            );
          })
        ) : (
          <View style={s.emptyState}>
            <Ionicons name="search-outline" size={28} color={theme.muted} />
            <Text style={s.emptyText}>
              Sin resultados para "{search}"
            </Text>
          </View>
        )}
      </View>
    </OnboardingShell>
  );
}

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.stroke,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      paddingVertical: 0,
    },
    list: {
      gap: 6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.stroke,
      paddingHorizontal: 16,
      paddingVertical: 15,
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      color: theme.muted,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    emptyCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      flexShrink: 0,
    },
    emptyState: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 32,
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.stroke,
    },
    emptyText: {
      color: theme.muted,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
    },
  });
}
