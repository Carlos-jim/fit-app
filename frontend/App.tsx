import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppTab,
  BarGraph,
  BottomNav,
  CardEyebrow,
  CardSubtle,
  CardTitle,
  DailyBalanceCard,
  FitnessCard,
  FitnessHeader,
  FitnessTheme,
  SmallProgressCard,
  fitnessColors,
  fitnessLightColors,
} from "./src/components/fitness-ui";
import { HealthProviderStatusCard } from "./src/components/health-provider-status-card";
import { MacroResultCard } from "./src/components/macro-result-card";
import { MealHistoryScreen } from "./src/components/meal-history-screen";
import { RecoveryCard } from "./src/components/recovery-card";
import { env } from "./src/config/env";
import { biomaApi } from "./src/services/bioma-api";
import {
  CIRCADIAN_CITIES,
  createCircadianPlan,
  findNearestCircadianCity,
  formatCircadianTime,
  type CircadianCity,
} from "./src/services/circadian-engine";
import { createDailyRecommendation, createRecoverySnapshot } from "./src/services/recovery-engine";
import { mockHealthProvider } from "./src/services/wearables/mock-health-provider";
import type { MealAnalysisSummary, MealLog } from "./src/types/api";

type MealInputMode = "photo" | "text";
type VisualMode = "dark" | "light";
type ScannerMode = "food" | "barcode";
type StatsView = "food" | "steps";
type PlaceholderView = "steps" | "recommendations";
type StatsTabItem = {
  key: StatsView;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

const weightTrend = [54, 62, 47, 66, 67, 63, 42, 58];
const statsTabs: StatsTabItem[] = [
  { key: "food", label: "Comida", icon: "restaurant-outline" },
  { key: "steps", label: "Pasos", icon: "footsteps-outline" },
];
const weekdayLabels = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"] as const;
const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function getLocalDateKey(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, amount: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + amount);
  return next;
}

function getStartOfWeek(input: Date): Date {
  const date = new Date(input);
  date.setHours(12, 0, 0, 0);
  return addDays(date, -date.getDay());
}

