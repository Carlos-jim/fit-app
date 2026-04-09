import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { biomaApi } from "../services/bioma-api";
import type { MealLog } from "../types/api";
import type { FitnessTheme } from "./fitness-ui";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavState =
  | { view: "days" }
  | { view: "dayMeals"; date: string; label: string; meals: MealLog[] }
  | { view: "mealDetail"; meal: MealLog; dayLabel: string };

interface DayGroup {
  date: string;
  label: string;
  totalCalories: number;
  mealCount: number;
  meals: MealLog[];
}

interface Props {
  userId: string | null;
  theme: FitnessTheme;
  mode: "day" | "night";
  onOpenCamera: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateKey: string): string {
  const today = getLocalDateKey(new Date().toISOString());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d.toISOString());
  })();

  if (dateKey === today) return "Hoy";
  if (dateKey === yesterday) return "Ayer";

  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MealHistoryScreen({ userId, theme, mode, onOpenCamera }: Props) {
  const [nav, setNav] = useState<NavState>({ view: "days" });
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      void loadLogs(userId);
    }
  }, [userId]);

  async function loadLogs(id: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await biomaApi.getLogs(id);
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }

  const dayGroups = useMemo((): DayGroup[] => {
    const map = new Map<string, MealLog[]>();
    for (const log of logs) {
      const key = getLocalDateKey(log.createdAt);
      const existing = map.get(key) ?? [];
      existing.push(log);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, meals]) => ({
        date,
        label: formatDateLabel(date),
        totalCalories: Math.round(meals.reduce((sum, m) => sum + m.calories, 0)),
        mealCount: meals.length,
        meals,
      }));
  }, [logs]);

  if (nav.view === "days") {
    return (
      <DayListView
        dayGroups={dayGroups}
        loading={loading}
        error={error}
        userId={userId}
        theme={theme}
        onOpenCamera={onOpenCamera}
        onSelectDay={(group) =>
          setNav({ view: "dayMeals", date: group.date, label: group.label, meals: group.meals })
        }
        onRetry={() => userId && void loadLogs(userId)}
      />
    );
  }

  if (nav.view === "dayMeals") {
    return (
      <DayMealsView
        label={nav.label}
        meals={nav.meals}
        theme={theme}
        onBack={() => setNav({ view: "days" })}
        onSelectMeal={(meal) =>
          setNav({ view: "mealDetail", meal, dayLabel: nav.label })
        }
      />
    );
  }

  return (
    <MealDetailView
      meal={nav.meal}
      dayLabel={nav.dayLabel}
      theme={theme}
      mode={mode}
      onBack={() =>
        setNav({
          view: "dayMeals",
          date: getLocalDateKey(nav.meal.createdAt),
          label: nav.dayLabel,
          meals: logs.filter((l) => getLocalDateKey(l.createdAt) === getLocalDateKey(nav.meal.createdAt)),
        })
      }
    />
  );
}

// ─── Day List View ────────────────────────────────────────────────────────────

