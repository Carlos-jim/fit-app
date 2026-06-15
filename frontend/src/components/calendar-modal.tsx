import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FitnessTheme } from "./fitness-ui";
import type { MealLog } from "../types/api";

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  theme: FitnessTheme;
  logs: MealLog[];
  calorieGoal: number;
}

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type DayStatus = "empty" | "progress" | "complete";

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLogDate(dateStr: string): string {
  const d = new Date(dateStr);
  return getDateKey(d);
}

export function CalendarModal({
  visible,
  onClose,
  theme,
  logs,
  calorieGoal,
}: CalendarModalProps) {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const logsByDate = useMemo(() => {
    const map = new Map<string, { calories: number; count: number }>();
    for (const log of logs) {
      const key = parseLogDate(log.createdAt);
      const existing = map.get(key);
      if (existing) {
        existing.calories += log.calories;
        existing.count += 1;
      } else {
        map.set(key, { calories: log.calories, count: 1 });
      }
    }
    return map;
  }, [logs]);

  const monthStatus = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      date: number;
      key: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      status: DayStatus;
      calories: number;
      count: number;
    }> = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const key = getDateKey(new Date(year, month - 1, d));
      const summary = logsByDate.get(key);
      days.push({
        date: d,
        key,
        isCurrentMonth: false,
        isToday: false,
        status: getStatus(summary, calorieGoal),
        calories: summary?.calories ?? 0,
        count: summary?.count ?? 0,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const key = getDateKey(new Date(year, month, d));
      const summary = logsByDate.get(key);
      const isTodayDate =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;
      days.push({
        date: d,
        key,
        isCurrentMonth: true,
        isToday: isTodayDate,
        status: getStatus(summary, calorieGoal),
        calories: summary?.calories ?? 0,
        count: summary?.count ?? 0,
      });
    }

    // Next month padding to fill 6 rows (42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const key = getDateKey(new Date(year, month + 1, d));
      const summary = logsByDate.get(key);
      days.push({
        date: d,
        key,
        isCurrentMonth: false,
        isToday: false,
        status: getStatus(summary, calorieGoal),
        calories: summary?.calories ?? 0,
        count: summary?.count ?? 0,
      });
    }

    return days;
  }, [viewDate, logsByDate, calorieGoal]);

  const changeMonth = (delta: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const statusColors = {
    empty: "#EF4444",
    progress: "#F59E0B",
    complete: "#22C55E",
  };

  const statusLabels = {
    empty: "Sin registros",
    progress: "En progreso",
    complete: "Meta cumplida",
  };

  const s = getStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={[s.overlay, { paddingTop: insets.top }]} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={16}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
            <Text style={[s.title, { color: theme.text }]}>Historial</Text>
            <View style={s.closeBtn} />
          </View>

          {/* Month navigation */}
          <View style={s.monthNav}>
            <Pressable onPress={() => changeMonth(-1)} style={s.navBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>
            <Text style={[s.monthTitle, { color: theme.text }]}>
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Text>
            <Pressable onPress={() => changeMonth(1)} style={s.navBtn} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={theme.text} />
            </Pressable>
          </View>

          {/* Day labels */}
          <View style={s.dayLabels}>
            {DAY_LABELS.map((label) => (
              <Text key={label} style={[s.dayLabel, { color: theme.muted }]}>
                {label}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={s.grid}>
            {monthStatus.map((day, index) => (
              <View key={`${day.key}-${index}`} style={s.cell}>
                <View
                  style={[
                    s.dayCell,
                    day.isToday && { backgroundColor: `${theme.accent}22` },
                  ]}
                >
                  <Text
                    style={[
                      s.dayNumber,
                      { color: day.isCurrentMonth ? theme.text : theme.muted },
                      day.isToday && { color: theme.accent, fontFamily: "Inter_700Bold" },
                    ]}
                  >
                    {day.date}
                  </Text>
                  <View
                    style={[
                      s.dot,
                      { backgroundColor: statusColors[day.status] },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {(Object.keys(statusColors) as DayStatus[]).map((status) => (
              <View key={status} style={s.legendItem}>
                <View
                  style={[s.legendDot, { backgroundColor: statusColors[status] }]}
                />
                <Text style={[s.legendText, { color: theme.muted }]}>
                  {statusLabels[status]}
                </Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={[s.summaryCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
            <View style={s.summaryRow}>
              <Ionicons name="flame-outline" size={18} color={theme.accent} />
              <Text style={[s.summaryText, { color: theme.text }]}>
                {logs.length} {logs.length === 1 ? "comida registrada" : "comidas registradas"} en total
              </Text>
            </View>
            <Text style={[s.summaryHint, { color: theme.muted }]}>
              Los colores indican si cumpliste tu meta calórica diaria.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getStatus(
  summary: { calories: number; count: number } | undefined,
  calorieGoal: number,
): DayStatus {
  if (!summary || summary.count === 0) return "empty";
  if (calorieGoal > 0 && summary.calories >= calorieGoal) return "complete";
  return "progress";
}

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 16,
      minHeight: "70%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 20,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
    },
    monthTitle: {
      fontFamily: "Manrope_700Bold",
      fontSize: 17,
    },
    dayLabels: {
      flexDirection: "row",
      marginBottom: 10,
    },
    dayLabel: {
      flex: 1,
      textAlign: "center",
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      letterSpacing: 0.5,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      padding: 3,
    },
    dayCell: {
      flex: 1,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    dayNumber: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginTop: 22,
      marginBottom: 18,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
    },
    summaryCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
      gap: 6,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    summaryText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    summaryHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
