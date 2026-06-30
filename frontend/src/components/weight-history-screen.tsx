import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import type { BodyMetric, BodyMetricType } from "../types/api";
import { biomaApi } from "../services/bioma-api";

type VisualMode = "dark" | "light";

interface WeightHistoryScreenProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  userId: string;
  onClose: () => void;
}

type Range = "30d" | "90d" | "all";

const RANGE_OPTIONS: Array<{ key: Range; label: string; days: number | null }> = [
  { key: "30d", label: "30 días", days: 30 },
  { key: "90d", label: "90 días", days: 90 },
  { key: "all", label: "Todo", days: null },
];

export function WeightHistoryScreen({
  theme,
  visualMode,
  userId,
  onClose,
}: WeightHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("30d");
  const [entryOpen, setEntryOpen] = useState(false);

  const dark = theme.background === "#050505";

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await biomaApi.listBodyMetrics({ type: "WEIGHT_KG" });
      setMetrics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const option = RANGE_OPTIONS.find((o) => o.key === range);
    if (!option?.days) return metrics;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - option.days);
    return metrics.filter((m) => new Date(m.recordedAt) >= cutoff);
  }, [metrics, range]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar registro", "¿Quieres eliminar este peso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await biomaApi.deleteBodyMetric(id);
            await load();
          } catch (err) {
            Alert.alert(
              "No se pudo eliminar",
              err instanceof Error ? err.message : "Intenta de nuevo.",
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mi peso</Text>
        <Pressable
          onPress={() => setEntryOpen(true)}
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          accessibilityLabel="Registrar peso"
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
              label="Actual"
              value={formatKg(stats.latest.value)}
              sub={formatRelativeDate(stats.latest.recordedAt)}
            />
            <StatBox
              theme={theme}
              dark={dark}
              label="Promedio"
              value={formatKg(stats.average)}
            />
            <StatBox
              theme={theme}
              dark={dark}
              label="Cambio"
              value={
                stats.delta === null
                  ? "—"
                  : `${stats.delta > 0 ? "+" : ""}${formatKg(stats.delta)}`
              }
              sub={stats.deltaLabel}
              tone={stats.delta < 0 ? "good" : stats.delta > 0 ? "warn" : "neutral"}
            />
          </View>
        ) : null}

        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => {
            const active = option.key === range;
            return (
              <Pressable
                key={option.key}
                onPress={() => setRange(option.key)}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: active
                      ? theme.accent
                      : dark
                        ? "#1A2620"
                        : theme.cardMuted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    { color: active ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : filtered.length === 0 ? (
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
              name="analytics-outline"
              size={28}
              color={theme.muted}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Sin registros aún
            </Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              Toca el botón + para registrar tu primer peso y empezar a ver tu
              tendencia.
            </Text>
          </View>
        ) : (
          <>
            <WeightChart
              theme={theme}
              dark={dark}
              data={filtered}
              goalKg={stats?.goalKg ?? null}
            />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Registros
            </Text>
            {filtered.map((metric) => (
              <View
                key={metric.id}
                style={[
                  styles.entryRow,
                  {
                    backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
                    borderColor: theme.stroke,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryValue, { color: theme.text }]}>
                    {formatKg(metric.value)}
                  </Text>
                  <Text style={[styles.entryDate, { color: theme.muted }]}>
                    {formatDate(metric.recordedAt)}
                    {metric.notes ? ` · ${metric.notes}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDelete(metric.id)}
                  hitSlop={8}
                  accessibilityLabel="Eliminar registro"
                >
                  <Ionicons name="trash-outline" size={18} color={theme.muted} />
                </Pressable>
              </View>
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

      <WeightEntryModal
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
  tone = "neutral",
}: {
  theme: FitnessTheme;
  dark: boolean;
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const color =
    tone === "good"
      ? theme.accent
      : tone === "warn"
        ? theme.danger
        : theme.text;
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
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub ? (
        <Text style={[styles.statSub, { color: theme.muted }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

function WeightChart({
  theme,
  dark,
  data,
  goalKg,
}: {
  theme: FitnessTheme;
  dark: boolean;
  data: BodyMetric[];
  goalKg: number | null;
}) {
  const points = useMemo(() => {
    return [...data]
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      )
      .map((m) => ({
        x: new Date(m.recordedAt).getTime(),
        y: m.value,
      }));
  }, [data]);

  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, goalKg ?? Infinity) - 0.5;
  const maxY = Math.max(...ys, goalKg ?? -Infinity) + 0.5;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);

  const W = 320;
  const H = 160;
  const padX = 16;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const project = (p: { x: number; y: number }) => {
    const x = padX + ((p.x - minX) / spanX) * innerW;
    const y = padY + (1 - (p.y - minY) / spanY) * innerH;
    return { x, y };
  };

  const path = points
    .map((p, i) => {
      const { x, y } = project(p);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const last = points[points.length - 1]!;
  const lastProjected = project(last);

  const goalY = goalKg
    ? padY + (1 - (goalKg - minY) / spanY) * innerH
    : null;

  return (
    <View
      style={[
        styles.chartBox,
        {
          backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
          borderColor: theme.stroke,
        },
      ]}
    >
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>
          Tendencia
        </Text>
        <Text style={[styles.chartSubtitle, { color: theme.muted }]}>
          {points.length} registros
        </Text>
      </View>
      <View style={styles.chartSvg}>
        {/* horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <View
            key={p}
            style={[
              styles.gridLine,
              {
                top: padY + p * innerH,
                backgroundColor: theme.stroke,
                opacity: 0.5,
              },
            ]}
          />
        ))}
        {/* SVG-style path via absolutely positioned dots for portability */}
        {points.map((p) => {
          const { x, y } = project(p);
          return (
            <View
              key={p.x}
              style={[
                styles.dot,
                {
                  left: x - 4,
                  top: y - 4,
                  backgroundColor: theme.accent,
                  borderColor: dark ? "#0F1A16" : "#FFFFFF",
                },
              ]}
            />
          );
        })}
        {/* connecting line segments (one per consecutive pair) */}
        {points.slice(0, -1).map((p, i) => {
          const a = project(p);
          const b = project(points[i + 1]!);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={`seg-${p.x}`}
              style={[
                styles.segment,
                {
                  left: a.x,
                  top: a.y - 1,
                  width: length,
                  backgroundColor: theme.accent,
                  transform: [
                    { translateX: 0 },
                    { rotate: `${angle}deg` },
                  ],
                  transformOrigin: "0% 50%",
                },
              ]}
            />
          );
        })}
        {goalY !== null ? (
          <View
            style={[
              styles.goalLine,
              { top: goalY, backgroundColor: theme.danger, opacity: 0.6 },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.lastValue,
            {
              left: Math.min(lastProjected.x + 6, W - 60),
              top: Math.max(lastProjected.y - 26, 0),
              backgroundColor: theme.accent,
            },
          ]}
        >
          <Text style={styles.lastValueText}>{formatKg(last.y)}</Text>
        </View>
      </View>
    </View>
  );
}

function WeightEntryModal({
  visible,
  theme,
  dark,
  onClose,
  onSaved,
}: {
  visible: boolean;
  theme: FitnessTheme;
  dark: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [unit] = useState<"kg" | "lb">("kg");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numeric = Number(value.replace(",", "."));
  const canSubmit = Number.isFinite(numeric) && numeric > 0;

  useEffect(() => {
    if (visible) {
      setValue("");
      setNotes("");
      setError(null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await biomaApi.createBodyMetric({
        type: "WEIGHT_KG" as BodyMetricType,
        value: numeric,
        unit,
        notes: notes.trim() || undefined,
      });
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el registro.",
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
            Registrar peso
          </Text>
          <Text style={[styles.modalSubtitle, { color: theme.muted }]}>
            Usa el mismo horario cada día para obtener una tendencia confiable.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              Peso (kg)
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              style={[
                styles.modalInput,
                { color: theme.text, borderBottomColor: theme.stroke },
              ]}
              placeholder="0.0"
              placeholderTextColor={theme.muted}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>
              Notas (opcional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[
                styles.modalInput,
                { color: theme.text, borderBottomColor: theme.stroke },
              ]}
              placeholder="Después del gym, en ayunas, etc."
              placeholderTextColor={theme.muted}
            />
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
              disabled={!canSubmit || loading}
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

function computeStats(metrics: BodyMetric[]) {
  if (metrics.length === 0) return null;
  const sorted = [...metrics].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  const values = sorted.map((m) => m.value);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const latest = sorted[sorted.length - 1]!;
  const oldest = sorted[0]!;
  const delta = latest.value - oldest.value;
  const days =
    (new Date(latest.recordedAt).getTime() -
      new Date(oldest.recordedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  const deltaLabel =
    days > 1
      ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg en ${Math.round(days)}d`
      : undefined;
  return {
    latest,
    average,
    delta,
    deltaLabel,
    goalKg: null,
  };
}

function formatKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
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
    gap: 18,
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
  rangeRow: {
    flexDirection: "row",
    gap: 8,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  rangeChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
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
  chartBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
  },
  chartSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  chartSvg: {
    width: 320,
    height: 160,
    alignSelf: "center",
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 1,
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  segment: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
  },
  goalLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 1,
  },
  lastValue: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lastValueText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
    marginTop: 6,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  entryValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
  },
  entryDate: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
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
    gap: 14,
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
