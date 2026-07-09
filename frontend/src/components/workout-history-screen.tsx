import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { Workout, WorkoutType } from "../types/api";
import { handleError } from "../utils/toast";

type VisualMode = "dark" | "light";

interface WorkoutHistoryScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  userId: string;
  onClose: () => void;
}

const TYPE_LABEL: Record<WorkoutType, string> = {
  STRENGTH: "Fuerza",
  CARDIO: "Cardio",
  FLEXIBILITY: "Flexibilidad",
  HIIT: "HIIT",
  SPORT: "Deporte",
};

const TYPE_ICON: Record<WorkoutType, string> = {
  STRENGTH: "fitness-outline",
  CARDIO: "heart-outline",
  FLEXIBILITY: "body-outline",
  HIIT: "flash-outline",
  SPORT: "trophy-outline",
};

/**
 * Lightweight workout tracker.
 *
 * SOLID notes
 * ───────────
 * • SRP — owns the workout list + "log a session" form. Persistence is
 *   delegated to {@link biomaApi}; navigation lives in the parent.
 * • ISP — the create form only collects the fields most users care
 *   about (name, duration, type, intensity). Each set is captured as
 *   exercise + reps + weight — everything else (distance, duration
 *   per set) is currently optional and can be added later.
 */
export function WorkoutHistoryScreen({
  theme,
  visualMode,
  userId,
  onClose,
}: WorkoutHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = theme.background === "#050505";

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await biomaApi.listWorkouts({ limit: 50 });
      setWorkouts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => computeStats(workouts), [workouts]);

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar entrenamiento", "¿Quieres eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
          onPress: async () => {
            try {
              await biomaApi.deleteWorkout(id);
              await load();
            } catch (err) {
              handleError(err, "No se pudo eliminar");
            }
          },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          onPress={onClose}
          style={styles.iconButton}
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Entrenamientos
        </Text>
        <Pressable
          onPress={() => setEntryOpen(true)}
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          accessibilityLabel="Registrar entrenamiento"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {stats ? (
          <View style={styles.statsRow}>
            <StatBox
              theme={theme}
              dark={dark}
              label="Esta semana"
              value={`${stats.thisWeekCount}`}
              sub="sesiones"
            />
            <StatBox
              theme={theme}
              dark={dark}
              label="Duración total"
              value={`${stats.totalMinutes} min`}
            />
            <StatBox
              theme={theme}
              dark={dark}
              label="Calorías"
              value={`${stats.totalCalories.toLocaleString()}`}
              sub="estimadas"
            />
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : workouts.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: dark ? "#0F1A16" : theme.cardMuted,
                borderColor: theme.stroke,
              },
            ]}
          >
            <Ionicons
              name="barbell-outline"
              size={28}
              color={theme.muted}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Aún no registras entrenamientos
            </Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Toca el botón + para guardar tu primera sesión. Cada
              entrenamiento queda en tu historial con sus sets.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Historial
            </Text>
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                theme={theme}
                dark={dark}
                onDelete={() => handleDelete(workout.id)}
              />
            ))}
          </>
        )}

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
      </ScrollView>

      <WorkoutEntryModal
        visible={entryOpen}
        theme={theme}
        dark={dark}
        onClose={() => setEntryOpen(false)}
        onSaved={async () => {
          setEntryOpen(false);
          await load();
        }}
      />
    </View>
  );
}

