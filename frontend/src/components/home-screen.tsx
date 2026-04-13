import { type ComponentProps, useRef, useEffect } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import type { MealLog } from "../types/api";

// ─── Constants ────────────────────────────────────────────────────
const WATER_COLOR = "#3B9EE2";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

// ─── Props ────────────────────────────────────────────────────────
export interface HomeScreenProps {
  theme: FitnessTheme;
  visualMode: "dark" | "light";
  todayCalories: number;
  todayMealsCount: number;
  lastMeal: MealLog | null;
  topBestMeals: MealLog[];
  topWorstMeals: MealLog[];
  waterGlasses: number;
  waterGoal: number;
  onWaterIncrement: () => void;
  onWaterDecrement: () => void;
  onOpenCamera: () => void;
  ambientPulse: Animated.Value;
  heroScale: Animated.Value;
  mainScrollY: Animated.Value;
}

// ─── Helpers ──────────────────────────────────────────────────────
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

// ─── Root Component ───────────────────────────────────────────────
export function HomeScreen(props: HomeScreenProps) {
  const {
    theme,
    visualMode,
    todayCalories,
    todayMealsCount,
    lastMeal,
    topBestMeals,
    topWorstMeals,
    waterGlasses,
    waterGoal,
    onWaterIncrement,
    onWaterDecrement,
    onOpenCamera,
    ambientPulse,
    heroScale,
    mainScrollY,
  } = props;

  // ─── Theme tokens ───────────────────────────────────────────────
  const isDark = visualMode === "dark";
  const heroGradient: readonly [string, string, string] = isDark
    ? ["#07100D", "#0D1815", "#101D19"]
    : ["#FFFDF8", "#F6EFE4", "#EEE4D6"];
  const panelColor = isDark ? "#0F1513" : "#FBF8F1";
  const panelColorAlt = isDark ? "#121B18" : "#F2ECE1";
  const panelStroke = isDark ? "#1D2A25" : "#E8DED0";
  const mutedText = isDark ? "#8AA199" : "#786F65";
  const softText = isDark ? "#587067" : "#A3988B";
  const strongText = isDark ? "#F5FBF8" : "#17130F";
  const heroPillBg = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(23,19,15,0.04)";
  const heroPillText = isDark ? "#F4FBF8" : "#2A241F";
  const heroAuraPrimary = isDark
    ? "rgba(118, 239, 229, 0.14)"
    : "rgba(0, 200, 151, 0.12)";
  const heroAuraSecondary = isDark
    ? "rgba(232, 255, 84, 0.11)"
    : "rgba(232, 255, 84, 0.10)";
  const heroEyebrow = isDark ? "#8FACA1" : "#897E71";
  const heroTitle = isDark ? "#FCFFFD" : "#1A1511";
  const heroDivider = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(23,19,15,0.08)";
  const heroMiniValue = isDark ? "#FFFFFF" : "#17130F";
  const heroMiniLabel = isDark ? "#8BA79C" : "#8C8174";
  const emptyBg = isDark ? "#0D1410" : "#F6F2EA";
  const emptyStroke = isDark ? "#1A2820" : "#E0D9CE";
  const waterEmpty = isDark ? "#1E3030" : "#D4EEF4";
  const waterBtnBg = isDark ? "#0D2030" : "#D6EFF9";
  const waterBtnStroke = isDark ? "#1A3A4E" : "#BDE4F5";
  const waterCardStroke = isDark ? "#0F2A38" : "#BDE4F5";

  const todayDateStr = new Date().toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const heroButtonTextColor = isDark ? "#07110E" : "#FFFFFF";

  return (
    <View style={styles.root}>
      {/* ─────────────────────── Hero Card ──────────────────────── */}
      <Animated.View
        style={[
          styles.heroWrap,
          {
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
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Aura blobs */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroAuraPrimary,
              { backgroundColor: heroAuraPrimary },
              {
                transform: [
                  {
                    scale: ambientPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1.08],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroAuraSecondary,
              { backgroundColor: heroAuraSecondary },
              {
                transform: [
                  {
                    translateY: ambientPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, -10],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Top pills */}
          <View style={styles.heroTopRow}>
            <View style={[styles.heroPill, { backgroundColor: heroPillBg }]}>
              <Text style={[styles.heroPillText, { color: heroPillText }]}>
                Comidas del día
              </Text>
            </View>
            <View style={[styles.heroPill, { backgroundColor: heroPillBg }]}>
              <Text style={[styles.heroPillText, { color: heroPillText }]}>
                {todayDateStr}
              </Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.heroHeading}>
            <Text style={[styles.heroEyebrow, { color: heroEyebrow }]}>
              TU NUTRICIÓN HOY
            </Text>
            <Text style={[styles.heroTitle, { color: heroTitle }]}>
              {todayMealsCount > 0
                ? `${todayMealsCount} comida${todayMealsCount !== 1 ? "s" : ""} registrada${todayMealsCount !== 1 ? "s" : ""}.`
                : "Empieza registrando tu primera comida."}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: heroMiniValue }]}>
                {todayCalories || 0}
              </Text>
              <Text style={[styles.heroStatLabel, { color: heroMiniLabel }]}>
                KCAL HOY
              </Text>
            </View>
            <View
              style={[
                styles.heroStatDivider,
                { backgroundColor: heroDivider },
              ]}
            />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: heroMiniValue }]}>
                {todayMealsCount}
              </Text>
              <Text style={[styles.heroStatLabel, { color: heroMiniLabel }]}>
                COMIDAS
              </Text>
            </View>
            <View
              style={[
                styles.heroStatDivider,
                { backgroundColor: heroDivider },
              ]}
            />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: WATER_COLOR }]}>
                {waterGlasses}
              </Text>
              <Text style={[styles.heroStatLabel, { color: heroMiniLabel }]}>
                VASOS AGUA
              </Text>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            style={[styles.heroButton, { backgroundColor: theme.accent }]}
            onPress={onOpenCamera}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={heroButtonTextColor}
            />
            <Text
              style={[styles.heroButtonText, { color: heroButtonTextColor }]}
            >
              Registrar comida
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      {/* ─────────────────── Última comida ──────────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [0, 80, 180],
            outputRange: [0.72, 0.9, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [0, 160],
                outputRange: [28, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={
            isDark ? ["#111917", "#0D1412"] : ["#FFFFFF", "#F6F1E8"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sectionCard, { borderColor: panelStroke }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
              ÚLTIMA COMIDA
            </Text>
            <View
              style={[
                styles.sectionIconBadge,
                { backgroundColor: `${theme.accent}18` },
              ]}
            >
              <Ionicons name="time-outline" size={14} color={theme.accent} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: strongText }]}>
            Último registro
          </Text>

          {lastMeal != null ? (
            <LastMealContent
              meal={lastMeal}
              theme={theme}
              isDark={isDark}
              strongText={strongText}
              mutedText={mutedText}
              softText={softText}
              panelColorAlt={panelColorAlt}
              panelStroke={panelStroke}
            />
          ) : (
            <EmptyState
              icon="restaurant-outline"
              message="Aún no hay comidas registradas. ¡Escanea tu primera comida!"
              emptyBg={emptyBg}
              emptyStroke={emptyStroke}
              mutedText={mutedText}
              theme={theme}
            />
          )}
        </LinearGradient>
      </Animated.View>

      {/* ─────────────────── Top 3 mejor score ──────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [80, 200, 340],
            outputRange: [0.55, 0.88, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [80, 300],
                outputRange: [36, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: panelColor, borderColor: panelStroke },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
              MEJORES COMIDAS
            </Text>
            <View
              style={[
                styles.sectionIconBadge,
                { backgroundColor: `${theme.accent}18` },
              ]}
            >
              <Ionicons
                name="trophy-outline"
                size={14}
                color={theme.accent}
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: strongText }]}>
            Top 3 con mejor score
          </Text>

          {topBestMeals.length > 0 ? (
            <View style={styles.rankList}>
              {topBestMeals.map((meal, index) => (
                <MealRankRow
                  key={meal.id}
                  rank={index + 1}
                  meal={meal}
                  theme={theme}
                  strongText={strongText}
                  mutedText={mutedText}
                  panelColorAlt={panelColorAlt}
                  panelStroke={panelStroke}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="trophy-outline"
              message="Registra comidas con análisis IA para ver tu ranking de mejores opciones."
              emptyBg={emptyBg}
              emptyStroke={emptyStroke}
              mutedText={mutedText}
              theme={theme}
            />
          )}
        </View>
      </Animated.View>

      {/* ─────────────────── Top 3 peor score ───────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [180, 320, 460],
            outputRange: [0.48, 0.82, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [180, 400],
                outputRange: [40, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: panelColor, borderColor: panelStroke },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.danger }]}>
              PARA MEJORAR
            </Text>
            <View
              style={[
                styles.sectionIconBadge,
                { backgroundColor: `${theme.danger}18` },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={14}
                color={theme.danger}
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: strongText }]}>
            Top 3 con peor score
          </Text>

          {topWorstMeals.length > 0 ? (
            <View style={styles.rankList}>
              {topWorstMeals.map((meal, index) => (
                <MealRankRow
                  key={meal.id}
                  rank={index + 1}
                  meal={meal}
                  theme={theme}
                  strongText={strongText}
                  mutedText={mutedText}
                  panelColorAlt={panelColorAlt}
                  panelStroke={panelStroke}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="warning-outline"
              message="Aún no hay datos suficientes. Registra más comidas para ver tus áreas de mejora."
              emptyBg={emptyBg}
              emptyStroke={emptyStroke}
              mutedText={mutedText}
              theme={theme}
            />
          )}
        </View>
      </Animated.View>

      {/* ─────────────────── Tracker de agua ────────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [280, 420, 560],
            outputRange: [0.45, 0.82, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [280, 500],
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
          {/* Soft water glow */}
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
              HIDRATACIÓN
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

          {/* Drop icons */}
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

          {/* Controls */}
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

          {/* Progress track */}
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
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function LastMealContent(props: {
  meal: MealLog;
  theme: FitnessTheme;
  isDark: boolean;
  strongText: string;
  mutedText: string;
  softText: string;
  panelColorAlt: string;
  panelStroke: string;
}) {
  const {
    meal,
    theme,
    isDark,
    strongText,
    mutedText,
    panelColorAlt,
    panelStroke,
  } = props;

  return (
    <View style={styles.lastMealContent}>
      {meal.imageUrl != null ? (
        <Image
          source={{ uri: meal.imageUrl }}
          style={styles.lastMealImage}
          resizeMode="cover"
          accessibilityLabel={meal.title ?? "Foto de la comida"}
        />
      ) : null}

      <View style={styles.lastMealBody}>
        <View style={styles.lastMealTopRow}>
          <Text
            style={[styles.lastMealTitle, { color: strongText }]}
            numberOfLines={2}
          >
            {meal.title ?? "Comida registrada"}
          </Text>
          <View
            style={[
              styles.lastMealCalorieBadge,
              { backgroundColor: `${theme.accent}18` },
            ]}
          >
            <Text
              style={[styles.lastMealCalorieText, { color: theme.accent }]}
            >
              {Math.round(meal.calories)} kcal
            </Text>
          </View>
        </View>

        <Text style={[styles.lastMealTime, { color: mutedText }]}>
          {formatMealDate(meal.createdAt)}
        </Text>

        {/* Macros strip */}
        <View
          style={[
            styles.lastMealMacros,
            {
              backgroundColor: panelColorAlt,
              borderColor: panelStroke,
            },
          ]}
        >
          <MacroPill
            label="Prot."
            value={Math.round(meal.proteinGrams)}
            unit="g"
            color={theme.accent}
            mutedText={mutedText}
            strongText={strongText}
          />
          <View
            style={[
              styles.macroDivider,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(23,19,15,0.06)",
              },
            ]}
          />
          <MacroPill
            label="Carbs"
            value={Math.round(meal.carbsGrams)}
            unit="g"
            color="#6688FF"
            mutedText={mutedText}
            strongText={strongText}
          />
          <View
            style={[
              styles.macroDivider,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(23,19,15,0.06)",
              },
            ]}
          />
          <MacroPill
            label="Grasas"
            value={Math.round(meal.fatGrams)}
            unit="g"
            color={theme.lime}
            mutedText={mutedText}
            strongText={strongText}
          />
        </View>

        {/* AI score badge if available */}
        {meal.aiSuggestion != null ? (
          <View style={styles.lastMealScoreRow}>
            <View
              style={[
                styles.lastMealScoreBadge,
                {
                  backgroundColor: `${getScoreColor(meal.aiSuggestion.healthScore, theme)}18`,
                },
              ]}
            >
              <Ionicons
                name={
                  meal.aiSuggestion.isHealthy
                    ? "checkmark-circle-outline"
                    : "alert-circle-outline"
                }
                size={14}
                color={getScoreColor(meal.aiSuggestion.healthScore, theme)}
              />
              <Text
                style={[
                  styles.lastMealScoreText,
                  {
                    color: getScoreColor(
                      meal.aiSuggestion.healthScore,
                      theme,
                    ),
                  },
                ]}
              >
                Score IA: {meal.aiSuggestion.healthScore}/100
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MacroPill(props: {
  label: string;
  value: number;
  unit: string;
  color: string;
  mutedText: string;
  strongText: string;
}) {
  const { label, value, unit, color, mutedText, strongText } = props;
  return (
    <View style={styles.macroPill}>
      <Text style={[styles.macroLabel, { color: mutedText }]}>{label}</Text>
      <Text style={[styles.macroValue, { color: strongText }]}>
        {value}
        <Text style={[styles.macroUnit, { color: color }]}>{unit}</Text>
      </Text>
    </View>
  );
}

function MealRankRow(props: {
  rank: number;
  meal: MealLog;
  theme: FitnessTheme;
  strongText: string;
  mutedText: string;
  panelColorAlt: string;
  panelStroke: string;
}) {
  const { rank, meal, theme, strongText, mutedText, panelColorAlt, panelStroke } =
    props;
  const score = meal.aiSuggestion!.healthScore;
  const scoreColor = getScoreColor(score, theme);

  return (
    <View
      style={[
        styles.rankRow,
        { backgroundColor: panelColorAlt, borderColor: panelStroke },
      ]}
    >
      {/* Rank badge */}
      <View
        style={[styles.rankBadge, { backgroundColor: `${scoreColor}20` }]}
      >
        <Text style={[styles.rankNumber, { color: scoreColor }]}>
          {rank}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.rankInfo}>
        <Text
          style={[styles.rankMealName, { color: strongText }]}
          numberOfLines={1}
        >
          {meal.title ?? "Comida registrada"}
        </Text>
        <Text style={[styles.rankMealCalories, { color: mutedText }]}>
          {Math.round(meal.calories)} kcal
        </Text>
      </View>

      {/* Score */}
      <View
        style={[
          styles.rankScoreBadge,
          {
            backgroundColor: `${scoreColor}18`,
            borderColor: `${scoreColor}30`,
          },
        ]}
      >
        <Text style={[styles.rankScoreText, { color: scoreColor }]}>
          {score}
        </Text>
        <Text style={[styles.rankScoreUnit, { color: `${scoreColor}AA` }]}>
          /100
        </Text>
      </View>
    </View>
  );
}

function EmptyState(props: {
  icon: IoniconName;
  message: string;
  emptyBg: string;
  emptyStroke: string;
  mutedText: string;
  theme: FitnessTheme;
}) {
  const { icon, message, emptyBg, emptyStroke, mutedText, theme } = props;
  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: emptyBg, borderColor: emptyStroke },
      ]}
    >
      <View
        style={[
          styles.emptyIconWrap,
          { backgroundColor: `${theme.accent}14` },
        ]}
      >
        <Ionicons name={icon} size={24} color={theme.accent} />
      </View>
      <Text style={[styles.emptyMessage, { color: mutedText }]}>
        {message}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    gap: 18,
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroWrap: {
    overflow: "visible",
  },
  heroCard: {
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 16,
    overflow: "hidden",
  },
  heroAuraPrimary: {
    position: "absolute",
    top: -34,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  heroAuraSecondary: {
    position: "absolute",
    bottom: -52,
    left: -32,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  heroHeading: {
    gap: 8,
    maxWidth: "82%",
  },
  heroEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
    lineHeight: 36,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginTop: 4,
  },
  heroStat: {
    flex: 1,
    gap: 4,
    alignItems: "center",
  },
  heroStatValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 26,
    lineHeight: 30,
  },
  heroStatLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 4,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 999,
    marginTop: 4,
  },
  heroButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },

  // ── Section cards ─────────────────────────────────────────────
  sectionCard: {
    borderRadius: 30,
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

  // ── Last meal ─────────────────────────────────────────────────
  lastMealContent: {
    gap: 12,
  },
  lastMealImage: {
    width: "100%",
    height: 180,
    borderRadius: 20,
  },
  lastMealBody: {
    gap: 10,
  },
  lastMealTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  lastMealTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  lastMealCalorieBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lastMealCalorieText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  lastMealTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  lastMealMacros: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  lastMealScoreRow: {
    flexDirection: "row",
  },
  lastMealScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lastMealScoreText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // ── Macros ────────────────────────────────────────────────────
  macroPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
  },
  macroLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  macroValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  macroUnit: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  macroDivider: {
    width: 1,
    alignSelf: "stretch",
  },

  // ── Rank list ─────────────────────────────────────────────────
  rankList: {
    gap: 10,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankNumber: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
  },
  rankInfo: {
    flex: 1,
    gap: 2,
  },
  rankMealName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  rankMealCalories: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  rankScoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
  },
  rankScoreText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
  },
  rankScoreUnit: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  // ── Empty state ───────────────────────────────────────────────
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMessage: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: "88%",
  },

  // ── Water tracker ─────────────────────────────────────────────
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
