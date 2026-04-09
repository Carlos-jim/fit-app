import { StyleSheet, Text, View } from "react-native";

import type { FitnessTheme } from "./fitness-ui";

export function RecoveryCard(props: {
  fullName: string;
  recoveryScore: number;
  recoveryLabel: string;
  readinessText: string;
  recommendation: string;
  mode?: "day" | "night";
  theme?: FitnessTheme;
}) {
  const palette = props.mode === "night" ? nightPalette : dayPalette;
  const theme = props.theme;

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
        <View>
          <Text style={[styles.eyebrow, { color: theme?.accent ?? palette.eyebrow }]}>Estado de recuperacion</Text>
          <Text style={[styles.title, { color: theme?.text ?? palette.title }]}>
            Hola, {props.fullName || "usuario Bioma"}
          </Text>
        </View>

        <View
          style={[
            styles.scoreRing,
            {
              backgroundColor: theme?.cardMuted ?? palette.scoreBg,
              borderColor: theme?.accent ?? palette.accent,
            },
          ]}
        >
          <Text style={[styles.scoreValue, { color: theme?.text ?? palette.title }]}>{props.recoveryScore}</Text>
          <Text style={[styles.scoreLabel, { color: theme?.muted ?? palette.muted }]}>puntaje</Text>
        </View>
      </View>

      <View style={[styles.statusPill, { backgroundColor: theme?.cardMuted ?? palette.pillBg }]}>
        <Text style={[styles.statusText, { color: theme?.accent ?? palette.pillText }]}>
          {props.recoveryLabel}
        </Text>
      </View>

      <Text style={[styles.recommendationTitle, { color: theme?.text ?? palette.title }]}>
        {props.readinessText}
      </Text>
      <Text style={[styles.recommendationText, { color: theme?.muted ?? palette.text }]}>
        {props.recommendation}
      </Text>
    </View>
  );
}

const dayPalette = {
  accent: "#9CC8A4",
  border: "#E5EFE4",
  card: "#F7FAF6",
  eyebrow: "#9BB49F",
  muted: "#81917F",
  pillBg: "#EAF4E9",
  pillText: "#3B6149",
  scoreBg: "#FFFFFF",
  text: "#65736A",
  title: "#1B2820",
};

const nightPalette = {
  accent: "#00C897",
  border: "#3D291B",
  card: "#15110D",
  eyebrow: "#6EF3D1",
  muted: "#B99B83",
  pillBg: "#2C1B10",
  pillText: "#6EF3D1",
  scoreBg: "#21170F",
  text: "#CDB39B",
  title: "#FFF4EA",
};

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 30,
    backgroundColor: "#F7FAF6",
    borderWidth: 1,
    borderColor: "#E5EFE4",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  eyebrow: {
    color: "#9BB49F",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 6,
    color: "#1B2820",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 30,
    lineHeight: 35,
    maxWidth: 220,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "#9CC8A4",
    backgroundColor: "#FFFFFF",
  },
  scoreValue: {
    color: "#1C2A22",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 28,
  },
  scoreLabel: {
    color: "#81917F",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: "#EAF4E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: "#3B6149",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  recommendationTitle: {
    marginTop: 16,
    color: "#23342A",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  recommendationText: {
    marginTop: 8,
    color: "#65736A",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
});