function StatBox({
  theme,
  dark,
  label,
  value,
  sub,
}: {
  theme: FitnessTheme;
  dark: boolean;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View
      style={[
        styles.statBox,
        {
          backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
          borderColor: theme.stroke,
        },
      ]}
    >
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      {sub ? (
        <Text style={[styles.statSub, { color: theme.muted }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

function WorkoutCard({
  workout,
  theme,
  dark,
  onDelete,
}: {
  workout: Workout;
  theme: FitnessTheme;
  dark: boolean;
  onDelete: () => void;
}) {
  return (
    <View
      style={[
        styles.workoutCard,
        {
          backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
          borderColor: theme.stroke,
        },
      ]}
    >
      <View style={styles.workoutHeader}>
        <View
          style={[
            styles.workoutIconWrap,
            { backgroundColor: `${theme.accent}1F` },
          ]}
        >
          <Ionicons
            name={TYPE_ICON[workout.type] as React.ComponentProps<typeof Ionicons>["name"]}
            size={20}
            color={theme.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.workoutName, { color: theme.text }]}>
            {workout.name}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {TYPE_LABEL[workout.type]} · {formatDate(workout.performedAt)}
          </Text>
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityLabel="Eliminar entrenamiento"
        >
          <Ionicons name="trash-outline" size={18} color={theme.muted} />
        </Pressable>
      </View>

      <View style={styles.workoutStatsRow}>
        <Stat label="Duración" value={`${workout.durationMinutes} min`} theme={theme} />
        {workout.caloriesBurned ? (
          <Stat
            label="Calorías"
            value={`${workout.caloriesBurned}`}
            theme={theme}
          />
        ) : null}
        <Stat
          label="Sets"
          value={`${workout.sets.length}`}
          theme={theme}
        />
      </View>

      {workout.sets.length > 0 ? (
        <View style={styles.setsList}>
          {workout.sets.slice(0, 5).map((set) => (
            <Text
              key={set.id}
              style={[styles.setLine, { color: theme.muted }]}
            >
              • {set.exercise}
              {set.reps ? ` · ${set.reps} reps` : ""}
              {set.weightKg ? ` · ${set.weightKg} kg` : ""}
              {set.durationSec
                ? ` · ${Math.round(set.durationSec / 60)} min`
                : ""}
              {set.distanceMeters
                ? ` · ${(set.distanceMeters / 1000).toFixed(2)} km`
                : ""}
            </Text>
          ))}
          {workout.sets.length > 5 ? (
            <Text style={[styles.setLine, { color: theme.muted }]}>
              + {workout.sets.length - 5} más
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: FitnessTheme;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statSub, { color: theme.muted }]}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          { color: theme.text, fontSize: 16, marginTop: 2 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

interface WorkoutEntryModalProps {
  visible: boolean;
  theme: FitnessTheme;
  dark: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function WorkoutEntryModal({
  visible,
  theme,
  dark,
  onClose,
  onSaved,
}: WorkoutEntryModalProps) {
  const [name, setName] = useState("Entrenamiento");
  const [type, setType] = useState<WorkoutType>("STRENGTH");
  const [duration, setDuration] = useState("45");
  const [exercise, setExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName("Entrenamiento");
      setType("STRENGTH");
      setDuration("45");
      setExercise("");
      setReps("");
      setWeight("");
      setError(null);
    }
  }, [visible]);

  const numericDuration = Number(duration);
  const canSubmit =
    name.trim().length > 0 &&
    exercise.trim().length > 0 &&
    Number.isFinite(numericDuration) &&
    numericDuration > 0 &&
    !loading;

  const handleSave = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await biomaApi.createWorkout({
        type,
        name: name.trim(),
        durationMinutes: Math.round(numericDuration),
        sets: [
          {
            exercise: exercise.trim(),
            reps: reps ? Number(reps) : undefined,
            weightKg: weight ? Number(weight) : undefined,
          },
        ],
      });
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el entrenamiento.",
      );
    } finally {
      setLoading(false);
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalBackdrop}
      >
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
              borderColor: theme.stroke,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Registrar entrenamiento
          </Text>
          <Text style={[styles.modalSubtitle, { color: theme.muted }]}>
            Captura el tipo, duración y al menos un ejercicio. Puedes
            agregar más sets después desde el historial.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              Nombre
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Push day"
              placeholderTextColor={theme.muted}
              style={[
                styles.modalInput,
                { color: theme.text, borderBottomColor: theme.stroke },
              ]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: theme.muted }]}>Tipo</Text>
          <View style={styles.segmented}>
            {(Object.keys(TYPE_LABEL) as WorkoutType[]).map((value) => {
              const active = type === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setType(value)}
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
                    {TYPE_LABEL[value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              Duración (minutos)
            </Text>
            <TextInput
              value={duration}
              onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              style={[
                styles.modalInput,
                { color: theme.text, borderBottomColor: theme.stroke },
              ]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: theme.muted }]}>
            Ejercicio
          </Text>
          <TextInput
            value={exercise}
            onChangeText={setExercise}
            placeholder="Press banca"
            placeholderTextColor={theme.muted}
            style={[
              styles.modalInput,
              { color: theme.text, borderBottomColor: theme.stroke },
            ]}
          />

          <View style={styles.row}>
            <View style={[styles.fieldBlock, styles.flex1]}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                Reps
              </Text>
              <TextInput
                value={reps}
                onChangeText={(v) => setReps(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={[
                  styles.modalInput,
                  { color: theme.text, borderBottomColor: theme.stroke },
                ]}
              />
            </View>
            <View style={[styles.fieldBlock, styles.flex1]}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                Peso (kg)
              </Text>
              <TextInput
                value={weight}
                onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                style={[
                  styles.modalInput,
                  { color: theme.text, borderBottomColor: theme.stroke },
                ]}
              />
            </View>
          </View>

          {error ? (
            <Text style={[styles.modalError, { color: theme.danger }]}>
              {error}
            </Text>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={[
                styles.modalSecondary,
                { borderColor: theme.stroke },
              ]}
            >
              <Text style={[styles.modalSecondaryText, { color: theme.text }]}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!canSubmit}
              style={[
                styles.modalPrimary,
                {
                  backgroundColor: canSubmit ? theme.accent : theme.cardMuted,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.modalPrimaryText,
                    { color: canSubmit ? "#FFFFFF" : theme.muted },
                  ]}
                >
                  Guardar
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeStats(workouts: Workout[]) {
  if (workouts.length === 0) return null;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekCount = workouts.filter(
    (w) => new Date(w.performedAt) >= weekStart,
  ).length;
  const totalMinutes = workouts.reduce(
    (sum, w) => sum + w.durationMinutes,
    0,
  );
  const totalCalories = workouts.reduce(
    (sum, w) => sum + (w.caloriesBurned ?? 0),
    0,
  );
  return { thisWeekCount, totalMinutes, totalCalories };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 20,
  },
  statSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  loader: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
    marginTop: 6,
  },
  workoutCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutName: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
  },
  workoutMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  workoutStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
  },
  setsList: {
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  setLine: {
    fontFamily: "Inter_500Medium",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
  },
  modalSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalInput: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: { flex: 1 },
  modalError: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalSecondary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalSecondaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  modalPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});