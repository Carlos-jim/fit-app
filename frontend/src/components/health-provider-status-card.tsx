import { StyleSheet, Text, View } from "react-native";

import type { HealthProvider } from "../services/wearables/health-provider";
import type { FitnessTheme } from "./fitness-ui";

export function HealthProviderStatusCard(props: {
  provider: HealthProvider;
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
      <Text style={[styles.eyebrow, { color: theme?.accent ?? palette.eyebrow }]}>Dispositivos</Text>
      <Text style={[styles.title, { color: theme?.text ?? palette.title }]}>
        Ruta de integracion con HealthKit y Health Connect
      </Text>
      <Text style={[styles.text, { color: theme?.muted ?? palette.text }]}>{props.provider.description}</Text>

      <View style={styles.row}>
        <StatusPill
          label={
            props.provider.supportsAppleHealth
              ? "Ruta de Apple Health lista"
              : "Apple Health pendiente de build nativa"
          }
          tone={props.provider.supportsAppleHealth ? "green" : "coral"}
          mode={props.mode}
          theme={theme}
        />
        <StatusPill
          label={
            props.provider.supportsHealthConnect
              ? "Ruta de Health Connect lista"
              : "Health Connect pendiente de build nativa"
          }
          tone={props.provider.supportsHealthConnect ? "green" : "coral"}
          mode={props.mode}
          theme={theme}
        />
      </View>
    </View>
  );
}

function StatusPill(props: {
  label: string;
  tone: "green" | "coral";
  mode?: "day" | "night";
  theme?: FitnessTheme;
}) {
  const palette = props.mode === "night" ? nightPalette : dayPalette;
  const pillBg = props.theme?.cardMuted ?? (props.tone === "green" ? palette.greenPill : palette.coralPill);
  const pillText = props.tone === "green" ? props.theme?.accent ?? palette.greenPillText : props.theme?.muted ?? palette.coralPillText;

  return (
    <View style={[styles.pill, { backgroundColor: pillBg }]}>
      <Text style={[styles.pillText, { color: pillText }]}>
        {props.label}
      </Text>
    </View>
  );
}

const dayPalette = {
  border: "#F1E4DB",
  card: "#FFF9F6",
  coralPill: "#FCE8E1",
  coralPillText: "#087B61",
  eyebrow: "#00A77E",
  greenPill: "#EAF4E9",
  greenPillText: "#365444",
  text: "#70665E",
  title: "#2A261F",
};

const nightPalette = {
  border: "#3D291B",
  card: "#15110D",
  coralPill: "#2C1B10",
  coralPillText: "#6EF3D1",
  eyebrow: "#6EF3D1",
  greenPill: "#1D2A18",
  greenPillText: "#A7D89C",
  text: "#CDB39B",
  title: "#FFF4EA",
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#FFF9F6",
    borderWidth: 1,
    borderColor: "#F1E4DB",
    gap: 14,
  },
  eyebrow: {
    color: "#00A77E",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    color: "#2A261F",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  text: {
    color: "#70665E",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    gap: 10,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  greenPill: {
    backgroundColor: "#EAF4E9",
  },
  coralPill: {
    backgroundColor: "#FCE8E1",
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  greenPillText: {
    color: "#365444",
  },
  coralPillText: {
    color: "#087B61",
  },
});
