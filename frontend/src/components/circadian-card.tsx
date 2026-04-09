import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  CIRCADIAN_CITIES,
  formatCircadianTime,
  type CircadianCity,
  type CircadianPlan,
} from "../services/circadian-engine";
import type { FitnessTheme } from "./fitness-ui";

export function CircadianCard(props: {
  plan: CircadianPlan;
  status: string;
  loading: boolean;
  onRefreshLocation: () => void;
  onSelectCity: (city: CircadianCity) => void;
  displayMode?: "day" | "night";
  theme?: FitnessTheme;
}) {
  const isNight = (props.displayMode ?? props.plan.phase) === "night";
  const palette = isNight ? nightPalette : dayPalette;
  const theme = props.theme;
  const cityTimeZone = props.plan.city.timeZone;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme?.card ?? palette.card,
          borderColor: theme?.stroke ?? palette.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: theme?.accent ?? palette.eyebrow }]}>
            Ritmo circadiano
          </Text>
          <Text style={[styles.title, { color: theme?.text ?? palette.title }]}>
            {isNight ? "Modo noche: reduce estimulos" : "Modo dia: activa tu metabolismo"}
          </Text>
          <Text style={[styles.text, { color: theme?.muted ?? palette.text }]}>{props.status}</Text>
        </View>

        <View style={[styles.phasePill, { backgroundColor: theme?.cardMuted ?? palette.pillBg }]}>
          <Text style={[styles.phaseText, { color: theme?.accent ?? palette.pillText }]}>
            {isNight ? "Noche" : "Dia"}
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme?.cardMuted ?? palette.progressTrack }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(props.plan.daylightProgress * 100, 4)}%`,
              backgroundColor: theme?.accent ?? palette.accent,
            },
          ]}
        />
      </View>

      <View style={styles.metricRow}>
        <CircadianMetric
          label="Salida del sol"
          value={formatCircadianTime(props.plan.sunrise, cityTimeZone)}
          palette={palette}
          theme={theme}
        />
        <CircadianMetric
          label="Puesta del sol"
          value={formatCircadianTime(props.plan.sunset, cityTimeZone)}
          palette={palette}
          theme={theme}
        />
      </View>

      <View style={styles.windowGrid}>
        <View style={[styles.windowCard, { backgroundColor: theme?.cardMuted ?? palette.windowBg }]}>
          <Text style={[styles.windowLabel, { color: theme?.muted ?? palette.muted }]}>
            Ventana ideal para comer
          </Text>
          <Text style={[styles.windowValue, { color: theme?.text ?? palette.title }]}>
            {formatCircadianTime(props.plan.mealWindowStart, cityTimeZone)} -{" "}
            {formatCircadianTime(props.plan.mealWindowEnd, cityTimeZone)}
          </Text>
        </View>

        <View style={[styles.windowCard, { backgroundColor: theme?.cardMuted ?? palette.windowBg }]}>
          <Text style={[styles.windowLabel, { color: theme?.muted ?? palette.muted }]}>
            Dejar pantallas
          </Text>
          <Text style={[styles.windowValue, { color: theme?.text ?? palette.title }]}>
            {formatCircadianTime(props.plan.screenOffAt, cityTimeZone)}
          </Text>
        </View>
      </View>

      <View style={[styles.nextAnchor, { backgroundColor: theme?.cardMuted ?? palette.nextBg }]}>
        <Text style={[styles.nextLabel, { color: theme?.muted ?? palette.muted }]}>Siguiente ajuste</Text>
        <Text style={[styles.nextText, { color: theme?.text ?? palette.title }]}>
          {props.plan.nextAnchorLabel} a las{" "}
          {formatCircadianTime(props.plan.nextAnchor, cityTimeZone)}
        </Text>
      </View>

      <View style={styles.cityRow}>
        {CIRCADIAN_CITIES.map((city) => {
          const selected = city.id === props.plan.city.id;

          return (
            <Pressable
              key={city.id}
              style={[
                styles.cityButton,
                {
                  backgroundColor: selected ? theme?.accent ?? palette.accent : theme?.cardMuted ?? palette.cityBg,
                  borderColor: selected ? theme?.accent ?? palette.accent : theme?.stroke ?? palette.border,
                },
              ]}
              onPress={() => props.onSelectCity(city)}
            >
              <Text
                style={[
                  styles.cityButtonText,
                  { color: selected ? theme?.background ?? palette.selectedCityText : theme?.text ?? palette.cityText },
                ]}
              >
                {city.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.refreshButton, { backgroundColor: theme?.accent ?? palette.refreshBg }]}
        onPress={props.onRefreshLocation}
        disabled={props.loading}
      >
        {props.loading ? (
          <ActivityIndicator color={theme?.background ?? palette.refreshText} />
        ) : (
          <Text style={[styles.refreshText, { color: theme?.background ?? palette.refreshText }]}>
            Usar mi ubicacion actual
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function CircadianMetric(props: {
  label: string;
  value: string;
  palette: typeof dayPalette;
  theme?: FitnessTheme;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: props.theme?.muted ?? props.palette.muted }]}>
        {props.label}
      </Text>
      <Text style={[styles.metricValue, { color: props.theme?.text ?? props.palette.title }]}>
        {props.value}
      </Text>
    </View>
  );
}

const dayPalette = {
  accent: "#77B978",
  border: "#DDEBDD",
  card: "#F6FBF5",
  cityBg: "#FFFFFF",
  cityText: "#40614C",
  eyebrow: "#78A87E",
  muted: "#6C7D70",
  nextBg: "#EAF4E9",
  pillBg: "#E7F4E5",
  pillText: "#315A3C",
  progressTrack: "#E5F0E3",
  refreshBg: "#2E5145",
  refreshText: "#FFFFFF",
  selectedCityText: "#FFFFFF",
  text: "#617066",
  title: "#17251D",
  windowBg: "#FFFFFF",
};

const nightPalette = {
  accent: "#00C897",
  border: "#3D291B",
  card: "#120F0A",
  cityBg: "#21170F",
  cityText: "#A7F3D0",
  eyebrow: "#6EF3D1",
  muted: "#B99B83",
  nextBg: "#24170E",
  pillBg: "#2C1B10",
  pillText: "#6EF3D1",
  progressTrack: "#312115",
  refreshBg: "#00C897",
  refreshText: "#120F0A",
  selectedCityText: "#120F0A",
  text: "#D5BBA2",
  title: "#FFF4EA",
  windowBg: "#1B140E",
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 30,
    borderWidth: 1,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 25,
    lineHeight: 31,
  },
  text: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  phasePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phaseText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 6,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 20,
  },
  windowGrid: {
    gap: 10,
  },
  windowCard: {
    borderRadius: 22,
    padding: 16,
  },
  windowLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  windowValue: {
    marginTop: 6,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  nextAnchor: {
    borderRadius: 22,
    padding: 16,
  },
  nextLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  nextText: {
    marginTop: 6,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  cityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cityButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  refreshButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  refreshText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 14,
  },
});
