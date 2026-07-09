import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import { biomaApi } from "../services/bioma-api";
import type { UserProfile } from "../types/api";

type VisualMode = "dark" | "light";

interface EditProfileModalProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: (next: UserProfile) => void;
}

/**
 * Inline editor for {@link UserProfile}.
 *
 * SOLID notes
 * ───────────
 * • SRP — owns only the edit-profile form. Auth, navigation and
 *   nutrition-plan recomputation live in the parent.
 * • ISP — sends only the fields the user actually touched (dirty
 *   fields), so a no-op "Save" does not produce a PATCH request.
 */
export function EditProfileModal({
  theme,
  visualMode,
  visible,
  profile,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [goal, setGoal] = useState<"LOSE_WEIGHT" | "MAINTAIN" | "GAIN_WEIGHT">(
    "MAINTAIN",
  );
  const [activityLevel, setActivityLevel] = useState<
    "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE"
  >("SEDENTARY");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dark = theme.background === "#050505";

  useEffect(() => {
    if (visible && profile) {
      setWeightKg(profile.weightKg?.toString() ?? "");
      setHeightCm(profile.heightCm?.toString() ?? "");
      setAge(profile.age?.toString() ?? "");
      setCountry(profile.country ?? "");
      setGoal(profile.goal ?? "MAINTAIN");
      setActivityLevel(profile.activityLevel ?? "SEDENTARY");
      setError(null);
    }
  }, [visible, profile]);

  const dirty: Record<string, unknown> = {};
  if (profile) {
    const w = Number(weightKg);
    if (Number.isFinite(w) && w > 0 && w !== profile.weightKg) dirty.weightKg = w;
    const h = Number(heightCm);
    if (Number.isFinite(h) && h > 0 && h !== profile.heightCm) dirty.heightCm = h;
    const a = Number(age);
    if (
      Number.isFinite(a) &&
      a > 0 &&
      a <= 120 &&
      a !== profile.age
    )
      dirty.age = Math.round(a);
    const c = country.trim();
    if (c && c !== profile.country) dirty.country = c;
    if (goal && goal !== profile.goal) dirty.goal = goal;
    if (activityLevel && activityLevel !== profile.activityLevel)
      dirty.activityLevel = activityLevel;
  }

  const hasChanges = Object.keys(dirty).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await biomaApi.updateMyProfile(dirty);
      onSaved(updated);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo guardar.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
              borderColor: theme.stroke,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: dark
                    ? "rgba(0, 200, 151, 0.16)"
                    : "rgba(0, 200, 151, 0.12)",
                },
              ]}
            >
              <Ionicons name="create-outline" size={18} color={theme.accent} />
              <Text style={[styles.badgeText, { color: theme.accent }]}>
                Editar perfil
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Tus datos físicos
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Cambia aquí tu peso, altura, edad o país. Si tocas campos
              que afectan tu plan calórico, lo recalculamos automáticamente.
            </Text>

            <NumericField
              label="Peso (kg)"
              value={weightKg}
              onChange={setWeightKg}
              theme={theme}
            />
            <NumericField
              label="Altura (cm)"
              value={heightCm}
              onChange={setHeightCm}
              theme={theme}
            />
            <NumericField
              label="Edad"
              value={age}
              onChange={setAge}
              theme={theme}
              integer
            />

            <Text style={[styles.fieldLabel, { color: theme.muted }]}>País</Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="Venezuela"
              placeholderTextColor={theme.muted}
              autoCapitalize="words"
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.stroke,
                  backgroundColor: dark ? "#13211D" : "#F4FBF7",
                },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              Objetivo
            </Text>
            <View style={styles.segmented}>
              {(
                [
                  ["LOSE_WEIGHT", "Perder peso"],
                  ["MAINTAIN", "Mantener"],
                  ["GAIN_WEIGHT", "Ganar"],
                ] as const
              ).map(([value, label]) => {
                const active = goal === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setGoal(value)}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: active
                          ? theme.accent
                          : dark
                            ? "#13211D"
                            : "#F4FBF7",
                        borderColor: active ? theme.accent : theme.stroke,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: active ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              Nivel de actividad
            </Text>
            <View style={styles.activityGrid}>
              {(
                [
                  ["SEDENTARY", "Sedentario"],
                  ["LIGHT", "Ligero"],
                  ["MODERATE", "Moderado"],
                  ["ACTIVE", "Activo"],
                  ["VERY_ACTIVE", "Muy activo"],
                ] as const
              ).map(([value, label]) => {
                const active = activityLevel === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setActivityLevel(value)}
                    style={[
                      styles.activityChip,
                      {
                        backgroundColor: active
                          ? theme.accent
                          : dark
                            ? "#13211D"
                            : "#F4FBF7",
                        borderColor: active ? theme.accent : theme.stroke,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.activityChipText,
                        { color: active ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: dark ? "#3A1212" : "#FDECEC",
                    borderColor: theme.danger,
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={theme.danger}
                />
                <Text style={[styles.errorText, { color: theme.text }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={!hasChanges || saving}
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    hasChanges && !saving ? theme.accent : theme.cardMuted,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.saveButtonText,
                    {
                      color:
                        hasChanges && !saving ? "#FFFFFF" : theme.muted,
                    },
                  ]}
                >
                  {hasChanges ? "Guardar cambios" : "Sin cambios"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NumericField({
  label,
  value,
  onChange,
  theme,
  integer,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: FitnessTheme;
  integer?: boolean;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ""))}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.stroke,
            backgroundColor:
              theme.background === "#050505" ? "#13211D" : "#F4FBF7",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  scrim: { ...StyleSheet.absoluteFillObject },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  scroll: {
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  segmentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activityChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  activityChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});