function clampDateToMonth(year: number, monthIndex: number, day: number): Date {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, daysInMonth), 12, 0, 0, 0);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const { width: windowWidth } = useWindowDimensions();

  const wearableSnapshot = useMemo(() => mockHealthProvider.getSnapshot(), []);
  const recoverySnapshot = useMemo(
    () => createRecoverySnapshot(wearableSnapshot),
    [wearableSnapshot],
  );
  const dailyRecommendation = useMemo(
    () => createDailyRecommendation(recoverySnapshot),
    [recoverySnapshot],
  );

  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [visualMode, setVisualMode] = useState<VisualMode>("dark");
  const [now, setNow] = useState(() => new Date());
  const [circadianCity, setCircadianCity] = useState<CircadianCity>(CIRCADIAN_CITIES[2]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(
    "Usando Porlamar como referencia inicial. Activa ubicacion para ajustar la luz solar local.",
  );
  const [email, setEmail] = useState(env.defaultEmail);
  const [fullName, setFullName] = useState(env.defaultName);
  const [mealLabel, setMealLabel] = useState("Almuerzo");
  const [mealDescription, setMealDescription] = useState(
    "Me comi una arepa con queso y dos huevos.",
  );
  const [mealMode, setMealMode] = useState<MealInputMode>("photo");
  const [scannerMode, setScannerMode] = useState<ScannerMode>("food");
  const [barcodeResult, setBarcodeResult] = useState<BarcodeScanningResult | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysisSummary | null>(null);
  const [nutritionView, setNutritionView] = useState<"camera" | "history">("camera");
  const [cameraReturnTab, setCameraReturnTab] = useState<AppTab>("home");
  const [statsView, setStatsView] = useState<StatsView>("food");
  const [selectedStatsDate, setSelectedStatsDate] = useState(() => getLocalDateKey(new Date()));
  const [statsMonthPickerExpanded, setStatsMonthPickerExpanded] = useState(false);
  const [statsPagerLocked, setStatsPagerLocked] = useState(false);
  const [statsMealsExpanded, setStatsMealsExpanded] = useState(false);
  const [statsMealLogs, setStatsMealLogs] = useState<MealLog[]>([]);
  const [statsMealLogsLoading, setStatsMealLogsLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(1)).current;
  const heroScale = useRef(new Animated.Value(0.96)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const ambientPulse = useRef(new Animated.Value(0)).current;
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const statsScrollX = useRef(new Animated.Value(0)).current;
  const statsMealsExpandAnim = useRef(new Animated.Value(0)).current;
  const statsPagerRef = useRef<ScrollView | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const circadianPlan = useMemo(
    () => createCircadianPlan(circadianCity, now),
    [circadianCity, now],
  );
  const theme: FitnessTheme = visualMode === "light" ? fitnessLightColors : fitnessColors;
  const wellnessCardMode = visualMode === "light" ? "day" : "night";
  const loading = bootstrapLoading || analysisLoading;
  const statsPageWidth = Math.max(windowWidth - 40, 1);
  const statsTabWidth = Math.max((statsPageWidth - 12) / statsTabs.length, 1);
  const foodSurface = visualMode === "light" ? "#FFF9F1" : "#0D1613";
  const foodSurfaceSecondary = visualMode === "light" ? "#F4EDE2" : "#13211D";
  const foodSurfaceStrong = visualMode === "light" ? "#FFFFFF" : "#162822";
  const foodRingTrack = visualMode === "light" ? "#EADFD0" : "#20352E";
  const foodTextStrong = visualMode === "light" ? theme.text : "#F4FBF7";
  const foodTextMuted = visualMode === "light" ? "#8B8175" : "#7FA295";
  const foodTextSoft = visualMode === "light" ? "#B0A494" : "#557266";
  const foodGradient: readonly [string, string, string] = (
    visualMode === "light"
      ? ["#FFFDF8", "#F8F2E8", "#FFF8EE"]
      : ["#07100D", "#0D1815", "#101D19"]
  );
  const foodCalendarMutedTone = visualMode === "light" ? "#BBAF9F" : "#5E786B";
  const foodCalendarAccentTone = visualMode === "light" ? theme.accent : theme.mint;
  const todayKey = getLocalDateKey(now);
  const selectedStatsDateValue = useMemo(
    () => new Date(`${selectedStatsDate}T12:00:00`),
    [selectedStatsDate],
  );
  const selectedStatsMonthIndex = selectedStatsDateValue.getMonth();
  const selectedStatsYear = selectedStatsDateValue.getFullYear();
  const selectedStatsDayOfMonth = selectedStatsDateValue.getDate();
  const selectedDateTitle = selectedStatsDateValue.toLocaleDateString("es-ES", {
    month: "long",
    year: "2-digit",
  });
  const selectedDateWeekday = selectedStatsDateValue.toLocaleDateString("es-ES", {
    weekday: "long",
  });
  const statsMealsByDate = useMemo(() => {
    const map = new Map<string, MealLog[]>();

    for (const meal of statsMealLogs) {
      const key = getLocalDateKey(meal.createdAt);
      const current = map.get(key) ?? [];
      current.push(meal);
      map.set(key, current);
    }

    return map;
  }, [statsMealLogs]);
  const analysisFallbackMeal = useMemo(() => {
    if (!analysis || selectedStatsDate !== todayKey) {
      return null;
    }

    return {
      id: analysis.id,
      imageUrl: analysis.imageUrl ?? imageAsset?.uri ?? null,
      title: analysis.title ?? (mealLabel.trim() || "Comida analizada"),
      description:
        analysis.ingredients.length > 0
          ? analysis.ingredients.map((ingredient) => ingredient.name).join(", ")
          : mealDescription.trim() || "Comida registrada recientemente.",
      calories: Math.round(analysis.calories),
      proteinGrams: analysis.proteinGrams,
      carbsGrams: analysis.carbsGrams,
      fatGrams: analysis.fatGrams,
      ingredients: analysis.ingredients,
      createdAt: analysis.createdAt,
    };
  }, [analysis, imageAsset?.uri, mealDescription, mealLabel, selectedStatsDate, todayKey]);
  const selectedDateMeals = useMemo(() => {
    const meals = statsMealsByDate.get(selectedStatsDate) ?? [];

    if (meals.length > 0) {
      return [...meals].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    if (analysisFallbackMeal) {
      return [analysisFallbackMeal];
    }

    return [];
  }, [analysisFallbackMeal, selectedStatsDate, statsMealsByDate]);
  const selectedMealCalories = Math.round(
    selectedDateMeals.reduce((sum, meal) => sum + meal.calories, 0) || 0,
  );
  const selectedCarbs = Math.round(
    selectedDateMeals.reduce((sum, meal) => sum + ("carbsGrams" in meal ? meal.carbsGrams : 0), 0) || 0,
  );
  const selectedProtein = Math.round(
    selectedDateMeals.reduce((sum, meal) => sum + ("proteinGrams" in meal ? meal.proteinGrams : 0), 0) || 0,
  );
  const selectedFat = Math.round(
    selectedDateMeals.reduce((sum, meal) => sum + ("fatGrams" in meal ? meal.fatGrams : 0), 0) || 0,
  );
  const selectedWeekMeals = useMemo(() => {
    const startOfWeek = getStartOfWeek(selectedStatsDateValue);

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(startOfWeek, index);
      const dateKey = getLocalDateKey(date);
      const meals = statsMealsByDate.get(dateKey) ?? [];
      const fallbackCalories = dateKey === todayKey && meals.length === 0 ? Math.round(analysis?.calories ?? 0) : 0;
      const totalCalories = Math.round(meals.reduce((sum, meal) => sum + meal.calories, 0) + fallbackCalories);

      return {
        key: dateKey,
        label: weekdayLabels[date.getDay()],
        day: String(date.getDate()),
        calories: totalCalories,
        isSelected: dateKey === selectedStatsDate,
        isToday: dateKey === todayKey,
      };
    });
  }, [analysis?.calories, selectedStatsDate, selectedStatsDateValue, statsMealsByDate, todayKey]);
  const registeredMealsPreview = useMemo(
    () =>
      selectedDateMeals.slice(0, 4).map((meal) => ({
        id: meal.id,
        imageUrl: meal.imageUrl,
        title: meal.title ?? "Comida registrada",
        description:
          meal.ingredients.length > 0
            ? meal.ingredients.map((ingredient) => ingredient.name).join(", ")
            : "Comida escaneada y guardada en tu historial.",
        calories: Math.round(meal.calories),
      })),
    [selectedDateMeals],
  );
  const statsTabIndicatorTranslateX = statsScrollX.interpolate({
    inputRange: [0, statsPageWidth],
    outputRange: [0, statsTabWidth],
    extrapolate: "clamp",
  });
  const statsMealsContentHeight = Math.max(registeredMealsPreview.length * 92 + 20, 96);
  const registeredMeals = selectedDateMeals.length;
  const homeTodayMeals = useMemo(() => {
    const meals = statsMealsByDate.get(todayKey) ?? [];

    if (meals.length > 0) {
      return meals;
    }

    if (analysisFallbackMeal) {
      return [analysisFallbackMeal];
    }

    return [];
  }, [analysisFallbackMeal, statsMealsByDate, todayKey]);
  const homeTodayCalories = Math.round(
    homeTodayMeals.reduce((sum, meal) => sum + meal.calories, 0),
  );
  const homeTodayMealsCount = homeTodayMeals.length;
  const homeStepGoal = 10000;
  const homeStepProgress = Math.min(wearableSnapshot.steps / homeStepGoal, 1);
  const homeRecoveryAccent =
    recoverySnapshot.state === "high"
      ? theme.accent
      : recoverySnapshot.state === "medium"
        ? theme.lime
        : theme.danger;
  const homeHeroGradient: readonly [string, string, string] =
    visualMode === "light"
      ? ["#FFFDF8", "#F6EFE4", "#EEE4D6"]
      : ["#07110F", "#0F221D", "#17352C"];
  const homePanelColor = visualMode === "light" ? "#FBF8F1" : "#0F1513";
  const homePanelColorAlt = visualMode === "light" ? "#F2ECE1" : "#121B18";
  const homePanelStroke = visualMode === "light" ? "#E8DED0" : "#1D2A25";
  const homeMutedText = visualMode === "light" ? "#786F65" : "#8AA199";
  const homeSoftText = visualMode === "light" ? "#A3988B" : "#587067";
  const homeStrongText = visualMode === "light" ? "#17130F" : "#F5FBF8";
  const homeAnchorText = formatCircadianTime(circadianPlan.nextAnchor, circadianPlan.city.timeZone);
  const homeHeroAuraPrimaryColor = visualMode === "light" ? "rgba(0, 200, 151, 0.12)" : "rgba(118, 239, 229, 0.14)";
  const homeHeroAuraSecondaryColor = visualMode === "light" ? "rgba(232, 255, 84, 0.10)" : "rgba(232, 255, 84, 0.11)";
  const homeHeroPillDarkColor = visualMode === "light" ? "rgba(23, 19, 15, 0.04)" : "rgba(255,255,255,0.08)";
  const homeHeroPillGlassColor = visualMode === "light" ? "rgba(23, 19, 15, 0.06)" : "rgba(255,255,255,0.12)";
  const homeHeroPillTextColor = visualMode === "light" ? "#2A241F" : "#F4FBF8";
  const homeHeroEyebrowColor = visualMode === "light" ? "#897E71" : "#8FACA1";
  const homeHeroTitleColor = visualMode === "light" ? "#1A1511" : "#FCFFFD";
  const homeHeroSummaryColor = visualMode === "light" ? "#6F655B" : "rgba(245, 251, 248, 0.74)";
  const homeFloatingBadgeColor = visualMode === "light" ? "rgba(23, 19, 15, 0.06)" : "rgba(255,255,255,0.08)";
  const homeFloatingValueColor = visualMode === "light" ? "#17130F" : "#F8FFFC";
  const homeFloatingLabelColor = visualMode === "light" ? "#8C8174" : "#88A89B";
  const homeHeroScoreLabelColor = visualMode === "light" ? "#8C8174" : "#96B4AA";
  const homeHeroScoreValueColor = visualMode === "light" ? "#17130F" : "#FFFFFF";
  const homeHeroScoreCaptionColor = visualMode === "light" ? "#6F655B" : "#CDE0D7";
  const homeHeroDividerColor = visualMode === "light" ? "rgba(23, 19, 15, 0.08)" : "rgba(255,255,255,0.10)";
  const homeHeroMiniValueColor = visualMode === "light" ? "#17130F" : "#FFFFFF";
  const homeHeroMiniLabelColor = visualMode === "light" ? "#8C8174" : "#8BA79C";
  const profileHeroGradient: readonly [string, string, string] =
    visualMode === "light"
      ? ["#FFFDF8", "#F6EFE4", "#EEE4D6"]
      : ["#050D0B", "#10211B", "#18332A"];
  const profilePanelColor = visualMode === "light" ? "#FBF8F1" : "#0F1513";
  const profilePanelAlt = visualMode === "light" ? "#F2ECE1" : "#121C18";
  const profilePanelStroke = visualMode === "light" ? "#E8DED0" : "#1E2A25";
  const profileTextStrong = visualMode === "light" ? "#17130F" : "#F5FBF8";
  const profileTextMuted = visualMode === "light" ? "#786F65" : "#8AA199";
  const profileTextSoft = visualMode === "light" ? "#A3988B" : "#5C7369";
  const profileHeroGlowColor = visualMode === "light" ? "rgba(0, 200, 151, 0.12)" : "rgba(118,239,229,0.16)";
  const profileHeroPillGlassColor = visualMode === "light" ? "rgba(23, 19, 15, 0.06)" : "rgba(255,255,255,0.12)";
  const profileHeroPillDarkColor = visualMode === "light" ? "rgba(23, 19, 15, 0.04)" : "rgba(255,255,255,0.08)";
  const profileHeroPillTextColor = visualMode === "light" ? "#2A241F" : "#F4FBF8";
  const profileHeroAvatarColor = visualMode === "light" ? "rgba(23, 19, 15, 0.06)" : "rgba(255,255,255,0.12)";
  const profileHeroAvatarTextColor = visualMode === "light" ? "#17130F" : "#FFFFFF";
  const profileHeroTitleColor = visualMode === "light" ? "#1A1511" : "#FCFFFD";
  const profileHeroSubtitleColor = visualMode === "light" ? "#6F655B" : "rgba(245, 251, 248, 0.74)";
  const profileHeroStatValueColor = visualMode === "light" ? "#17130F" : "#FFFFFF";
  const profileHeroStatLabelColor = visualMode === "light" ? "#8C8174" : "#8BA79C";
  const profileHeroDividerColor = visualMode === "light" ? "rgba(23, 19, 15, 0.08)" : "rgba(255,255,255,0.10)";
  const profileInitial = (fullName.trim() || email.trim() || "B").slice(0, 1).toUpperCase();
  const profileCompletion = [fullName.trim(), email.trim(), userId].filter(Boolean).length / 3;
  const profileCompletionValue = Math.round(profileCompletion * 100);
  const profileStatusText = userId ? "Perfil conectado" : "Perfil listo para conectar";

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void syncCircadianLocation();
  }, []);

  useEffect(() => {
    screenOpacity.setValue(0);
    screenTranslateY.setValue(18);
    screenScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(screenScale, {
        toValue: 1,
        friction: 8,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, screenOpacity, screenScale, screenTranslateY]);

  useEffect(() => {
    Animated.spring(heroScale, {
      toValue: 1,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [heroScale]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulseScale]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ambientPulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [ambientPulse]);

  useEffect(() => {
    if (activeTab === "nutrition" && !cameraPermission?.granted) {
      void requestCameraPermission();
    }
  }, [activeTab, cameraPermission?.granted, requestCameraPermission]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(statsMealsExpandAnim, {
        toValue: statsMealsExpanded ? 1 : 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [statsMealsExpandAnim, statsMealsExpanded]);

  useEffect(() => {
    if (activeTab !== "stats") {
      return;
    }

    const activeIndex = statsTabs.findIndex((tab) => tab.key === statsView);
    const timer = setTimeout(() => {
      statsPagerRef.current?.scrollTo({
        x: activeIndex * statsPageWidth,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, statsPageWidth]);

  useEffect(() => {
    if (activeTab !== "stats" || !userId || !env.apiBaseUrl) {
      return;
    }

    void loadStatsMealLogs(userId);
  }, [activeTab, userId]);

  if (!fontsLoaded) {
    return null;
  }

  async function syncCircadianLocation() {
    try {
      setLocationLoading(true);
      setLocationStatus("Detectando luz solar local...");

      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationStatus(
          "Permiso de ubicacion pendiente. Puedes elegir Ciudad de Mexico, Bogota o Porlamar manualmente.",
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nearestCity = findNearestCircadianCity({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      setCircadianCity(nearestCity);
      setLocationStatus(
        `Ubicacion sincronizada. Usamos ${nearestCity.name}, ${nearestCity.country}, como referencia solar cercana.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo leer la ubicacion. Puedes elegir la ciudad manualmente.";
      setLocationStatus(message);
    } finally {
      setLocationLoading(false);
    }
  }

  async function loadStatsMealLogs(id: string) {
    try {
      setStatsMealLogsLoading(true);
      const logs = await biomaApi.getLogs(id);
      setStatsMealLogs(logs);
    } catch {
      setStatsMealLogs([]);
    } finally {
      setStatsMealLogsLoading(false);
    }
  }

  function selectCircadianCity(city: CircadianCity) {
    setCircadianCity(city);
    setLocationStatus(
      `Referencia manual activa: ${city.name}, ${city.country}. Calculamos tus ventanas con su luz solar.`,
    );
  }

  function openCameraScreen(originTab: AppTab = activeTab) {
    setCameraReturnTab(originTab);
    setNutritionView("camera");
    setActiveTab("nutrition");
  }

  function closeCameraScreen() {
    setNutritionView("history");

    if (cameraReturnTab === "nutrition") {
      setActiveTab("nutrition");
      return;
    }

    setActiveTab(cameraReturnTab);
  }

  function handleBottomTabChange(nextTab: AppTab) {
    if (nextTab === "nutrition") {
      openCameraScreen(activeTab);
      return;
    }

    setActiveTab(nextTab);
  }

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permiso requerido",
        "Bioma necesita acceso a tu galeria para analizar tus comidas.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled) {
      setImageAsset(result.assets[0] ?? null);
      setAnalysis(null);
      setStatusMessage("Foto cargada. Lista para analizar.");
    }
  };

  const captureFoodPhoto = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Bioma necesita acceso a la camara para escanear tu comida.");
        return;
      }
    }

    if (!cameraReady || !cameraRef.current) {
      Alert.alert("Camara iniciando", "Espera un momento y vuelve a intentar.");
      return;
    }

    const picture = await cameraRef.current.takePictureAsync({
      quality: 0.86,
      exif: false,
    });

    if (!picture) {
      return;
    }

    setMealMode("photo");
    setMealLabel("Comida escaneada");
    setMealDescription("Foto capturada desde el escaner de comida.");
    setImageAsset({
      uri: picture.uri,
      width: picture.width,
      height: picture.height,
      type: "image",
      fileName: `comida-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    });
    setAnalysis(null);
    setStatusMessage("Foto capturada. Lista para analizar.");
  };

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scannerMode !== "barcode" || barcodeResult) {
      return;
    }

    setBarcodeResult(result);
    setStatusMessage(`Codigo detectado: ${result.data}`);
  }

  const connectProfile = async (): Promise<string | null> => {
    if (!email.trim()) {
      Alert.alert("Correo requerido", "Ingresa un correo para crear o recuperar el perfil.");
      return null;
    }

    try {
      setBootstrapLoading(true);
      setStatusMessage("Sincronizando perfil...");

      const profile = await biomaApi.bootstrapUser({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
      });

      setUserId(profile.id);
      setStatusMessage(`Perfil listo para ${profile.fullName ?? profile.email}.`);
      return profile.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo conectar el perfil.";
      Alert.alert("Error al conectar", message);
      setStatusMessage(message);
      return null;
    } finally {
      setBootstrapLoading(false);
    }
  };

  const analyzeCurrentMeal = async () => {
    if (!env.apiBaseUrl) {
      Alert.alert(
        "Configura el API",
        "Define EXPO_PUBLIC_API_BASE_URL para conectar la app con tu backend.",
      );
      return;
    }

    if (mealMode === "photo" && !imageAsset) {
      Alert.alert("Falta la foto", "Selecciona una imagen antes de analizar.");
      return;
    }

    if (mealMode === "text" && mealDescription.trim().length < 5) {
      Alert.alert(
        "Falta descripcion",
        "Escribe una descripcion mas completa de la comida para estimar macros.",
      );
      return;
    }

    try {
      setAnalysisLoading(true);
      setStatusMessage("Preparando perfil...");

      const resolvedUserId = userId ?? (await connectProfile());

      if (!resolvedUserId) {
        return;
      }

      if (mealMode === "photo" && imageAsset) {
        setStatusMessage("Solicitando URL firmada...");

        const upload = await biomaApi.createMealUploadUrl({
          userId: resolvedUserId,
          fileName: imageAsset.fileName ?? `meal-${Date.now()}.jpg`,
          contentType: imageAsset.mimeType ?? "image/jpeg",
        });

        setStatusMessage("Subiendo imagen a S3...");
        await biomaApi.uploadImageToS3(upload.uploadUrl, imageAsset.uri, upload.requiredHeaders);

        setStatusMessage("Analizando comida por vision...");
        const result = await biomaApi.analyzeMealImage({
          userId: resolvedUserId,
          s3Key: upload.key,
          bucket: upload.bucket,
          mealLabel: mealLabel.trim() || undefined,
          notes: mealDescription.trim() || undefined,
          consumedAt: new Date().toISOString(),
        });

        setAnalysis(result);
      } else {
        setStatusMessage("Analizando descripcion con IA...");
        const result = await biomaApi.analyzeMealText({
          userId: resolvedUserId,
          mealLabel: mealLabel.trim() || undefined,
          description: mealDescription.trim(),
          consumedAt: new Date().toISOString(),
        });

        setAnalysis(result);
      }

      if (env.apiBaseUrl) {
        void loadStatsMealLogs(resolvedUserId);
      }

      setStatusMessage("Analisis completado y guardado en el historial.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar el analisis.";
      Alert.alert("Error en el analisis", message);
      setStatusMessage(message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const content = (() => {
    switch (activeTab) {
      case "stats":
        return renderStatsScreen();
      case "nutrition":
        return (
          <MealHistoryScreen
            userId={userId}
            theme={theme}
            mode={wellnessCardMode}
            onOpenCamera={() => openCameraScreen("nutrition")}
          />
        );
      case "tips":
        return renderTipsScreen();
      case "profile":
        return renderProfileScreen();
      case "home":
      default:
        return renderHomeScreen();
    }
  })();

  if (activeTab === "nutrition" && nutritionView === "camera") {
    return renderCameraOnlyScreen();
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={visualMode === "light" ? "dark-content" : "light-content"} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          {
            backgroundColor: theme.accent,
            opacity: visualMode === "light" ? 0.14 : 0.18,
            transform: [
              {
                translateY: ambientPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 26],
                }),
              },
              {
                scale: ambientPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1.12],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: mainScrollY } } }],
          { useNativeDriver: false },
        )}
      >
        <FitnessHeader
          activeTab={activeTab}
          fullName={fullName}
          onOpenProfile={() => setActiveTab("profile")}
          theme={theme}
        />

        <Animated.View
          style={[
            styles.screenMotion,
            {
              opacity: screenOpacity,
              transform: [{ translateY: screenTranslateY }, { scale: screenScale }],
            },
          ]}
        >
          {content}
        </Animated.View>
      </Animated.ScrollView>

      <BottomNav activeTab={activeTab} pulseScale={pulseScale} onChangeTab={handleBottomTabChange} theme={theme} />
    </SafeAreaView>
  );

  function renderHomeScreen() {
    return (
      <View style={styles.homeScreen}>
        <Animated.View
          style={[
            styles.homeHeroWrap,
            {
              transform: [
                { scale: heroScale },
                {
                  translateY: ambientPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={homeHeroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.homeHeroCard}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.homeHeroAuraPrimary,
                { backgroundColor: homeHeroAuraPrimaryColor },
                {
                  transform: [
                    {
                      translateX: ambientPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 18],
                      }),
                    },
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
                styles.homeHeroAuraSecondary,
                { backgroundColor: homeHeroAuraSecondaryColor },
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

            <View style={styles.homeHeroTopRow}>
              <View style={[styles.homeHeroPill, { backgroundColor: homeHeroPillDarkColor }]}>
                <Text style={[styles.homeHeroPillText, { color: homeHeroPillTextColor }]}>Resumen premium de hoy</Text>
              </View>
              <View style={[styles.homeHeroPill, { backgroundColor: homeHeroPillGlassColor }]}>
                <Text style={[styles.homeHeroPillText, { color: homeHeroPillTextColor }]}>{homeAnchorText}</Text>
              </View>
            </View>

            <View style={styles.homeHeroHeadingBlock}>
              <Text style={[styles.homeHeroEyebrow, { color: homeHeroEyebrowColor }]}>Tu cuerpo hoy</Text>
              <Text style={[styles.homeHeroTitle, { color: homeHeroTitleColor }]}>
                Todo lo importante, claro y en un solo lugar.
              </Text>
              <Text style={[styles.homeHeroSummary, { color: homeHeroSummaryColor }]}>{dailyRecommendation.summary}</Text>
            </View>

            <Animated.View
              style={[
                styles.homeFloatingBadge,
                styles.homeFloatingBadgeLeft,
                { backgroundColor: homeFloatingBadgeColor },
                {
                  transform: [
                    {
                      translateY: ambientPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.homeFloatingValue, { color: homeFloatingValueColor }]}>{wearableSnapshot.steps.toLocaleString()}</Text>
              <Text style={[styles.homeFloatingLabel, { color: homeFloatingLabelColor }]}>pasos</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.homeFloatingBadge,
                styles.homeFloatingBadgeRight,
                { backgroundColor: homeFloatingBadgeColor },
                {
                  transform: [
                    {
                      translateY: ambientPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-4, 8],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.homeFloatingValue, { color: homeFloatingValueColor }]}>{wearableSnapshot.sleep.totalHours.toFixed(1)} h</Text>
              <Text style={[styles.homeFloatingLabel, { color: homeFloatingLabelColor }]}>sueno</Text>
            </Animated.View>

            <View style={styles.homeHeroBottomRow}>
              <View style={styles.homeHeroScoreBlock}>
                <Text style={[styles.homeHeroScoreLabel, { color: homeHeroScoreLabelColor }]}>Recovery score</Text>
                <Text style={[styles.homeHeroScoreValue, { color: homeHeroScoreValueColor }]}>{recoverySnapshot.score}</Text>
                <Text style={[styles.homeHeroScoreCaption, { color: homeHeroScoreCaptionColor }]}>{recoverySnapshot.label}</Text>
              </View>

              <View style={[styles.homeHeroDivider, { backgroundColor: homeHeroDividerColor }]} />

              <View style={styles.homeHeroMiniStats}>
                <View style={styles.homeHeroMiniStat}>
                  <Text style={[styles.homeHeroMiniValue, { color: homeHeroMiniValueColor }]}>{homeTodayCalories || 0}</Text>
                  <Text style={[styles.homeHeroMiniLabel, { color: homeHeroMiniLabelColor }]}>kcal hoy</Text>
                </View>
                <View style={styles.homeHeroMiniStat}>
                  <Text style={[styles.homeHeroMiniValue, { color: homeHeroMiniValueColor }]}>{homeTodayMealsCount}</Text>
                  <Text style={[styles.homeHeroMiniLabel, { color: homeHeroMiniLabelColor }]}>comidas</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.homeMetricsGrid,
            {
              opacity: mainScrollY.interpolate({
                inputRange: [0, 70, 150],
                outputRange: [0.68, 0.88, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: mainScrollY.interpolate({
                    inputRange: [0, 150],
                    outputRange: [34, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.homeMetricCard, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
            <View style={styles.homeMetricHeader}>
              <Text style={[styles.homeMetricLabel, { color: homeMutedText }]}>Recuperacion</Text>
              <View style={[styles.homeMetricDot, { backgroundColor: homeRecoveryAccent }]} />
            </View>
            <Text style={[styles.homeMetricValue, { color: homeStrongText }]}>{recoverySnapshot.score}</Text>
            <Text style={[styles.homeMetricFoot, { color: homeMutedText }]}>{recoverySnapshot.label}</Text>
          </View>

          <View style={[styles.homeMetricCard, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
            <View style={styles.homeMetricHeader}>
              <Text style={[styles.homeMetricLabel, { color: homeMutedText }]}>Pasos</Text>
              <Text style={[styles.homeMetricHint, { color: homeSoftText }]}>meta {homeStepGoal.toLocaleString()}</Text>
            </View>
            <Text style={[styles.homeMetricValueSmall, { color: homeStrongText }]}>
              {wearableSnapshot.steps.toLocaleString()}
            </Text>
            <View style={[styles.homeMetricTrack, { backgroundColor: homePanelColorAlt }]}>
              <View
                style={[
                  styles.homeMetricFill,
                  { width: `${homeStepProgress * 100}%`, backgroundColor: theme.accent },
                ]}
              />
            </View>
          </View>

          <View style={[styles.homeMetricCard, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
            <View style={styles.homeMetricHeader}>
              <Text style={[styles.homeMetricLabel, { color: homeMutedText }]}>Sueno</Text>
              <Text style={[styles.homeMetricHint, { color: homeSoftText }]}>deep {wearableSnapshot.sleep.deepHours.toFixed(1)} h</Text>
            </View>
            <Text style={[styles.homeMetricValueSmall, { color: homeStrongText }]}>
              {wearableSnapshot.sleep.totalHours.toFixed(1)} h
            </Text>
            <Text style={[styles.homeMetricFoot, { color: homeMutedText }]}>
              REM {wearableSnapshot.sleep.remHours.toFixed(1)} h
            </Text>
          </View>

          <View style={[styles.homeMetricCard, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
            <View style={styles.homeMetricHeader}>
              <Text style={[styles.homeMetricLabel, { color: homeMutedText }]}>Cardio</Text>
              <Text style={[styles.homeMetricHint, { color: homeSoftText }]}>HRV {wearableSnapshot.hrvMs} ms</Text>
            </View>
            <Text style={[styles.homeMetricValueSmall, { color: homeStrongText }]}>
              {wearableSnapshot.vo2Max.toFixed(1)}
            </Text>
            <Text style={[styles.homeMetricFoot, { color: homeMutedText }]}>VO2 max estimado</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: mainScrollY.interpolate({
              inputRange: [70, 180, 300],
              outputRange: [0.55, 0.82, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: Animated.add(
                  mainScrollY.interpolate({
                    inputRange: [70, 280],
                    outputRange: [42, 0],
                    extrapolate: "clamp",
                  }),
                  ambientPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                ),
              },
              {
                scale: mainScrollY.interpolate({
                  inputRange: [70, 280],
                  outputRange: [0.96, 1],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={visualMode === "light" ? ["#FFFFFF", "#F6F1E8"] : ["#111917", "#0D1412"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.homeStoryCard, { borderColor: homePanelStroke }]}
          >
          <View style={styles.homeStoryHeader}>
            <View>
              <Text style={[styles.homeSectionEyebrow, { color: theme.accent }]}>PANORAMA</Text>
              <Text style={[styles.homeStoryTitle, { color: homeStrongText }]}>Ritmo, energia y comida alineados.</Text>
              <Text style={[styles.homeStoryText, { color: homeMutedText }]}>
                Siguiente ancla circadiana a las {homeAnchorText} en {circadianPlan.city.name}. Hoy vas con {homeTodayCalories || 0} kcal y {homeTodayMealsCount} comidas registradas.
              </Text>
            </View>
          </View>

          <View style={styles.homeTrendRow}>
            {weightTrend.map((value, index) => {
              const height = 26 + value * 0.9;
              const active = index === 4;

              return (
                <View key={`${value}-${index}`} style={styles.homeTrendColumn}>
                  <View style={[styles.homeTrendTrack, { backgroundColor: homePanelColorAlt }]}>
                    <Animated.View
                      style={[
                        styles.homeTrendFill,
                        {
                          height,
                          backgroundColor: active ? theme.accent : visualMode === "light" ? "#CFC5B6" : "#28433A",
                          opacity: mainScrollY.interpolate({
                            inputRange: [100 + index * 10, 220 + index * 12],
                            outputRange: [0.35, 1],
                            extrapolate: "clamp",
                          }),
                          transform: [
                            {
                              translateY: Animated.add(
                                mainScrollY.interpolate({
                                  inputRange: [100 + index * 12, 240 + index * 16],
                                  outputRange: [height * 0.42, 0],
                                  extrapolate: "clamp",
                                }),
                                ambientPulse.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, active ? -8 : -(4 + (index % 3))],
                                }),
                              ),
                            },
                            {
                              scaleY: mainScrollY.interpolate({
                                inputRange: [100 + index * 12, 240 + index * 16],
                                outputRange: [0.42, 1],
                                extrapolate: "clamp",
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.homeActionRow}>
            <Pressable
              style={[styles.homeActionButtonPrimary, { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab("stats")}
            >
              <Text style={[styles.homeActionButtonPrimaryText, { color: visualMode === "light" ? "#FFFFFF" : "#07110E" }]}>
                Ver resumen
              </Text>
            </Pressable>
            <Pressable
              style={[styles.homeActionButtonSecondary, { backgroundColor: homePanelColorAlt }]}
              onPress={() => openCameraScreen("home")}
            >
              <Text style={[styles.homeActionButtonSecondaryText, { color: homeStrongText }]}>
                Escanear comida
              </Text>
            </Pressable>
          </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            styles.homeInsightStack,
            {
              opacity: mainScrollY.interpolate({
                inputRange: [180, 300, 420],
                outputRange: [0.48, 0.82, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: mainScrollY.interpolate({
                    inputRange: [180, 420],
                    outputRange: [40, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.homeInsightCardLarge, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
            <Text style={[styles.homeSectionEyebrow, { color: theme.accent }]}>AI COACH</Text>
            <Text style={[styles.homeInsightTitle, { color: homeStrongText }]}>{dailyRecommendation.title}</Text>
            <Text style={[styles.homeInsightText, { color: homeMutedText }]}>{dailyRecommendation.summary}</Text>
          </View>

          <View style={styles.homeMiniCardsRow}>
            <View style={[styles.homeMiniCard, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
              <Text style={[styles.homeMiniCardLabel, { color: homeMutedText }]}>Ciudad solar</Text>
              <Text style={[styles.homeMiniCardValue, { color: homeStrongText }]}>{circadianPlan.city.name}</Text>
            </View>
            <View style={[styles.homeMiniCard, { backgroundColor: homePanelColor, borderColor: homePanelStroke }]}>
              <Text style={[styles.homeMiniCardLabel, { color: homeMutedText }]}>Fase actual</Text>
              <Text style={[styles.homeMiniCardValue, { color: homeStrongText }]}>
                {circadianPlan.phase === "day" ? "Dia" : "Noche"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  function scrollToStatsView(nextView: StatsView) {
    const nextIndex = statsTabs.findIndex((tab) => tab.key === nextView);
    setStatsView(nextView);
    statsPagerRef.current?.scrollTo({
      x: nextIndex * statsPageWidth,
      animated: true,
    });
  }

  function getStatsPageMotion(index: number) {
    return {
      opacity: statsScrollX.interpolate({
        inputRange: [(index - 1) * statsPageWidth, index * statsPageWidth, (index + 1) * statsPageWidth],
        outputRange: [0.72, 1, 0.72],
        extrapolate: "clamp",
      }),
      transform: [
        {
          translateY: statsScrollX.interpolate({
            inputRange: [(index - 1) * statsPageWidth, index * statsPageWidth, (index + 1) * statsPageWidth],
            outputRange: [20, 0, 20],
            extrapolate: "clamp",
          }),
        },
        {
          scale: statsScrollX.interpolate({
            inputRange: [(index - 1) * statsPageWidth, index * statsPageWidth, (index + 1) * statsPageWidth],
            outputRange: [0.97, 1, 0.97],
            extrapolate: "clamp",
          }),
        },
      ],
    };
  }

  function updateSelectedStatsMonthYear(monthIndex: number, year: number, closePicker = false) {
    const nextDate = clampDateToMonth(year, monthIndex, selectedStatsDayOfMonth);
    setSelectedStatsDate(getLocalDateKey(nextDate));

    if (closePicker) {
      setStatsMonthPickerExpanded(false);
    }
  }

  function renderMacroPill(label: string, value: number, target: number, accent: string) {
    return (
      <View key={label} style={styles.foodMacroItem}>
        <Text style={[styles.foodMacroLabel, { color: foodTextMuted }]}>{label}</Text>
        <View style={[styles.foodMacroTrack, { backgroundColor: foodRingTrack }]}>
          <View
            style={[
              styles.foodMacroFill,
              {
                width: `${Math.min(value / target, 1) * 100}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>
        <Text style={[styles.foodMacroValue, { color: foodTextStrong }]}>
          {value} <Text style={[styles.foodMacroTarget, { color: foodTextSoft }]}>/ {target} g</Text>
        </Text>
      </View>
    );
  }

  function renderFoodStatsPage() {
    return (
      <LinearGradient
        colors={foodGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.foodStatsCard,
        ]}
      >
        <View style={styles.foodStatsHeaderRow}>
          <View style={styles.foodStatsHeaderSpacer} />

          <Pressable
            style={styles.foodStatsHeading}
            onPress={() => setStatsMonthPickerExpanded((current) => !current)}
          >
            <View style={styles.foodStatsMonthButton}>
              <Text style={[styles.foodStatsMonth, { color: foodTextStrong }]}>
                {selectedDateTitle.charAt(0).toUpperCase() + selectedDateTitle.slice(1)}
              </Text>
              <Ionicons
                name={statsMonthPickerExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={foodTextMuted}
              />
            </View>
            <Text style={[styles.foodStatsWeekday, { color: foodTextMuted }]}>
              {selectedDateWeekday.charAt(0).toUpperCase() + selectedDateWeekday.slice(1)}
            </Text>
          </Pressable>

          <View style={styles.foodStatsHeaderSpacer} />
        </View>

        {statsMonthPickerExpanded ? (
          <View
            style={[styles.foodMonthPicker, { backgroundColor: foodSurfaceSecondary }]}
            onTouchStart={() => setStatsPagerLocked(true)}
            onTouchEnd={() => setStatsPagerLocked(false)}
            onTouchCancel={() => setStatsPagerLocked(false)}
          >
            <View style={styles.foodMonthPickerYearRow}>
              <Pressable
                style={[styles.foodMonthPickerYearButton, { backgroundColor: foodSurfaceStrong }]}
                onPress={() => updateSelectedStatsMonthYear(selectedStatsMonthIndex, selectedStatsYear - 1)}
              >
                <Ionicons name="chevron-back" size={16} color={foodTextStrong} />
              </Pressable>

              <Text style={[styles.foodMonthPickerYearText, { color: foodTextStrong }]}>
                {selectedStatsYear}
              </Text>

              <Pressable
                style={[styles.foodMonthPickerYearButton, { backgroundColor: foodSurfaceStrong }]}
                onPress={() => updateSelectedStatsMonthYear(selectedStatsMonthIndex, selectedStatsYear + 1)}
              >
                <Ionicons name="chevron-forward" size={16} color={foodTextStrong} />
              </Pressable>
            </View>

            <View style={styles.foodMonthPickerGrid}>
              {monthLabels.map((monthLabel, monthIndex) => {
                const active = monthIndex === selectedStatsMonthIndex;

                return (
                  <Pressable
                    key={monthLabel}
                    style={[
                      styles.foodMonthChip,
                      { backgroundColor: active ? theme.accent : foodSurfaceStrong },
                    ]}
                    onPress={() => updateSelectedStatsMonthYear(monthIndex, selectedStatsYear, true)}
                  >
                    <Text
                      style={[
                        styles.foodMonthChipText,
                        { color: active ? (visualMode === "light" ? "#FFFFFF" : "#07110E") : foodTextStrong },
                      ]}
                    >
                      {monthLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View
          style={styles.foodCalendarRow}
          onTouchStart={() => setStatsPagerLocked(true)}
          onTouchEnd={() => setStatsPagerLocked(false)}
          onTouchCancel={() => setStatsPagerLocked(false)}
        >
          {selectedWeekMeals.map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.foodCalendarItem,
                item.isSelected && styles.foodCalendarItemActive,
                item.isSelected && {
                  backgroundColor: foodSurfaceStrong,
                },
              ]}
              onPress={() => {
                setSelectedStatsDate(item.key);
                setStatsMonthPickerExpanded(false);
              }}
            >
              <Text
                style={[
                  styles.foodCalendarLabel,
                  { color: foodTextSoft },
                  item.isSelected && styles.foodCalendarLabelActive,
                  item.isSelected && { color: foodTextMuted },
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.foodCalendarDay,
                  { color: foodTextMuted },
                  item.isSelected && styles.foodCalendarDayActive,
                  item.isSelected && { color: foodTextStrong },
                ]}
              >
                {item.day}
              </Text>
              {item.isToday ? <View style={[styles.foodCalendarDot, { backgroundColor: foodCalendarAccentTone }]} /> : null}
              <Text
                style={[
                  styles.foodCalendarCalories,
                  {
                    color: item.isSelected
                      ? foodCalendarAccentTone
                      : item.calories > 0
                        ? foodCalendarMutedTone
                        : foodTextSoft,
                  },
                ]}
              >
                {item.calories > 0 ? item.calories : "--"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.foodRingShell}>
          <View style={[styles.foodRingGlow, { backgroundColor: visualMode === "light" ? "rgba(0, 200, 151, 0.10)" : "rgba(118, 239, 229, 0.12)" }]} />
          <View style={[styles.foodRingOuterTrack, { borderColor: foodRingTrack }]} />
          <View
            style={[
              styles.foodRingOuterProgress,
              {
                borderTopColor: theme.accent,
                borderRightColor: theme.accent,
                borderBottomColor: theme.accent,
              },
            ]}
          />
          <View style={[styles.foodRingInnerTrack, { borderColor: foodSurfaceSecondary }]} />
          <View
            style={[
              styles.foodRingInnerProgress,
              {
                borderTopColor: theme.mint,
                borderRightColor: theme.mint,
                borderBottomColor: theme.mint,
              },
            ]}
          />

          <View style={[styles.foodRingCenter, { backgroundColor: foodSurfaceStrong }]}>
            <Text style={[styles.foodRingGoal, { color: foodTextSoft }]}>OBJETIVO = 2100</Text>
            <Text style={[styles.foodRingCalories, { color: foodTextStrong }]}>{selectedMealCalories.toLocaleString()}</Text>
            <Text style={[styles.foodRingCaption, { color: foodTextMuted }]} numberOfLines={2}>
              CALORIAS CONSUMIDAS
            </Text>
          </View>
        </View>

        <View style={styles.foodMacroRow}>
          {renderMacroPill("CARBS", selectedCarbs, 184, theme.accent)}
          {renderMacroPill("PROTEINA", selectedProtein, 184, theme.mint)}
          {renderMacroPill("GRASA", selectedFat, 70, theme.lime)}
        </View>

        <View style={styles.foodFooterRow}>
          <Pressable
            style={[styles.foodRegisteredPill, { backgroundColor: foodSurfaceSecondary }]}
            onPress={() => setStatsMealsExpanded((current) => !current)}
          >
            <Ionicons name="restaurant-outline" size={16} color={foodTextStrong} />
            <Text style={[styles.foodRegisteredText, { color: foodTextStrong }]}>Registrado: {registeredMeals}</Text>
            <Ionicons
              name={statsMealsExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={foodTextMuted}
            />
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.foodRegisteredDropdown,
            {
              backgroundColor: foodSurfaceSecondary,
              height: statsMealsExpandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, statsMealsContentHeight],
              }),
              opacity: statsMealsExpandAnim,
              transform: [
                {
                  translateY: statsMealsExpandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {statsMealLogsLoading ? (
            <View style={styles.foodRegisteredLoading}>
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.foodRegisteredEmptyText, { color: foodTextMuted }]}>
                Cargando comidas...
              </Text>
            </View>
          ) : registeredMealsPreview.length > 0 ? (
            registeredMealsPreview.map((meal) => (
              <View key={meal.id} style={[styles.foodRegisteredItem, { borderBottomColor: foodRingTrack }]}>
                <View style={[styles.foodRegisteredThumb, { backgroundColor: foodSurfaceStrong }]}>
                  {meal.imageUrl ? (
                    <Image source={{ uri: meal.imageUrl }} style={styles.foodRegisteredThumbImage} />
                  ) : (
                    <Ionicons name="image-outline" size={18} color={foodTextSoft} />
                  )}
                </View>

                <View style={styles.foodRegisteredInfo}>
                  <Text style={[styles.foodRegisteredItemTitle, { color: foodTextStrong }]} numberOfLines={1}>
                    {meal.title}
                  </Text>
                  <Text style={[styles.foodRegisteredItemText, { color: foodTextMuted }]} numberOfLines={2}>
                    {meal.description}
                  </Text>
                </View>

                <View style={styles.foodRegisteredCaloriesBlock}>
                  <Text style={[styles.foodRegisteredCalories, { color: theme.accent }]}>
                    {meal.calories}
                  </Text>
                  <Text style={[styles.foodRegisteredCaloriesUnit, { color: foodTextSoft }]}>kcal</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.foodRegisteredLoading}>
              <Text style={[styles.foodRegisteredEmptyText, { color: foodTextMuted }]}>
                Todavia no hay comidas registradas.
              </Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    );
  }

  function renderComingSoonPage(view: PlaceholderView) {
    const config: {
      eyebrow: string;
      icon: ComponentProps<typeof Ionicons>["name"];
      colors: readonly [string, string, string];
      accent: string;
      copy: string;
    } =
      view === "steps"
        ? {
            eyebrow: "Pasos",
            icon: "footsteps-outline" as const,
            colors: ["#0F1115", "#181C22", "#101216"] as const,
            accent: "#A7F86E",
            copy: "Estamos preparando una vista de movimiento con progreso diario, metas y tendencias.",
          }
        : {
            eyebrow: "Recomendaciones",
            icon: "sparkles-outline" as const,
            colors: ["#151110", "#211A17", "#130F0E"] as const,
            accent: "#FFB866",
            copy: "Aqui vas a ver recomendaciones inteligentes y accionables, con el mismo look limpio.",
          };

    return (
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.comingSoonCard}
      >
        <View style={[styles.comingSoonIconWrap, { borderColor: `${config.accent}33` }]}>
          <Ionicons name={config.icon} size={28} color={config.accent} />
        </View>
        <Text style={[styles.comingSoonEyebrow, { color: config.accent }]}>{config.eyebrow}</Text>
        <Text style={styles.comingSoonTitle}>Coming Soon</Text>
        <Text style={styles.comingSoonText}>{config.copy}</Text>
      </LinearGradient>
    );
  }

  function renderStatsScreen() {
    return (
      <View style={styles.screen}>
        <View style={[styles.statsTabBar, { backgroundColor: theme.cardMuted }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.statsTabIndicator,
              {
                width: statsTabWidth,
                transform: [{ translateX: statsTabIndicatorTranslateX }],
              },
            ]}
          >
            <LinearGradient
              colors={
                visualMode === "light"
                  ? ["#17130F", "#2A211A"]
                  : ["#F7F1E6", "#FFFFFF"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsTabIndicatorFill}
            />
          </Animated.View>

          {statsTabs.map((tab) => {
            const active = statsView === tab.key;

            return (
              <Pressable
                key={tab.key}
                style={styles.statsTabButton}
                onPress={() => scrollToStatsView(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={active ? (visualMode === "light" ? "#FFFFFF" : "#17130F") : theme.muted}
                />
                <Text
                  style={[
                    styles.statsTabLabel,
                    {
                      color: active ? (visualMode === "light" ? "#FFFFFF" : "#17130F") : theme.muted,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.ScrollView
          ref={statsPagerRef}
          horizontal
          pagingEnabled
          scrollEnabled={!statsPagerLocked && !statsMonthPickerExpanded}
          bounces={false}
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          snapToAlignment="start"
          snapToInterval={statsPageWidth}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / statsPageWidth);
            const nextView = statsTabs[index]?.key ?? "food";
            setStatsView(nextView);
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: statsScrollX } } }],
            { useNativeDriver: false },
          )}
        >
          {statsTabs.map((tab, index) => (
            <View key={tab.key} style={[styles.statsPage, { width: statsPageWidth }]}>
              <Animated.View style={getStatsPageMotion(index)}>
                {tab.key === "food" ? renderFoodStatsPage() : renderComingSoonPage(tab.key)}
              </Animated.View>
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    );
  }

  function renderCameraOnlyScreen() {
    return (
      <View style={styles.cameraOnlyRoot}>
        <StatusBar hidden />
        <Pressable
          style={styles.cameraBackButton}
          onPress={closeCameraScreen}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        {cameraPermission?.granted ? (
          imageAsset && scannerMode === "food" ? (
            <Pressable style={styles.cameraOnlyPreview} onPress={() => setImageAsset(null)}>
              <Image source={{ uri: imageAsset.uri }} style={styles.cameraOnlyPreview} />
            </Pressable>
          ) : (
            <View style={styles.cameraOnlyPreview}>
              <CameraView
                ref={cameraRef}
                style={styles.cameraOnlyPreview}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
                }}
                onBarcodeScanned={scannerMode === "barcode" ? handleBarcodeScanned : undefined}
                onCameraReady={() => setCameraReady(true)}
              />
            </View>
          )
        ) : (
          <View style={styles.cameraOnlyPreview} />
        )}

        <View pointerEvents="none" style={styles.cameraOverlay}>
          <View style={[styles.cameraOverlayBlock, styles.cameraOverlayTop]} />
          <View style={[styles.cameraOverlayBlock, styles.cameraOverlayBottom]} />
          <View style={[styles.cameraOverlayBlock, styles.cameraOverlayLeft]} />
          <View style={[styles.cameraOverlayBlock, styles.cameraOverlayRight]} />

          <View style={styles.cameraScanFrame}>
            <View style={[styles.cameraScanCorner, styles.cameraScanCornerTopLeft]} />
            <View style={[styles.cameraScanCorner, styles.cameraScanCornerTopRight]} />
            <View style={[styles.cameraScanCorner, styles.cameraScanCornerBottomLeft]} />
            <View style={[styles.cameraScanCorner, styles.cameraScanCornerBottomRight]} />
          </View>
        </View>

        {scannerMode === "food" ? (
          <Pressable
            style={styles.cameraCaptureButton}
            onPress={imageAsset ? () => setImageAsset(null) : captureFoodPhoto}
            disabled={!imageAsset && !cameraReady}
          >
            <View style={styles.cameraCaptureButtonInner} />
          </Pressable>
        ) : null}

        <View style={styles.cameraOnlyTabs}>
          <Pressable
            style={[
              styles.cameraOnlyTab,
              scannerMode === "food" && styles.cameraOnlyTabActive,
            ]}
            onPress={() => {
              setScannerMode("food");
              setBarcodeResult(null);
            }}
          >
            <Ionicons
              name="scan-outline"
              size={19}
              color={scannerMode === "food" ? "#000000" : "#FFFFFF"}
            />
            <Text
              style={[
                styles.cameraOnlyTabText,
                scannerMode === "food" && styles.cameraOnlyTabTextActive,
              ]}
              numberOfLines={1}
            >
              Escaner comida
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.cameraOnlyTab,
              scannerMode === "barcode" && styles.cameraOnlyTabActive,
            ]}
            onPress={() => {
              setScannerMode("barcode");
              setBarcodeResult(null);
              setImageAsset(null);
            }}
          >
            <Ionicons
              name="barcode-outline"
              size={19}
              color={scannerMode === "barcode" ? "#000000" : "#FFFFFF"}
            />
            <Text
              style={[
                styles.cameraOnlyTabText,
                scannerMode === "barcode" && styles.cameraOnlyTabTextActive,
              ]}
              numberOfLines={1}
            >
              Escanear barcode
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.cameraHistoryButton}
          onPress={() => {
            setNutritionView("history");
            setActiveTab("nutrition");
          }}
        >
          <Ionicons name="time-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  function renderNutritionScreen() {
    return (
      <View style={styles.screen}>
        <View style={[styles.scannerShell, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
          <View style={styles.scannerHeader}>
            <View>
              <Text style={[styles.scannerEyebrow, { color: theme.accent }]}>Nutricion IA</Text>
              <Text style={[styles.scannerTitle, { color: theme.text }]}>
                {scannerMode === "food" ? "Escanea tu comida" : "Escanea un barcode"}
              </Text>
            </View>
            <View style={[styles.scannerModePill, { backgroundColor: theme.cardMuted }]}>
              <Text style={[styles.scannerModeText, { color: theme.muted }]}>
                {scannerMode === "food" ? "Foto" : "Codigo"}
              </Text>
            </View>
          </View>

          <View style={[styles.cameraFrame, { backgroundColor: theme.cardMuted }]}>
            {cameraPermission?.granted ? (
              imageAsset && scannerMode === "food" ? (
                <Image source={{ uri: imageAsset.uri }} style={styles.cameraPreview} />
              ) : (
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraPreview}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
                  }}
                  onBarcodeScanned={scannerMode === "barcode" ? handleBarcodeScanned : undefined}
                  onCameraReady={() => setCameraReady(true)}
                />
              )
            ) : (
              <View style={styles.cameraPermissionBox}>
                <Text style={[styles.previewTitle, { color: theme.text }]}>Camara no activada</Text>
                <Text style={[styles.previewText, { color: theme.muted }]}>
                  Activa la camara para escanear comida o codigos de barra.
                </Text>
                <Pressable style={[styles.primaryButton, styles.cameraPermissionButton]} onPress={requestCameraPermission}>
                  <Text style={styles.primaryButtonText}>Activar camara</Text>
                </Pressable>
              </View>
            )}

            {cameraPermission?.granted ? (
              <View pointerEvents="none" style={[styles.scanGuide, { borderColor: theme.accent }]}>
                <View style={[styles.scanDot, { backgroundColor: theme.accent }]} />
              </View>
            ) : null}
          </View>

          <View style={[styles.scannerBottomSheet, { backgroundColor: theme.cardMuted, borderColor: theme.stroke }]}>
            <View style={styles.scannerTabs}>
              <Pressable
                style={[
                  styles.scannerTab,
                  { backgroundColor: scannerMode === "food" ? theme.accent : theme.card },
                ]}
                onPress={() => {
                  setScannerMode("food");
                  setBarcodeResult(null);
                }}
              >
                <Text style={[styles.scannerTabText, { color: scannerMode === "food" ? theme.background : theme.text }]}>
                  Escaner comida
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.scannerTab,
                  { backgroundColor: scannerMode === "barcode" ? theme.accent : theme.card },
                ]}
                onPress={() => {
                  setScannerMode("barcode");
                  setBarcodeResult(null);
                }}
              >
                <Text style={[styles.scannerTabText, { color: scannerMode === "barcode" ? theme.background : theme.text }]}>
                  Escanear barcode
                </Text>
              </Pressable>
            </View>

            {scannerMode === "food" ? (
              <>
                <View style={styles.scannerActions}>
                  <Pressable style={[styles.secondaryButton, styles.scannerActionButton, { backgroundColor: theme.card }]} onPress={pickImage}>
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Galeria</Text>
                  </Pressable>
                  <Pressable style={[styles.captureButton, { backgroundColor: theme.accent }]} onPress={captureFoodPhoto}>
                    <View style={[styles.captureButtonInner, { borderColor: theme.background }]} />
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, styles.scannerActionButton, { backgroundColor: theme.card }]}
                    onPress={() => {
                      setImageAsset(null);
                      setAnalysis(null);
                      setStatusMessage("Camara lista para una nueva foto.");
                    }}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Repetir</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.primaryButton, (!imageAsset || loading) && styles.buttonDisabled]}
                  onPress={analyzeCurrentMeal}
                  disabled={!imageAsset || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Analizar comida</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={[styles.barcodeResultCard, { backgroundColor: theme.card, borderColor: theme.stroke }]}>
                <Text style={[styles.barcodeLabel, { color: theme.muted }]}>Resultado del barcode</Text>
                <Text style={[styles.barcodeValue, { color: theme.text }]} numberOfLines={2}>
                  {barcodeResult?.data ?? "Apunta la camara hacia el codigo de barras."}
                </Text>
                {barcodeResult ? (
                  <Pressable
                    style={[styles.secondaryButton, { backgroundColor: theme.cardMuted }]}
                    onPress={() => setBarcodeResult(null)}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Escanear otro</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            <Text style={[styles.helperText, { color: theme.muted }]}>
              {statusMessage ?? "Escanea, captura y analiza tu comida desde la camara."}
            </Text>
          </View>
        </View>

        {analysis ? <MacroResultCard analysis={analysis} mode={wellnessCardMode} /> : null}
      </View>
    );
  }

  function renderTipsScreen() {
    return (
      <View style={styles.screen}>
        {renderComingSoonPage("recommendations")}
      </View>
    );
  }

  function renderProfileScreen() {
    return (
      <View style={styles.profileScreen}>
        <Animated.View
          style={[
            {
              opacity: mainScrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [1, 0.94],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: ambientPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={profileHeroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHeroCard}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.profileHeroGlow,
                { backgroundColor: profileHeroGlowColor },
                {
                  transform: [
                    {
                      translateX: ambientPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 16],
                      }),
                    },
                    {
                      scale: ambientPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1.08],
                      }),
                    },
                  ],
                },
              ]}
            />

            <View style={styles.profileHeroTopRow}>
              <View style={[styles.profileHeroPill, { backgroundColor: profileHeroPillGlassColor }]}>
                <Text style={[styles.profileHeroPillText, { color: profileHeroPillTextColor }]}>Perfil premium</Text>
              </View>
              <View style={[styles.profileHeroPill, { backgroundColor: profileHeroPillDarkColor }]}>
                <Text style={[styles.profileHeroPillText, { color: profileHeroPillTextColor }]}>{profileStatusText}</Text>
              </View>
            </View>

            <View style={styles.profileHeroIdentityRow}>
              <View style={[styles.profileAvatarHero, { backgroundColor: profileHeroAvatarColor }]}>
                <Text style={[styles.profileAvatarHeroText, { color: profileHeroAvatarTextColor }]}>{profileInitial}</Text>
              </View>

              <View style={styles.profileHeroIdentityText}>
                <Text style={[styles.profileHeroTitle, { color: profileHeroTitleColor }]}>
                  {fullName.trim() || "Tu espacio Bioma"}
                </Text>
                <Text style={[styles.profileHeroSubtitle, { color: profileHeroSubtitleColor }]}>
                  {email.trim() || "Conecta tu cuenta para desbloquear historial, sincronizacion y continuidad."}
                </Text>
              </View>
            </View>

            <View style={styles.profileHeroStatsRow}>
              <View style={styles.profileHeroStat}>
                <Text style={[styles.profileHeroStatValue, { color: profileHeroStatValueColor }]}>{profileCompletionValue}%</Text>
                <Text style={[styles.profileHeroStatLabel, { color: profileHeroStatLabelColor }]}>perfil listo</Text>
              </View>
              <View style={[styles.profileHeroDivider, { backgroundColor: profileHeroDividerColor }]} />
              <View style={styles.profileHeroStat}>
                <Text style={[styles.profileHeroStatValue, { color: profileHeroStatValueColor }]}>{userId ? "Activa" : "Pendiente"}</Text>
                <Text style={[styles.profileHeroStatLabel, { color: profileHeroStatLabelColor }]}>sincronizacion</Text>
              </View>
              <View style={[styles.profileHeroDivider, { backgroundColor: profileHeroDividerColor }]} />
              <View style={styles.profileHeroStat}>
                <Text style={[styles.profileHeroStatValue, { color: profileHeroStatValueColor }]}>{visualMode === "light" ? "Claro" : "Oscuro"}</Text>
                <Text style={[styles.profileHeroStatLabel, { color: profileHeroStatLabelColor }]}>modo visual</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={{
            opacity: mainScrollY.interpolate({
              inputRange: [40, 180],
              outputRange: [0.74, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: mainScrollY.interpolate({
                  inputRange: [40, 180],
                  outputRange: [28, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={visualMode === "light" ? ["#FFFFFF", "#F6F0E7"] : ["#111917", "#0D1412"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileAccountCard, { borderColor: profilePanelStroke }]}
          >
            <View style={styles.profileSectionHeader}>
              <Text style={[styles.profileSectionEyebrow, { color: theme.accent }]}>CUENTA</Text>
              <Text style={[styles.profileSectionTitle, { color: profileTextStrong }]}>
                Identidad, tema y conexion en una sola vista.
              </Text>
              <Text style={[styles.profileSectionText, { color: profileTextMuted }]}>
                Todo esta ordenado para que la app se sienta personal, consistente y lista para crecer contigo.
              </Text>
            </View>

            <View style={[styles.profileThemeCard, { backgroundColor: profilePanelAlt, borderColor: profilePanelStroke }]}>
              <View style={styles.themeToggleTextBlock}>
                <Text style={[styles.themeToggleTitle, { color: profileTextStrong }]}>Modo claro</Text>
                <Text style={[styles.themeToggleText, { color: profileTextMuted }]}>
                  Cambia toda la interfaz entre el estilo fitness oscuro y una version clara.
                </Text>
              </View>
              <Pressable
                style={[
                  styles.themeSwitch,
                  { backgroundColor: visualMode === "light" ? theme.accent : theme.stroke },
                ]}
                onPress={() => setVisualMode((current) => (current === "light" ? "dark" : "light"))}
              >
                <View
                  style={[
                    styles.themeSwitchKnob,
                    visualMode === "light" && styles.themeSwitchKnobActive,
                  ]}
                />
              </Pressable>
            </View>

            <View style={styles.profileFieldsStack}>
              <View style={[styles.profileFieldShell, { backgroundColor: profilePanelAlt, borderColor: profilePanelStroke }]}>
                <Text style={[styles.profileFieldLabel, { color: profileTextSoft }]}>Nombre</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nombre completo"
                  placeholderTextColor={profileTextSoft}
                  style={[styles.profileFieldInput, { color: profileTextStrong }]}
                />
              </View>
              <View style={[styles.profileFieldShell, { backgroundColor: profilePanelAlt, borderColor: profilePanelStroke }]}>
                <Text style={[styles.profileFieldLabel, { color: profileTextSoft }]}>Correo</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@bioma.app"
                  placeholderTextColor={profileTextSoft}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.profileFieldInput, { color: profileTextStrong }]}
                />
              </View>
            </View>

            <View style={styles.profileActionBlock}>
              <Pressable
                style={[
                  styles.profilePrimaryButton,
                  { backgroundColor: theme.accent },
                  bootstrapLoading && styles.buttonDisabled,
                ]}
                onPress={connectProfile}
                disabled={bootstrapLoading}
              >
                {bootstrapLoading ? (
                  <ActivityIndicator color={visualMode === "light" ? "#FFFFFF" : "#07110E"} />
                ) : (
                  <Text style={[styles.profilePrimaryButtonText, { color: visualMode === "light" ? "#FFFFFF" : "#07110E" }]}>
                    {userId ? "Actualizar perfil" : "Conectar perfil"}
                  </Text>
                )}
              </Pressable>

              <View style={[styles.profileStatusStrip, { backgroundColor: profilePanelAlt }]}>
                <Text style={[styles.profileStatusStripText, { color: profileTextMuted }]}>
                  {userId ? `Perfil listo. ID de usuario: ${userId}` : "Aun no hay perfil enlazado."}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={{
            opacity: mainScrollY.interpolate({
              inputRange: [140, 320],
              outputRange: [0.56, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: mainScrollY.interpolate({
                  inputRange: [140, 320],
                  outputRange: [36, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <View style={[styles.profileDeviceWrap, { backgroundColor: profilePanelColor, borderColor: profilePanelStroke }]}>
            <HealthProviderStatusCard provider={mockHealthProvider} mode={wellnessCardMode} theme={theme} />
          </View>
        </Animated.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  cameraOnlyRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraBackButton: {
    position: "absolute",
    top: 56,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  cameraHistoryButton: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  cameraOnlyPreview: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlayBlock: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  cameraOverlayTop: {
    top: 0,
    left: 0,
    right: 0,
    height: "24%",
  },
  cameraOverlayBottom: {
    top: "64%",
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraOverlayLeft: {
    top: "24%",
    left: 0,
    width: 34,
    height: "40%",
  },
  cameraOverlayRight: {
    top: "24%",
    right: 0,
    width: 34,
    height: "40%",
  },
  cameraScanFrame: {
    position: "absolute",
    top: "24%",
    left: 34,
    right: 34,
    height: "40%",
  },
  cameraScanCorner: {
    position: "absolute",
    width: 54,
    height: 54,
    borderColor: "#FFFFFF",
  },
  cameraScanCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 24,
  },
  cameraScanCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 24,
  },
  cameraScanCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 24,
  },
  cameraScanCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 24,
  },
  cameraCaptureButton: {
    position: "absolute",
    bottom: 108,
    left: "50%",
    width: 78,
    height: 78,
    marginLeft: -39,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  cameraCaptureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },
  cameraOnlyTabs: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 26,
    flexDirection: "row",
    gap: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    padding: 8,
  },
  cameraOnlyTab: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
  },
  cameraOnlyTabActive: {
    backgroundColor: "#00C897",
  },
  cameraOnlyTabText: {
    color: "#FFFFFF",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
  },
  cameraOnlyTabTextActive: {
    color: "#000000",
  },
  safeArea: {
    flex: 1,
    backgroundColor: fitnessColors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 126,
    backgroundColor: fitnessColors.background,
  },
  screenMotion: {
    marginTop: 22,
  },
  ambientGlow: {
    position: "absolute",
    top: 58,
    right: -90,
    width: 230,
    height: 230,
    borderRadius: 115,
  },
  screen: {
    gap: 16,
  },
  homeScreen: {
    gap: 18,
  },
  homeHeroWrap: {
    overflow: "visible",
  },
  homeHeroCard: {
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    overflow: "hidden",
  },
  homeHeroAuraPrimary: {
    position: "absolute",
    top: -34,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(118, 239, 229, 0.14)",
  },
  homeHeroAuraSecondary: {
    position: "absolute",
    bottom: -52,
    left: -32,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(232, 255, 84, 0.11)",
  },
  homeHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homeHeroPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homeHeroPillDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  homeHeroPillGlass: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  homeHeroPillText: {
    color: "#F4FBF8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  homeHeroHeadingBlock: {
    marginTop: 18,
    maxWidth: "78%",
  },
  homeHeroEyebrow: {
    color: "#8FACA1",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  homeHeroTitle: {
    marginTop: 10,
    color: "#FCFFFD",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 34,
    lineHeight: 40,
  },
  homeHeroSummary: {
    marginTop: 12,
    color: "rgba(245, 251, 248, 0.74)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  homeFloatingBadge: {
    position: "absolute",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  homeFloatingBadgeLeft: {
    right: 20,
    top: 86,
  },
  homeFloatingBadgeRight: {
    right: 24,
    top: 168,
  },
  homeFloatingValue: {
    color: "#F8FFFC",
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
  },
  homeFloatingLabel: {
    color: "#88A89B",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  homeHeroBottomRow: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  homeHeroScoreBlock: {
    flex: 1.1,
  },
  homeHeroScoreLabel: {
    color: "#96B4AA",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  homeHeroScoreValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 58,
    lineHeight: 60,
  },
  homeHeroScoreCaption: {
    marginTop: 4,
    color: "#CDE0D7",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  homeHeroDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  homeHeroMiniStats: {
    flex: 1,
    gap: 16,
  },
  homeHeroMiniStat: {
    gap: 2,
  },
  homeHeroMiniValue: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 24,
  },
  homeHeroMiniLabel: {
    color: "#8BA79C",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  homeMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  homeMetricCard: {
    width: "48%",
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  homeMetricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homeMetricLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  homeMetricHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  homeMetricDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  homeMetricValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 36,
    lineHeight: 38,
  },
  homeMetricValueSmall: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
    lineHeight: 32,
  },
  homeMetricFoot: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  homeMetricTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  homeMetricFill: {
    height: "100%",
    borderRadius: 999,
  },
  homeStoryCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 18,
  },
  homeStoryHeader: {
    gap: 10,
  },
  homeSectionEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  homeStoryTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
    lineHeight: 32,
  },
  homeStoryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  homeTrendRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    height: 116,
  },
  homeTrendColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  homeTrendTrack: {
    flex: 1,
    borderRadius: 999,
    justifyContent: "flex-end",
    padding: 5,
  },
  homeTrendFill: {
    width: "100%",
    borderRadius: 999,
  },
  homeActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  homeActionButtonPrimary: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  homeActionButtonPrimaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  homeActionButtonSecondary: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  homeActionButtonSecondaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  homeInsightStack: {
    gap: 12,
  },
  homeInsightCardLarge: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  homeInsightTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 24,
    lineHeight: 28,
  },
  homeInsightText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  homeMiniCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  homeMiniCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  homeMiniCardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  homeMiniCardValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    lineHeight: 24,
  },
  profileScreen: {
    gap: 18,
  },
  profileHeroCard: {
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    overflow: "hidden",
  },
  profileHeroGlow: {
    position: "absolute",
    top: -40,
    right: -6,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(118,239,229,0.16)",
  },
  profileHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  profileHeroPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileHeroPillGlass: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  profileHeroPillDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  profileHeroPillText: {
    color: "#F4FBF8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  profileHeroIdentityRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileAvatarHero: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarHeroText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 34,
  },
  profileHeroIdentityText: {
    flex: 1,
    gap: 6,
  },
  profileHeroTitle: {
    color: "#FCFFFD",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
    lineHeight: 34,
  },
  profileHeroSubtitle: {
    color: "rgba(245, 251, 248, 0.74)",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  profileHeroStatsRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileHeroStat: {
    flex: 1,
    gap: 4,
  },
  profileHeroStatValue: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 22,
  },
  profileHeroStatLabel: {
    color: "#8BA79C",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  profileHeroDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  profileAccountCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 18,
  },
  profileSectionHeader: {
    gap: 10,
  },
  profileSectionEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  profileSectionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
    lineHeight: 32,
  },
  profileSectionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  profileThemeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  profileFieldsStack: {
    gap: 12,
  },
  profileFieldShell: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  profileFieldLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  profileFieldInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    paddingVertical: 0,
  },
  profileActionBlock: {
    gap: 12,
  },
  profilePrimaryButton: {
    minHeight: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  profilePrimaryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  profileStatusStrip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  profileStatusStripText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  profileDeviceWrap: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 10,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  hotText: {
    color: fitnessColors.accent,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
  },
  statsTabBar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    padding: 6,
    overflow: "hidden",
  },
  statsTabIndicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 6,
    borderRadius: 999,
  },
  statsTabIndicatorFill: {
    flex: 1,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statsTabButton: {
    flex: 1,
    minHeight: 60,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  statsTabLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    lineHeight: 13,
    textAlign: "center",
  },
  statsPage: {
    paddingTop: 14,
  },
  foodStatsCard: {
    borderRadius: 36,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  foodStatsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  foodStatsHeaderSpacer: {
    width: 42,
    height: 42,
  },
  foodStatsHeading: {
    flex: 1,
    alignItems: "center",
  },
  foodStatsMonthButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  foodStatsMonth: {
    color: "#28231F",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  foodStatsWeekday: {
    marginTop: 2,
    color: "#BBB1A6",
    fontFamily: "Inter_500Medium",
    fontSize: 17,
  },
  foodCalendarRow: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  foodMonthPicker: {
    marginTop: 16,
    borderRadius: 24,
    padding: 14,
    gap: 14,
  },
  foodMonthPickerYearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  foodMonthPickerYearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  foodMonthPickerYearText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  foodMonthPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  foodMonthChip: {
    minWidth: "31%",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  foodMonthChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  foodCalendarItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 10,
    minHeight: 98,
  },
  foodCalendarItemActive: {
    backgroundColor: "#FFFFFF",
  },
  foodCalendarLabel: {
    color: "#D0C8BF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.7,
  },
  foodCalendarLabelActive: {
    color: "#9F968A",
  },
  foodCalendarDay: {
    marginTop: 4,
    color: "#B9B1A8",
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  foodCalendarDayActive: {
    color: "#2A241F",
  },
  foodCalendarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 6,
    backgroundColor: "#FFB800",
  },
  foodCalendarCalories: {
    marginTop: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  foodRingShell: {
    marginTop: 22,
    alignSelf: "center",
    width: 266,
    height: 266,
    alignItems: "center",
    justifyContent: "center",
  },
  foodRingGlow: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  foodRingOuterTrack: {
    position: "absolute",
    width: 252,
    height: 252,
    borderRadius: 126,
    borderWidth: 18,
    borderColor: "#F0ECE4",
    transform: [{ rotate: "-34deg" }],
  },
  foodRingOuterProgress: {
    position: "absolute",
    width: 252,
    height: 252,
    borderRadius: 126,
    borderWidth: 18,
    borderTopColor: "#FFB800",
    borderRightColor: "#FFB800",
    borderBottomColor: "#FFB800",
    borderLeftColor: "transparent",
    transform: [{ rotate: "-34deg" }],
  },
  foodRingInnerTrack: {
    position: "absolute",
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 16,
    borderColor: "#F5F1EA",
    transform: [{ rotate: "16deg" }],
  },
  foodRingInnerProgress: {
    position: "absolute",
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 16,
    borderTopColor: "#FFC529",
    borderRightColor: "#FFC529",
    borderBottomColor: "#FFC529",
    borderLeftColor: "transparent",
    transform: [{ rotate: "16deg" }],
  },
  foodRingCenter: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  foodRingGoal: {
    color: "#D6CDC3",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  foodRingCalories: {
    marginTop: 8,
    color: "#26211D",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 40,
  },
  foodRingCaption: {
    marginTop: 4,
    color: "#4B443D",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    textAlign: "center",
    maxWidth: 112,
  },
  foodMacroRow: {
    marginTop: 24,
    flexDirection: "row",
    gap: 12,
  },
  foodMacroItem: {
    flex: 1,
  },
  foodMacroLabel: {
    color: "#91897E",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  foodMacroTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#ECE8E2",
    marginTop: 10,
    overflow: "hidden",
  },
  foodMacroFill: {
    height: "100%",
    borderRadius: 999,
  },
  foodMacroValue: {
    marginTop: 10,
    color: "#2C2520",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  foodMacroTarget: {
    color: "#B7AFA5",
    fontFamily: "Inter_500Medium",
  },
  foodFooterRow: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  foodRegisteredPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#F5F2EC",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  foodRegisteredText: {
    color: "#2F2A24",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  foodRegisteredDropdown: {
    marginTop: 14,
    borderRadius: 24,
    overflow: "hidden",
  },
  foodRegisteredLoading: {
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  foodRegisteredEmptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  foodRegisteredItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  foodRegisteredThumb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  foodRegisteredThumbImage: {
    width: "100%",
    height: "100%",
  },
  foodRegisteredInfo: {
    flex: 1,
    gap: 4,
  },
  foodRegisteredItemTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  foodRegisteredItemText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  foodRegisteredCaloriesBlock: {
    alignItems: "flex-end",
    minWidth: 52,
  },
  foodRegisteredCalories: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  foodRegisteredCaloriesUnit: {
    marginTop: 2,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  comingSoonCard: {
    minHeight: 520,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 34,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  comingSoonIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  comingSoonEyebrow: {
    marginTop: 24,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  comingSoonTitle: {
    marginTop: 10,
    color: "#FFFFFF",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 34,
  },
  comingSoonText: {
    marginTop: 12,
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  inlineUnit: {
    color: fitnessColors.muted,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  bigNumber: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 34,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 10,
  },
  themeToggleCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  themeToggleTextBlock: {
    flex: 1,
  },
  themeToggleTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 17,
  },
  themeToggleText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  themeSwitch: {
    width: 58,
    height: 34,
    borderRadius: 999,
    padding: 4,
    justifyContent: "center",
  },
  themeSwitchKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  themeSwitchKnobActive: {
    transform: [{ translateX: 24 }],
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#262626",
    color: fitnessColors.text,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  notesInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    backgroundColor: fitnessColors.cardMuted,
  },
  previewPlaceholder: {
    minHeight: 178,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#343434",
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  previewTitle: {
    color: fitnessColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  previewText: {
    marginTop: 8,
    color: fitnessColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  textModeCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#262626",
  },
  textModeTitle: {
    color: fitnessColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  textModeText: {
    marginTop: 8,
    color: fitnessColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: fitnessColors.accent,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: fitnessColors.background,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 15,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#202020",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  helperText: {
    color: fitnessColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  scannerShell: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
  },
  scannerHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  scannerEyebrow: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  scannerTitle: {
    marginTop: 8,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 27,
    lineHeight: 33,
  },
  scannerModePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scannerModeText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  cameraFrame: {
    height: 430,
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraPreview: {
    width: "100%",
    height: "100%",
  },
  cameraPermissionBox: {
    padding: 24,
    alignItems: "center",
  },
  cameraPermissionButton: {
    marginTop: 16,
    minWidth: 180,
  },
  scanGuide: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scanDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  scannerBottomSheet: {
    margin: 16,
    padding: 14,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
  },
  scannerTabs: {
    flexDirection: "row",
    gap: 10,
  },
  scannerTab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  scannerTabText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
  },
  scannerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scannerActionButton: {
    flex: 1,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
  },
  barcodeResultCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  barcodeLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  barcodeValue: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
    lineHeight: 24,
  },
});
