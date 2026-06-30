import { type ComponentProps, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import type { MealLog } from "../types/api";
import { CalendarModal } from "./calendar-modal";

const WATER_COLOR = "#3B9EE2";
const STEPS_COLOR = "#FF8C42";
const CARBS_COLOR = "#FFB5C2";
const FAT_COLOR = "#FFE5A0";
const PROTEIN_COLOR = "#B5D8FF";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface HomeScreenProps {
  theme: FitnessTheme;
  visualMode: "dark" | "light";
  fullName: string;
  todayCalories: number;
  todayMealsCount: number;
  calorieGoal: number;
  stepsGoal: number;
  currentSteps: number;
  todayMacros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  macroGoals: {
    protein: number;
    carbs: number;
    fat: number;
  };
  lastMeal: MealLog | null;
  topBestMeals: MealLog[];
  topWorstMeals: MealLog[];
  logs: MealLog[];
  waterGlasses: number;
  waterGoal: number;
  onWaterIncrement: () => void | Promise<void>;
  onWaterDecrement: () => void | Promise<void>;
  onOpenCamera: () => void;
  ambientPulse: Animated.Value;
  heroScale: Animated.Value;
  mainScrollY: Animated.Value;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getScoreColor(score: number, theme: FitnessTheme): string {
  if (score >= 70) return theme.accent;
  if (score >= 40) return theme.lime;
  return theme.danger;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMealDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  if (isToday) {
    return `Hoy · ${formatTime(dateStr)}`;
  }

  return (
    d.toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    formatTime(dateStr)
  );
}

function getWeekDays(): Array<{ label: string; day: number; isToday: boolean }> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
  const days: Array<{ label: string; day: number; isToday: boolean }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push({
      label: dayLabels[i],
      day: d.getDate(),
      isToday:
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate(),
    });
  }

  return days;
}

