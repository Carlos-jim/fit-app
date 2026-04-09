import { StyleSheet, Text, View } from "react-native";

export function MetricCard(props: {
  label: string;
  value: string;
  caption: string;
  accent: string;
  mode?: "day" | "night";
}) {
  const palette = props.mode === "night" ? nightPalette : dayPalette;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: props.accent }]} />
      <Text style={[styles.label, { color: palette.label }]}>{props.label}</Text>
      <Text style={[styles.value, { color: palette.value }]}>{props.value}</Text>
      <Text style={[styles.caption, { color: palette.caption }]}>{props.caption}</Text>
    </View>
  );
}

const dayPalette = {
  border: "#E6EEE5",
  caption: "#7A877F",
  card: "#FAFBF8",
  label: "#5F6E65",
  value: "#1B2720",
};

const nightPalette = {
  border: "#3B281B",
  caption: "#B99B83",
  card: "#15110D",
  label: "#D8AF8C",
  value: "#FFF4EA",
};

const styles = StyleSheet.create({
  card: {
    width: "47.9%",
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FAFBF8",
    borderWidth: 1,
    borderColor: "#E6EEE5",
  },
  accent: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginBottom: 12,
  },
  label: {
    color: "#5F6E65",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  value: {
    marginTop: 10,
    color: "#1B2720",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 26,
  },
  caption: {
    marginTop: 6,
    color: "#7A877F",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});