function DayListView(props: {
  dayGroups: DayGroup[];
  loading: boolean;
  error: string | null;
  userId: string | null;
  theme: FitnessTheme;
  onOpenCamera: () => void;
  onSelectDay: (group: DayGroup) => void;
  onRetry: () => void;
}) {
  const { theme } = props;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerRow]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Nutricion IA</Text>
          <Text style={[styles.title, { color: theme.text }]}>Historial</Text>
        </View>
        <Pressable
          style={[styles.cameraButton, { backgroundColor: theme.accent }]}
          onPress={props.onOpenCamera}
        >
          <Ionicons name="camera" size={20} color={theme.background} />
        </Pressable>
      </View>

      {props.loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
          <Text style={[styles.mutedText, { color: theme.muted }]}>Cargando historial...</Text>
        </View>
      ) : props.error ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No se pudo cargar</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>{props.error}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={props.onRetry}
          >
            <Text style={[styles.retryButtonText, { color: theme.background }]}>Reintentar</Text>
          </Pressable>
        </View>
      ) : !props.userId ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <Ionicons name="person-circle-outline" size={40} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Perfil no conectado</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Conecta tu perfil desde la tab de Perfil para ver el historial de comidas.
          </Text>
        </View>
      ) : props.dayGroups.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <Ionicons name="nutrition-outline" size={40} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin registros aun</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Escanea tu primera comida con la camara para empezar el historial.
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={props.onOpenCamera}
          >
            <Text style={[styles.retryButtonText, { color: theme.background }]}>Escanear comida</Text>
          </Pressable>
        </View>
      ) : (
        props.dayGroups.map((group) => (
          <Pressable
            key={group.date}
            style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}
            onPress={() => props.onSelectDay(group)}
          >
            <View style={styles.dayCardContent}>
              <View style={styles.dayCardLeft}>
                <Text style={[styles.dayLabel, { color: theme.text }]}>{group.label}</Text>
                <Text style={[styles.dayMeta, { color: theme.muted }]}>
                  {group.mealCount} {group.mealCount === 1 ? "comida" : "comidas"}
                </Text>
              </View>
              <View style={styles.dayCardRight}>
                <Text style={[styles.dayCalories, { color: theme.accent }]}>
                  {group.totalCalories.toLocaleString()}
                </Text>
                <Text style={[styles.dayCaloriesUnit, { color: theme.muted }]}>kcal</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

// ─── Day Meals View ───────────────────────────────────────────────────────────

function DayMealsView(props: {
  label: string;
  meals: MealLog[];
  theme: FitnessTheme;
  onBack: () => void;
  onSelectMeal: (meal: MealLog) => void;
}) {
  const { theme } = props;
  const totalCalories = Math.round(props.meals.reduce((s, m) => s + m.calories, 0));

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backRow} onPress={props.onBack}>
        <Ionicons name="chevron-back" size={20} color={theme.accent} />
        <Text style={[styles.backText, { color: theme.accent }]}>Historial</Text>
      </Pressable>

      <Text style={[styles.title, { color: theme.text }]}>{props.label}</Text>
      <Text style={[styles.daySubtitle, { color: theme.muted }]}>
        {props.meals.length} {props.meals.length === 1 ? "comida" : "comidas"} · {totalCalories.toLocaleString()} kcal total
      </Text>

      {props.meals.map((meal) => (
        <Pressable
          key={meal.id}
          style={[styles.mealCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}
          onPress={() => props.onSelectMeal(meal)}
        >
          <View style={[styles.mealThumb, { backgroundColor: theme.cardMuted }]}>
            {meal.imageUrl ? (
              <Image source={{ uri: meal.imageUrl }} style={styles.mealThumbImage} />
            ) : (
              <Ionicons name="restaurant-outline" size={22} color={theme.muted} />
            )}
          </View>

          <View style={styles.mealInfo}>
            <Text style={[styles.mealName, { color: theme.text }]} numberOfLines={2}>
              {meal.title ?? "Comida analizada"}
            </Text>
            <Text style={[styles.mealTime, { color: theme.muted }]}>{formatTime(meal.createdAt)}</Text>
          </View>

          <View style={styles.mealCalBlock}>
            <Text style={[styles.mealCal, { color: theme.text }]}>
              {Math.round(meal.calories)}
            </Text>
            <Text style={[styles.mealCalUnit, { color: theme.muted }]}>kcal</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.muted} />
        </Pressable>
      ))}
    </View>
  );
}

// ─── Meal Detail View ─────────────────────────────────────────────────────────

