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

interface OnboardingCountryProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onFinish: () => void;
}

export function OnboardingCountryScreen({
  userId,
  theme,
  onBack,
  onFinish,
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

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="¿De qué país eres?"
      subtitle="Personalizamos referencias y recomendaciones según tu región."
      onBack={onBack}
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
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color="#3E4259" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar país..."
          placeholderTextColor="#3E4259"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color="#3E4259" />
          </Pressable>
        ) : null}
      </View>

      {/* List */}
      <View style={styles.list}>
        {filtered.length > 0 ? (
          filtered.map((country) => {
            const active = selected === country;
            return (
              <Pressable
                key={country}
                onPress={() => setSelected(country)}
                style={[styles.row, active && styles.rowActive]}
              >
                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                  {country}
                </Text>
                {active ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={13} color="#09090E" />
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={28} color="#2A2C40" />
            <Text style={styles.emptyText}>
              Sin resultados para "{search}"
            </Text>
          </View>
        )}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111219",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
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
    backgroundColor: "#111219",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  rowActive: {
    backgroundColor: "rgba(0,200,151,0.07)",
    borderColor: "rgba(0,200,151,0.45)",
  },
  rowLabel: {
    flex: 1,
    color: "#8E92A8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  rowLabelActive: {
    color: "#FFFFFF",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#00C897",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
    backgroundColor: "#111219",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyText: {
    color: "#3E4259",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