function getMonthYear(): string {
  return new Date().toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

export function HomeScreen(props: HomeScreenProps) {
  const {
    theme,
    visualMode,
    fullName,
    todayCalories,
    todayMealsCount,
    calorieGoal,
    stepsGoal,
    currentSteps,
    todayMacros,
    macroGoals,
    lastMeal,
    topBestMeals,
    topWorstMeals,
    logs,
    waterGlasses,
    waterGoal,
    onWaterIncrement,
    onWaterDecrement,
    onOpenCamera,
    ambientPulse,
    heroScale,
    mainScrollY,
  } = props;

  const isDark = visualMode === "dark";
  const panelColor = isDark ? "#0F1513" : "#FBF8F1";
  const panelColorAlt = isDark ? "#121B18" : "#F2ECE1";
  const panelStroke = isDark ? "#1D2A25" : "#E8DED0";
  const mutedText = isDark ? "#8AA199" : "#786F65";
  const softText = isDark ? "#587067" : "#A3988B";
  const strongText = isDark ? "#F5FBF8" : "#17130F";
  const emptyBg = isDark ? "#0D1410" : "#F6F2EA";
  const emptyStroke = isDark ? "#1A2820" : "#E0D9CE";
  const waterEmpty = isDark ? "#1E3030" : "#D4EEF4";
  const waterBtnBg = isDark ? "#0D2030" : "#D6EFF9";
  const waterBtnStroke = isDark ? "#1A3A4E" : "#BDE4F5";
  const waterCardStroke = isDark ? "#0F2A38" : "#BDE4F5";

  const weekDays = useMemo(() => getWeekDays(), []);
  const monthYear = useMemo(() => getMonthYear(), []);

  const calorieProgress = calorieGoal > 0 ? todayCalories / calorieGoal : 0;
  const stepsProgress = stepsGoal > 0 ? currentSteps / stepsGoal : 0;
  const waterProgress = waterGoal > 0 ? waterGlasses / waterGoal : 0;

  // Per-meal calorie estimates use 25 % breakfast / 35 % lunch / 30 % dinner
  // splits of the user's daily target. Replace the previous hardcoded
  // "456 - 512 kcal" copy that had no relation to the real user.
  const breakfastKcal = Math.round(calorieGoal * 0.25);
  const lunchKcal = Math.round(calorieGoal * 0.35);
  const formatRange = (kcal: number) => {
    const low = Math.max(0, Math.round(kcal * 0.85));
    const high = Math.round(kcal * 1.15);
    return `${low} - ${high} kcal`;
  };

  const carbsProgress = macroGoals.carbs > 0 ? todayMacros.carbs / macroGoals.carbs : 0;
  const fatProgress = macroGoals.fat > 0 ? todayMacros.fat / macroGoals.fat : 0;
  const proteinProgress = macroGoals.protein > 0 ? todayMacros.protein / macroGoals.protein : 0;

  const totalMacroCalories =
    todayMacros.carbs * 4 + todayMacros.protein * 4 + todayMacros.fat * 9;
  const carbsPercent = totalMacroCalories > 0 ? Math.round((todayMacros.carbs * 4 / totalMacroCalories) * 100) : 0;
  const fatPercent = totalMacroCalories > 0 ? Math.round((todayMacros.fat * 9 / totalMacroCalories) * 100) : 0;
  const proteinPercent = totalMacroCalories > 0 ? Math.round((todayMacros.protein * 4 / totalMacroCalories) * 100) : 0;

  const heroGradient: readonly [string, string, string] = isDark
    ? ["#0A2E1F", "#0D3D28", "#104D32"]
    : ["#C8F7E4", "#A8F0D4", "#88E8C4"];

  const heroAuraPrimary = isDark
    ? "rgba(118, 239, 229, 0.14)"
    : "rgba(0, 200, 151, 0.12)";
  const heroAuraSecondary = isDark
    ? "rgba(232, 255, 84, 0.11)"
    : "rgba(232, 255, 84, 0.10)";

  const ringBg = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
  const ringTrackColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";

  const smallCardBg = isDark ? "#111B17" : "#FFFFFF";
  const smallCardStroke = isDark ? "#1D2A25" : "#E8DED0";

  const calendarBg = isDark ? "#0F1513" : "#FFFFFF";
  const calendarDayBg = isDark ? "#1A2820" : "#F0ECE5";
  const calendarTodayBg = theme.accent;

  const mealCardBg = isDark ? "#111B17" : "#FFFFFF";
  const mealCardStroke = isDark ? "#1D2A25" : "#E8DED0";

  const intakeCardBg = isDark ? "#0A2E1F" : "#E8F8EE";
  const intakeCardStroke = isDark ? "#1A4A35" : "#C8E8D5";

  const nutritionCardBg = isDark ? "#111B17" : "#FFFFFF";
  const nutritionCardStroke = isDark ? "#1D2A25" : "#E8DED0";

  const firstName = fullName.trim().split(" ")[0] || "Bioma";

  const today = new Date();
  const currentDayOfWeek = today.getDay() === 0 ? 6 : today.getDay();

  const [calendarVisible, setCalendarVisible] = useState(false);

  return (
    <View style={styles.root}>
      {/* ────────────────── Greeting Header ─────────────────── */}
      <Animated.View
        style={[
          styles.greetingHeader,
          {
            transform: [
              {
                translateY: mainScrollY.interpolate({
                  inputRange: [0, 60],
                  outputRange: [0, -10],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.greetingLeft}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.accent }]}>
            <Text style={[styles.avatarText, { color: isDark ? "#050505" : "#FFFFFF" }]}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.greetingTextWrap}>
            <Text style={[styles.greetingLabel, { color: mutedText }]}>
              {getGreeting()}!
            </Text>
            <Text style={[styles.greetingName, { color: strongText }]}>
              {fullName.trim() || "Bioma"}
            </Text>
          </View>
        </View>
        <View style={styles.greetingIcons}>
          <Pressable
            style={[styles.iconButton, { backgroundColor: panelColor }]}
            onPress={() => setCalendarVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={mutedText} />
          </Pressable>
          <Pressable style={[styles.iconButton, { backgroundColor: panelColor }]}>
            <Ionicons name="notifications-outline" size={20} color={mutedText} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ─────────────────── Daily Intake Card ────────────────── */}
      <Animated.View
        style={[
          styles.intakeCard,
          {
            backgroundColor: intakeCardBg,
            borderColor: intakeCardStroke,
            transform: [
              { scale: heroScale },
              {
                translateY: ambientPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.intakeHeader}>
          <View style={styles.intakeLabelRow}>
            <Ionicons name="flash-outline" size={16} color={isDark ? "#FFFFFF" : "#0A2E1F"} />
            <Text style={[styles.intakeLabel, { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(10,46,31,0.7)" }]}>
              Ingreso diario
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(10,46,31,0.4)"} />
        </View>

        <View style={styles.intakeContentRow}>
          <View style={styles.intakeTextSection}>
            <Text style={[styles.intakePercentage, { color: isDark ? "#FFFFFF" : "#0A2E1F" }]}>
              {Math.round(calorieProgress * 100)}%
            </Text>
          </View>

          <View style={styles.intakeRingWrap}>
            <View style={[styles.intakeRing, { backgroundColor: ringBg }]}>
              <View
                style={[
                  styles.intakeRingFill,
                  {
                    width: `${Math.min(calorieProgress, 1) * 100}%`,
                    backgroundColor: isDark ? "#FFFFFF" : "#0A2E1F",
                  },
                ]}
              />
              <View style={styles.intakeRingInner}>
                <Text style={[styles.intakeRingValue, { color: isDark ? "#FFFFFF" : "#0A2E1F" }]}>
                  {todayCalories}
                </Text>
                <Text style={[styles.intakeRingUnit, { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(10,46,31,0.6)" }]}>
                  {calorieGoal}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ─────────────────── Steps & Water Cards ──────────────── */}
      <View style={styles.smallCardsRow}>
        <Animated.View
          style={[
            styles.smallCard,
            {
              backgroundColor: smallCardBg,
              borderColor: smallCardStroke,
              opacity: mainScrollY.interpolate({
                inputRange: [0, 100, 200],
                outputRange: [0.7, 0.9, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: mainScrollY.interpolate({
                    inputRange: [0, 120],
                    outputRange: [20, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.smallCardIconWrap, { backgroundColor: `${STEPS_COLOR}18` }]}>
            <Ionicons name="flame" size={22} color={STEPS_COLOR} />
          </View>
          <Text style={[styles.smallCardLabel, { color: mutedText }]}>
            Pasos para caminar
          </Text>
          <Text style={[styles.smallCardValue, { color: strongText }]}>
            {Math.max(0, stepsGoal - currentSteps).toLocaleString()}{" "}
            <Text style={[styles.smallCardUnit, { color: mutedText }]}>pasos</Text>
          </Text>
          <View style={[styles.smallProgressTrack, { backgroundColor: ringTrackColor }]}>
            <View
              style={[
                styles.smallProgressFill,
                {
                  width: `${Math.min(stepsProgress, 1) * 100}%`,
                  backgroundColor: STEPS_COLOR,
                },
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.smallCard,
            {
              backgroundColor: smallCardBg,
              borderColor: smallCardStroke,
              opacity: mainScrollY.interpolate({
                inputRange: [0, 100, 200],
                outputRange: [0.7, 0.9, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: mainScrollY.interpolate({
                    inputRange: [0, 120],
                    outputRange: [20, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.smallCardIconWrap, { backgroundColor: `${WATER_COLOR}18` }]}>
            <Ionicons name="water" size={22} color={WATER_COLOR} />
          </View>
          <Text style={[styles.smallCardLabel, { color: mutedText }]}>
            Beber Agua
          </Text>
          <Text style={[styles.smallCardValue, { color: strongText }]}>
            {waterGlasses}{" "}
            <Text style={[styles.smallCardUnit, { color: mutedText }]}>vasos</Text>
          </Text>
          <View style={[styles.smallProgressTrack, { backgroundColor: ringTrackColor }]}>
            <View
              style={[
                styles.smallProgressFill,
                {
                  width: `${Math.min(waterProgress, 1) * 100}%`,
                  backgroundColor: WATER_COLOR,
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* ─────────────────── Nutrition Info Card ──────────────── */}
      <Animated.View
        style={[
          styles.nutritionCard,
          {
            backgroundColor: nutritionCardBg,
            borderColor: nutritionCardStroke,
            opacity: mainScrollY.interpolate({
              inputRange: [60, 160, 280],
              outputRange: [0.6, 0.85, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: mainScrollY.interpolate({
                  inputRange: [60, 200],
                  outputRange: [24, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.nutritionHeader}>
          <View style={styles.nutritionTitleRow}>
            <Ionicons name="pie-chart-outline" size={18} color={mutedText} />
            <Text style={[styles.nutritionTitle, { color: strongText }]}>
              Nutricion
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={mutedText} />
        </View>

        <View style={styles.macroList}>
          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Text style={[styles.macroLabel, { color: mutedText }]}>
                Carbs
              </Text>
              <Text style={[styles.macroPercentage, { color: strongText }]}>
                {carbsPercent}%
              </Text>
            </View>
            <View style={styles.macroBarWrap}>
              <View style={[styles.macroBar, { backgroundColor: ringTrackColor }]}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${Math.min(carbsProgress, 1) * 100}%`,
                      backgroundColor: CARBS_COLOR,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.macroValue, { color: strongText }]}>
              {todayMacros.carbs} / {macroGoals.carbs} g
            </Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Text style={[styles.macroLabel, { color: mutedText }]}>
                Fat
              </Text>
              <Text style={[styles.macroPercentage, { color: strongText }]}>
                {fatPercent}%
              </Text>
            </View>
            <View style={styles.macroBarWrap}>
              <View style={[styles.macroBar, { backgroundColor: ringTrackColor }]}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${Math.min(fatProgress, 1) * 100}%`,
                      backgroundColor: FAT_COLOR,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.macroValue, { color: strongText }]}>
              {todayMacros.fat} / {macroGoals.fat} g
            </Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInfo}>
              <Text style={[styles.macroLabel, { color: mutedText }]}>
                Protein
              </Text>
              <Text style={[styles.macroPercentage, { color: strongText }]}>
                {proteinPercent}%
              </Text>
            </View>
            <View style={styles.macroBarWrap}>
              <View style={[styles.macroBar, { backgroundColor: ringTrackColor }]}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${Math.min(proteinProgress, 1) * 100}%`,
                      backgroundColor: PROTEIN_COLOR,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.macroValue, { color: strongText }]}>
              {todayMacros.protein} / {macroGoals.protein} g
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ─────────────────── Calendar Strip ───────────────────── */}
      <Animated.View
        style={[
          styles.calendarCard,
          {
            backgroundColor: calendarBg,
            borderColor: panelStroke,
            opacity: mainScrollY.interpolate({
              inputRange: [120, 220, 340],
              outputRange: [0.55, 0.82, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: mainScrollY.interpolate({
                  inputRange: [120, 260],
                  outputRange: [28, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.calendarHeader}>
          <Text style={[styles.calendarTitle, { color: strongText }]}>
            {monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}
          </Text>
          <View style={styles.calendarArrows}>
            <Pressable style={[styles.calendarArrow, { backgroundColor: panelColorAlt }]}>
              <Ionicons name="chevron-back" size={16} color={mutedText} />
            </Pressable>
            <Pressable style={[styles.calendarArrow, { backgroundColor: panelColorAlt }]}>
              <Ionicons name="chevron-forward" size={16} color={mutedText} />
            </Pressable>
          </View>
        </View>

        <View style={styles.calendarDaysRow}>
          {weekDays.map((item, index) => (
            <View key={index} style={styles.calendarDayColumn}>
              <Text style={[styles.calendarDayLabel, { color: mutedText }]}>
                {item.label}
              </Text>
              <View
                style={[
                  styles.calendarDayCircle,
                  item.isToday && { backgroundColor: calendarTodayBg },
                  !item.isToday && { backgroundColor: "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayNumber,
                    { color: item.isToday ? "#FFFFFF" : strongText },
                  ]}
                >
                  {String(item.day).padStart(2, "0")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ─────────────────── Meal Entries ────────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [180, 300, 420],
            outputRange: [0.5, 0.85, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [180, 340],
                outputRange: [32, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <View
          style={[
            styles.mealCard,
            { backgroundColor: mealCardBg, borderColor: mealCardStroke },
          ]}
        >
          <View style={styles.mealHeaderRow}>
            <View style={styles.mealTitleRow}>
              <Ionicons name="flame" size={18} color={STEPS_COLOR} />
              <Text style={[styles.mealTitle, { color: strongText }]}>
                Desayuno
              </Text>
            </View>
            <Text style={[styles.mealCalories, { color: mutedText }]}>
              {formatRange(breakfastKcal)}
            </Text>
          </View>
          <View style={styles.mealImagesRow}>
            <View style={[styles.mealImagePlaceholder, { backgroundColor: panelColorAlt }]}>
              <Ionicons name="restaurant-outline" size={28} color={mutedText} />
            </View>
            <View style={[styles.mealImagePlaceholder, { backgroundColor: panelColorAlt }]}>
              <Ionicons name="restaurant-outline" size={28} color={mutedText} />
            </View>
            <Pressable
              style={[styles.mealAddButton, { backgroundColor: `${theme.accent}18` }]}
              onPress={onOpenCamera}
            >
              <Ionicons name="add" size={22} color={theme.accent} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [240, 360, 480],
            outputRange: [0.45, 0.82, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [240, 400],
                outputRange: [36, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <View
          style={[
            styles.mealCard,
            { backgroundColor: mealCardBg, borderColor: mealCardStroke },
          ]}
        >
          <View style={styles.mealHeaderRow}>
            <View style={styles.mealTitleRow}>
              <Ionicons name="flame" size={18} color={STEPS_COLOR} />
              <Text style={[styles.mealTitle, { color: strongText }]}>
                Hora del almuerzo
              </Text>
            </View>
            <Text style={[styles.mealCalories, { color: mutedText }]}>
              {formatRange(lunchKcal)}
            </Text>
          </View>
          <View style={styles.mealImagesRow}>
            <View style={[styles.mealImagePlaceholder, { backgroundColor: panelColorAlt }]}>
              <Ionicons name="restaurant-outline" size={28} color={mutedText} />
            </View>
            <View style={[styles.mealImagePlaceholder, { backgroundColor: panelColorAlt }]}>
              <Ionicons name="restaurant-outline" size={28} color={mutedText} />
            </View>
            <Pressable
              style={[styles.mealAddButton, { backgroundColor: `${theme.accent}18` }]}
              onPress={onOpenCamera}
            >
              <Ionicons name="add" size={22} color={theme.accent} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* ─────────────────── Water Tracker ────────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [340, 480, 620],
            outputRange: [0.45, 0.82, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [340, 560],
                outputRange: [44, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={
            isDark
              ? ["#061318", "#0A1D26", "#06111A"]
              : ["#EBF7FF", "#F2FAFF", "#EBFBFF"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: waterCardStroke }]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.waterGlow,
              {
                backgroundColor: isDark
                  ? "rgba(59, 158, 226, 0.08)"
                  : "rgba(59, 158, 226, 0.14)",
              },
            ]}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: WATER_COLOR }]}>
              HIDRATACION
            </Text>
            <View
              style={[
                styles.sectionIconBadge,
                { backgroundColor: `${WATER_COLOR}20` },
              ]}
            >
              <Ionicons name="water-outline" size={14} color={WATER_COLOR} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: strongText }]}>
            Vasos de agua hoy
          </Text>

          <View style={styles.waterDropsRow}>
            {Array.from({ length: waterGoal }, (_, i) => (
              <View key={i}>
                <Ionicons
                  name={i < waterGlasses ? "water" : "water-outline"}
                  size={30}
                  color={i < waterGlasses ? WATER_COLOR : waterEmpty}
                />
              </View>
            ))}
          </View>

          <View style={styles.waterControls}>
            <Pressable
              style={[
                styles.waterButton,
                {
                  backgroundColor: waterBtnBg,
                  borderColor: waterBtnStroke,
                },
              ]}
              onPress={onWaterDecrement}
              accessibilityLabel="Quitar un vaso"
            >
              <Ionicons name="remove" size={22} color={WATER_COLOR} />
            </Pressable>

            <View style={styles.waterCountBlock}>
              <Text style={[styles.waterCount, { color: WATER_COLOR }]}>
                {waterGlasses}
              </Text>
              <Text style={[styles.waterCountLabel, { color: mutedText }]}>
                / {waterGoal} vasos
              </Text>
            </View>

            <Pressable
              style={[
                styles.waterButton,
                {
                  backgroundColor: waterBtnBg,
                  borderColor: waterBtnStroke,
                },
              ]}
              onPress={onWaterIncrement}
              accessibilityLabel="Agregar un vaso"
            >
              <Ionicons name="add" size={22} color={WATER_COLOR} />
            </Pressable>
          </View>

          <View
            style={[styles.waterTrack, { backgroundColor: waterBtnBg }]}
          >
            <View
              style={[
                styles.waterFill,
                {
                  width: `${Math.min(waterGlasses / waterGoal, 1) * 100}%`,
                  backgroundColor: WATER_COLOR,
                },
              ]}
            />
          </View>

          <Text style={[styles.waterHint, { color: mutedText }]}>
            {waterGlasses >= waterGoal
              ? "Hidratacion completa del dia. ¡Excelente!"
              : `Te faltan ${waterGoal - waterGlasses} vaso${waterGoal - waterGlasses !== 1 ? "s" : ""} para tu meta diaria`}
          </Text>
        </LinearGradient>
      </Animated.View>

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        theme={theme}
        logs={logs}
        calorieGoal={calorieGoal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },

  // ── Greeting Header ────────────────────────────────────────
  greetingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  greetingTextWrap: {
    gap: 2,
  },
  greetingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  greetingName: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  greetingIcons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Daily Intake Card ──────────────────────────────────────
  intakeCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: "hidden",
  },
  intakeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  intakeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  intakeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  intakeContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intakeTextSection: {
    flex: 1,
  },
  intakePercentage: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 56,
    lineHeight: 64,
  },
  intakeRingWrap: {
    flexShrink: 0,
    marginLeft: 16,
  },
  intakeRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  intakeRingFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 50,
  },
  intakeRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  intakeRingValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    lineHeight: 26,
  },
  intakeRingUnit: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  // ── Small Cards Row ─────────────────────────────────────────
  smallCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  smallCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  smallCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallCardLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  smallCardValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 24,
    lineHeight: 28,
  },
  smallCardUnit: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  smallProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  smallProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  // ── Nutrition Card ─────────────────────────────────────────
  nutritionCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
  },
  nutritionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nutritionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nutritionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  macroList: {
    gap: 14,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  macroInfo: {
    width: 70,
    gap: 2,
  },
  macroLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  macroPercentage: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  macroBarWrap: {
    flex: 1,
  },
  macroBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  macroValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    width: 90,
    textAlign: "right",
  },

  // ── Calendar Strip ──────────────────────────────────────────
  calendarCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  calendarArrows: {
    flexDirection: "row",
    gap: 6,
  },
  calendarArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarDayColumn: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  calendarDayLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  calendarDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },

  // ── Meal Cards ──────────────────────────────────────────────
  mealCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  mealHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  mealCalories: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  mealImagesRow: {
    flexDirection: "row",
    gap: 10,
  },
  mealImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mealAddButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Water Section ──────────────────────────────────────────
  sectionCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    lineHeight: 26,
  },
  waterGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  waterDropsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  waterControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginTop: 4,
  },
  waterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  waterCountBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  waterCount: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 48,
    lineHeight: 52,
  },
  waterCountLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  waterTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  waterFill: {
    height: "100%",
    borderRadius: 999,
  },
  waterHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