function MealDetailView(props: {
  meal: MealLog;
  dayLabel: string;
  theme: FitnessTheme;
  mode: "day" | "night";
  onBack: () => void;
}) {
  const { meal, theme } = props;
  const palette = props.mode === "night" ? nightPalette : dayPalette;

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backRow} onPress={props.onBack}>
        <Ionicons name="chevron-back" size={20} color={theme.accent} />
        <Text style={[styles.backText, { color: theme.accent }]}>{props.dayLabel}</Text>
      </Pressable>

      {/* Image */}
      {meal.imageUrl ? (
        <View style={[styles.detailImageContainer, { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}>
          <Image source={{ uri: meal.imageUrl }} style={styles.detailImage} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.detailImagePlaceholder, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <Ionicons name="restaurant-outline" size={48} color={theme.muted} />
        </View>
      )}

      {/* Title + confidence */}
      <View style={styles.detailTitleRow}>
        <View style={styles.detailTitleBlock}>
          <Text style={[styles.detailEyebrow, { color: theme.accent }]}>Resultado IA</Text>
          <Text style={[styles.detailTitle, { color: theme.text }]}>
            {meal.title ?? "Comida analizada"}
          </Text>
          <Text style={[styles.detailMeta, { color: theme.muted }]}>
            {props.dayLabel} · {formatTime(meal.createdAt)}
          </Text>
        </View>
        <View style={[styles.confidencePill, { backgroundColor: palette.confidenceBg }]}>
          <Text style={[styles.confidenceText, { color: palette.confidenceText }]}>
            {meal.confidence}
          </Text>
        </View>
      </View>

      {/* Macro grid */}
      <View style={[styles.macroCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
        <Text style={[styles.macroCardTitle, { color: theme.text }]}>Macronutrientes</Text>
        <View style={styles.macroGrid}>
          <MacroBox label="Calorias" value={`${Math.round(meal.calories)}`} unit="kcal" theme={theme} accent={theme.accent} />
          <MacroBox label="Proteina" value={`${Math.round(meal.proteinGrams)}`} unit="g" theme={theme} accent="#76EFE5" />
          <MacroBox label="Carbohidratos" value={`${Math.round(meal.carbsGrams)}`} unit="g" theme={theme} accent="#E8FF54" />
          <MacroBox label="Grasas" value={`${Math.round(meal.fatGrams)}`} unit="g" theme={theme} accent="#FF9A5C" />
          {meal.fiberGrams != null && (
            <MacroBox label="Fibra" value={`${Math.round(meal.fiberGrams)}`} unit="g" theme={theme} accent={theme.muted} />
          )}
          {meal.sugarGrams != null && (
            <MacroBox label="Azucar" value={`${Math.round(meal.sugarGrams)}`} unit="g" theme={theme} accent={theme.muted} />
          )}
          {meal.sodiumMg != null && (
            <MacroBox label="Sodio" value={`${Math.round(meal.sodiumMg)}`} unit="mg" theme={theme} accent={theme.muted} />
          )}
        </View>
      </View>

      {/* Ingredients */}
      {meal.ingredients.length > 0 && (
        <View style={[styles.macroCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <Text style={[styles.macroCardTitle, { color: theme.text }]}>Ingredientes detectados</Text>
          {meal.ingredients.map((ing, i) => (
            <View
              key={`${ing.name}-${i}`}
              style={[styles.ingredientRow, { borderBottomColor: theme.stroke }]}
            >
              <View>
                <Text style={[styles.ingredientName, { color: theme.text }]}>{ing.name}</Text>
                <Text style={[styles.ingredientGrams, { color: theme.muted }]}>
                  {Math.round(ing.estimatedGrams)} g
                </Text>
              </View>
              <Text style={[styles.ingredientCal, { color: theme.text }]}>
                {Math.round(ing.calories)} kcal
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {meal.warnings.length > 0 && (
        <View style={[styles.macroCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <Text style={[styles.macroCardTitle, { color: theme.text }]}>Observaciones</Text>
          {meal.warnings.map((w, i) => (
            <Text key={i} style={[styles.warningText, { color: theme.muted }]}>
              · {w}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Macro Box ────────────────────────────────────────────────────────────────

function MacroBox(props: {
  label: string;
  value: string;
  unit: string;
  theme: FitnessTheme;
  accent: string;
}) {
  const { theme } = props;
  return (
    <View style={[styles.macroBox, { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}>
      <View style={[styles.macroAccentDot, { backgroundColor: props.accent }]} />
      <Text style={[styles.macroLabel, { color: theme.muted }]}>{props.label}</Text>
      <Text style={[styles.macroValue, { color: theme.text }]}>
        {props.value}{" "}
        <Text style={[styles.macroUnit, { color: theme.muted }]}>{props.unit}</Text>
      </Text>
    </View>
  );
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

const dayPalette = {
  confidenceBg: "#FBE7E0",
  confidenceText: "#B45F48",
};

const nightPalette = {
  confidenceBg: "#2C1B10",
  confidenceText: "#6EF3D1",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 28,
    lineHeight: 34,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  mutedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  // Day card
  dayCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  dayCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayCardLeft: {
    flex: 1,
    gap: 3,
  },
  dayLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    textTransform: "capitalize",
  },
  dayMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  dayCardRight: {
    alignItems: "flex-end",
    marginRight: 4,
  },
  dayCalories: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 20,
  },
  dayCaloriesUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  // Back row
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  backText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  daySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: -4,
    marginBottom: 4,
  },
  // Meal card
  mealCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mealThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mealThumbImage: {
    width: 60,
    height: 60,
  },
  mealInfo: {
    flex: 1,
    gap: 4,
  },
  mealName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  mealTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  mealCalBlock: {
    alignItems: "flex-end",
  },
  mealCal: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  mealCalUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  // Detail view
  detailImageContainer: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    height: 220,
  },
  detailImage: {
    width: "100%",
    height: "100%",
  },
  detailImagePlaceholder: {
    borderRadius: 22,
    borderWidth: 1,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  detailTitleBlock: {
    flex: 1,
    gap: 4,
  },
  detailEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  detailTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 24,
    lineHeight: 30,
  },
  detailMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  confidencePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  confidenceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  // Macro card
  macroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  macroCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  macroBox: {
    width: "47.5%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  macroAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  macroValue: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 20,
  },
  macroUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  // Ingredient row
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ingredientName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  ingredientGrams: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  ingredientCal: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  warningText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
});
