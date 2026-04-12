import React, { useState, useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, ProgressBar } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 7;

const COUNTRIES = [
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "CL", name: "Chile", flag: "🇨" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", flag: "🇨" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "PA", name: "Panamá", flag: "🇵" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Perú", flag: "🇵" },
  { code: "PR", name: "Puerto Rico", flag: "🇵" },
  { code: "DO", name: "Rep. Dominicana", flag: "🇩🇴" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
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
    if (!search.trim()) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const handleFinish = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await biomaApi.onboardingStep7(userId, selected);
      await biomaApi.deleteOnboardingSession(userId);
      onFinish();
    } catch (err) {
      console.error("Error saving country:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={[styles.backButton, { backgroundColor: theme.cardMuted }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.progressWrapper}>
          <ProgressBar currentStep={STEP} totalSteps={TOTAL_STEPS} theme={theme} />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>¿De qué país eres?</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Esto se utilizará para calibrar su plan personalizado.
        </Text>

        <View style={[styles.searchBar, { backgroundColor: theme.cardMuted }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar país..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.countriesList}>
          {filtered.map((country) => (
            <Pressable
              key={country.code}
              onPress={() => setSelected(country.name)}
              style={[
                styles.countryItem,
                {
                  backgroundColor:
                    selected === country.name ? theme.accent : theme.cardMuted,
                },
              ]}
            >
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <Text
                style={[
                  styles.countryName,
                  { color: selected === country.name ? theme.background : theme.text },
                ]}
              >
                {country.name}
              </Text>
              {selected === country.name && (
                <Ionicons name="checkmark" size={22} color={theme.background} />
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            * Su información se eliminará después de generar un plan.
          </Text>
          <NextButton
            label="Finalizar"
            enabled={!!selected}
            onPress={handleFinish}
            loading={loading}
            theme={theme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrapper: { flex: 1 },
  placeholder: { width: 44 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  countriesList: {
    gap: 8,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 32,
    gap: 20,
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
  },
});
