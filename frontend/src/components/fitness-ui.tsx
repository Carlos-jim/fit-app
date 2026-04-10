import type { ComponentProps, ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type AppTab = "home" | "stats" | "nutrition" | "tips" | "profile";
type NavIconName = ComponentProps<typeof Ionicons>["name"];

export const fitnessColors = {
  accent: "#00C897",
  background: "#050505",
  card: "#151515",
  cardMuted: "#101010",
  danger: "#FF5260",
  lime: "#E8FF54",
  mint: "#76EFE5",
  muted: "#8A8A8A",
  stroke: "#252525",
  text: "#FFFFFF",
};

export type FitnessTheme = typeof fitnessColors;

export const fitnessLightColors: FitnessTheme = {
  accent: "#00C897",
  background: "#F7F4EE",
  card: "#FFFFFF",
  cardMuted: "#F0ECE5",
  danger: "#E84E5A",
  lime: "#B2D938",
  mint: "#22BFB6",
  muted: "#76736E",
  stroke: "#E5DED4",
  text: "#17130F",
};

export function FitnessHeader(props: {
  activeTab: AppTab;
  fullName: string;
  onOpenProfile: () => void;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;
  const titleByTab: Record<AppTab, string> = {
    home: `Hola, ${props.fullName.trim() || "Bioma"}`,
    stats: "Estadisticas",
    nutrition: "Nutricion",
    tips: "Tips",
    profile: "Perfil",
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {titleByTab[props.activeTab]}
        </Text>
      </View>
      <Pressable style={styles.avatar} onPress={props.onOpenProfile}>
        <View style={[styles.avatarBody, { backgroundColor: theme.accent }]}>
          <Text style={[styles.avatarText, { color: theme.background }]}>
            {(props.fullName.trim() || "B").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export function FitnessCard(props: {
  children: ReactNode;
  style?: object;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.stroke },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}

export function CardTitle(props: {
  children: ReactNode;
  large?: boolean;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;
  return (
    <Text
      adjustsFontSizeToFit={!props.large}
      numberOfLines={props.large ? undefined : 1}
      style={[
        props.large ? styles.cardTitleLarge : styles.cardTitle,
        { color: theme.text },
      ]}
    >
      {props.children}
    </Text>
  );
}

export function CardSubtle(props: {
  children: ReactNode;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;
  return (
    <Text style={[styles.cardSubtle, { color: theme.muted }]}>
      {props.children}
    </Text>
  );
}

export function CardEyebrow(props: {
  children: ReactNode;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;
  return (
    <Text style={[styles.cardEyebrow, { color: theme.accent }]}>
      {props.children}
    </Text>
  );
}

export function DailyBalanceCard(props: {
  calories: number;
  food: number;
  exercise: number;
  phase: "day" | "night";
  city: string;
  nextTime: string;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;

  return (
    <FitnessCard style={styles.balanceCard} theme={theme}>
      <View style={styles.cardHeaderRow}>
        <View>
          <CardTitle theme={theme}>Balance diario</CardTitle>
          <CardSubtle theme={theme}>Meta - Comida + Ejercicio</CardSubtle>
        </View>
        <View style={[styles.phaseBadge, { backgroundColor: theme.cardMuted }]}>
          <Text style={[styles.phaseBadgeText, { color: theme.accent }]}>
            {props.phase === "night" ? "Noche" : "Dia"}
          </Text>
        </View>
      </View>

      <View style={styles.balanceBody}>
        <View style={styles.balanceList}>
          <BalanceLine
            icon="M"
            label="Meta"
            value={props.calories.toLocaleString()}
            color={theme.danger}
            theme={theme}
          />
          <BalanceLine
            icon="C"
            label="Comida"
            value={`${props.food}`}
            color="#6688FF"
            theme={theme}
          />
          <BalanceLine
            icon="E"
            label="Ejercicio"
            value={`${props.exercise}`}
            color={theme.accent}
            theme={theme}
          />
        </View>

        <View
          style={[
            styles.ring,
            { backgroundColor: theme.cardMuted, borderColor: theme.accent },
          ]}
        >
          <View style={[styles.ringInner, { backgroundColor: theme.accent }]}>
            <Text style={styles.ringValue}>
              {props.calories.toLocaleString()}
            </Text>
            <Text style={styles.ringUnit}>kcal</Text>
          </View>
        </View>
      </View>

      <View
        style={[styles.circadianStrip, { backgroundColor: theme.cardMuted }]}
      >
        <Text style={[styles.stripText, { color: theme.muted }]}>
          {props.city}
        </Text>
        <Text style={[styles.stripStrong, { color: theme.text }]}>
          Siguiente: {props.nextTime}
        </Text>
      </View>
    </FitnessCard>
  );
}

function BalanceLine(props: {
  icon: string;
  label: string;
  value: string;
  color: string;
  theme: FitnessTheme;
}) {
  return (
    <View style={styles.balanceLine}>
      <Text style={[styles.balanceIcon, { color: props.color }]}>
        {props.icon}
      </Text>
      <View>
        <Text style={[styles.balanceLabel, { color: props.theme.muted }]}>
          {props.label}
        </Text>
        <Text style={[styles.balanceValue, { color: props.theme.text }]}>
          {props.value}
        </Text>
      </View>
    </View>
  );
}

export function SmallProgressCard(props: {
  icon: string;
  label: string;
  value: string;
  caption: string;
  progress: number;
  accent: string;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;

  return (
    <FitnessCard style={styles.smallCard} theme={theme}>
      <CardTitle theme={theme}>{props.label}</CardTitle>
      <View style={styles.inlineMetric}>
        <Text style={[styles.smallIcon, { color: props.accent }]}>
          {props.icon}
        </Text>
        <Text style={[styles.smallValue, { color: theme.text }]}>
          {props.value}
        </Text>
      </View>
      <CardSubtle theme={theme}>{props.caption}</CardSubtle>
      <View
        style={[styles.progressTrack, { backgroundColor: theme.cardMuted }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(props.progress, 1) * 100}%`,
              backgroundColor: props.accent,
            },
          ]}
        />
      </View>
    </FitnessCard>
  );
}

export function MiniMetricCard(props: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  accent: string;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;

  return (
    <FitnessCard style={styles.miniMetricCard} theme={theme}>
      <View style={styles.inlineMetric}>
        <Text style={[styles.smallIcon, { color: props.accent }]}>
          {props.icon}
        </Text>
        <CardTitle theme={theme}>{props.label}</CardTitle>
      </View>
      <Text style={[styles.bigNumber, { color: theme.text }]}>
        {props.value}{" "}
        <Text style={[styles.inlineUnit, { color: theme.muted }]}>
          {props.unit}
        </Text>
      </Text>
    </FitnessCard>
  );
}

export function BarGraph(props: {
  values: number[];
  labels: string[];
  accentIndex: number;
  accent: string;
  tall?: boolean;
  theme?: FitnessTheme;
}) {
  const maxValue = Math.max(...props.values);
  const theme = props.theme ?? fitnessColors;

  return (
    <View style={[styles.graphRow, props.tall && styles.graphRowTall]}>
      {props.values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.graphColumn}>
          <View
            style={[
              styles.graphTrack,
              props.tall && styles.graphTrackTall,
              { backgroundColor: theme.cardMuted },
            ]}
          >
            <View
              style={[
                styles.graphFill,
                {
                  height: `${(value / maxValue) * 100}%`,
                  backgroundColor:
                    index === props.accentIndex ? props.accent : theme.stroke,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.graphLabel,
              { color: theme.muted },
              index === props.accentIndex && { color: theme.text },
            ]}
          >
            {props.labels[index] ?? ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SegmentButton(props: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;

  return (
    <Pressable
      style={[
        styles.segmentButton,
        { backgroundColor: props.active ? theme.accent : theme.cardMuted },
      ]}
      onPress={props.onPress}
    >
      <Text
        style={[
          styles.segmentButtonText,
          { color: props.active ? "#FFFFFF" : theme.text },
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

export function BottomNav(props: {
  activeTab: AppTab;
  pulseScale: Animated.Value;
  onChangeTab: (tab: AppTab) => void;
  onNutritionPress: () => void;
  nutritionMenuOpen?: boolean;
  theme?: FitnessTheme;
}) {
  const theme = props.theme ?? fitnessColors;
  const items: Array<{ tab: AppTab; label: string; icon: NavIconName }> = [
    { tab: "home", label: "Inicio", icon: "home-outline" },
    { tab: "stats", label: "Estad.", icon: "bar-chart-outline" },
    { tab: "nutrition", label: "Nutricion", icon: "add" },
    { tab: "tips", label: "Tips", icon: "sparkles-outline" },
    { tab: "profile", label: "Perfil", icon: "settings-outline" },
  ];

  return (
    <View style={styles.bottomNavWrap}>
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: theme.card, borderColor: theme.stroke },
        ]}
      >
        {items.map((item) => {
          const active = props.activeTab === item.tab;
          const isCenter = item.tab === "nutrition";

          return (
            <Pressable
              key={item.tab}
              style={styles.navItem}
              onPress={() => {
                if (isCenter) {
                  props.onNutritionPress();
                  return;
                }

                props.onChangeTab(item.tab);
              }}
            >
              {isCenter ? (
                <Animated.View
                  style={[
                    styles.navCenterButton,
                    { backgroundColor: theme.accent },
                    {
                      transform: [
                        {
                          scale:
                            active || props.nutritionMenuOpen
                              ? props.pulseScale
                              : 1,
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name={props.nutritionMenuOpen ? "close" : item.icon}
                    size={34}
                    color="#FFFFFF"
                  />
                </Animated.View>
              ) : (
                <>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          scale: active
                            ? props.pulseScale.interpolate({
                                inputRange: [1, 1.08],
                                outputRange: [1, 1.08],
                              })
                            : 1,
                        },
                        { translateY: active ? -2 : 0 },
                      ],
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={23}
                      color={active ? theme.accent : theme.muted}
                    />
                  </Animated.View>
                  <Text
                    style={[
                      styles.navLabel,
                      { color: active ? theme.text : theme.muted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerKicker: {
    color: fitnessColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    opacity: 0.86,
  },
  headerTitle: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 36,
    lineHeight: 40,
    maxWidth: 280,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  avatarBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: fitnessColors.background,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 23,
  },
  card: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: fitnessColors.card,
    borderWidth: 1,
    borderColor: fitnessColors.stroke,
    gap: 14,
  },
  balanceCard: {
    padding: 22,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: {
    color: fitnessColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 21,
  },
  cardTitleLarge: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 25,
    lineHeight: 31,
  },
  cardSubtle: {
    marginTop: 7,
    color: fitnessColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  cardEyebrow: {
    color: fitnessColors.accent,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  phaseBadge: {
    borderRadius: 999,
    backgroundColor: "#24170E",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phaseBadgeText: {
    color: fitnessColors.accent,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  balanceBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  balanceList: {
    flex: 1,
    gap: 15,
  },
  balanceLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  balanceIcon: {
    width: 28,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 22,
  },
  balanceLabel: {
    color: fitnessColors.muted,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  balanceValue: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 17,
  },
  ring: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 11,
    borderColor: fitnessColors.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#282828",
  },
  ringInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    color: fitnessColors.background,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 27,
  },
  ringUnit: {
    color: "#05785D",
    fontFamily: "Inter_500Medium",
    fontSize: 18,
  },
  circadianStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: fitnessColors.cardMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stripText: {
    color: fitnessColors.muted,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  stripStrong: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
  },
  smallCard: {
    flex: 1,
    minHeight: 184,
    justifyContent: "space-between",
  },
  inlineMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallIcon: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 24,
  },
  smallValue: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  progressTrack: {
    height: 11,
    borderRadius: 999,
    backgroundColor: "#2B2B2B",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  miniMetricCard: {
    flex: 1,
    justifyContent: "space-between",
  },
  bigNumber: {
    color: fitnessColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 34,
  },
  inlineUnit: {
    color: fitnessColors.muted,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  graphRow: {
    height: 156,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  graphRowTall: {
    height: 190,
  },
  graphColumn: {
    alignItems: "center",
    gap: 10,
  },
  graphTrack: {
    width: 13,
    height: 112,
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: "#202020",
  },
  graphTrackTall: {
    width: 14,
    height: 142,
  },
  graphFill: {
    width: "100%",
    borderRadius: 999,
  },
  graphLabel: {
    color: "#5F5F5F",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  graphLabelActive: {
    color: fitnessColors.text,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: "#202020",
  },
  segmentButtonActive: {
    backgroundColor: fitnessColors.accent,
  },
  segmentButtonText: {
    color: fitnessColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  segmentButtonTextActive: {
    color: fitnessColors.text,
  },
  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  bottomNav: {
    width: "100%",
    minHeight: 76,
    borderRadius: 38,
    backgroundColor: "#070707",
    borderWidth: 1,
    borderColor: "#2B2B2B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  navItem: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navIcon: {
    color: "#9B9B9B",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  navIconActive: {
    color: fitnessColors.text,
  },
  navLabel: {
    color: "#777777",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  navLabelActive: {
    color: fitnessColors.text,
  },
  navCenterButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: fitnessColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenterText: {
    color: fitnessColors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 35,
    lineHeight: 38,
  },
});
