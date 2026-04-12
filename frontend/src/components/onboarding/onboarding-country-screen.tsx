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
  "Espana",
  "Estados Unidos",
  "Guatemala",
  "Honduras",
  "Mexico",
  "Nicaragua",
  "Panama",
  "Paraguay",
  "Peru",
  "Puerto Rico",
  "Republica Dominicana",
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

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return COUNTRIES;
    }

    return COUNTRIES.filter((country) => country.toLowerCase().includes(query));
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
      title="De que pais eres?"
      subtitle="Nos ayuda a mostrar referencias y recomendaciones mas relevantes."
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
      <View style={[styles.searchBar, { backgroundColor: theme.cardMuted }]}>
        <Ionicons name="search" size={18} color={theme.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar pais"
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
      </View>

      <View style={styles.countryList}>
        {filteredCountries.length > 0 ? (
          filteredCountries.map((country) => {
            const active = selected === country;
            return (
              <Pressable
                key={country}
                onPress={() => setSelected(country)}
                style={[
                  styles.countryRow,
                  {
                    backgroundColor: active ? theme.accent : theme.cardMuted,
                    borderColor: active ? theme.accent : theme.stroke,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countryLabel,
                    { color: active ? theme.background : theme.text },
                  ]}
                >
                  {country}
                </Text>
                {active ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={theme.background}
                  />
                ) : null}
              </Pressable>
            );
          })
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardMuted }]}>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              No encontramos resultados para "{search}".
            </Text>
          </View>
        )}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 0,
  },
  countryList: {
    gap: 8,
  },
  countryRow: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  countryLabel: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  emptyCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
