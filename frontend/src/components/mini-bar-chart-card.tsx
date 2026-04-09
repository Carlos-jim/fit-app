import { StyleSheet, Text, View } from "react-native";

export function MiniBarChartCard(props: {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  accent: string;
  mode?: "day" | "night";
}) {
  const maxValue = Math.max(...props.values);
  const palette = props.mode === "night" ? nightPalette : dayPalette;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.title, { color: palette.title }]}>{props.title}</Text>
      <Text style={[styles.subtitle, { color: palette.subtitle }]}>{props.subtitle}</Text>

      <View style={styles.chartRow}>
        {props.values.map((value, index) => (
          <View key={`${props.title}-${index}`} style={styles.barColumn}>
            <View style={[styles.track, { backgroundColor: palette.track }]}>
              <View
                style={[
                  styles.fill,
                  {
                    height: `${(value / maxValue) * 100}%`,
                    backgroundColor:
                      index === props.values.length - 2 ? props.accent : palette.fill,
                  },
                ]}
              />
            </View>
            <Text style={[styles.label, { color: palette.label }]}>
              {props.labels[index] ?? ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const dayPalette = {
  border: "#E6EEE5",
  card: "#FAFBF8",
  fill: "#DDE7DC",
  label: "#7B867F",
  subtitle: "#738078",
  title: "#1D2A22",
  track: "#F1F5F0",
};

const nightPalette = {
  border: "#3B281B",
  card: "#15110D",
  fill: "#3A2A1D",
  label: "#B99B83",
  subtitle: "#C7AB91",
  title: "#FFF4EA",
  track: "#21170F",
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FAFBF8",
    borderWidth: 1,
    borderColor: "#E6EEE5",
  },
  title: {
    color: "#1D2A22",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  subtitle: {
    marginTop: 6,
    color: "#738078",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  chartRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  barColumn: {
    alignItems: "center",
    gap: 8,
  },
  track: {
    width: 24,
    height: 112,
    borderRadius: 14,
    backgroundColor: "#F1F5F0",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    borderRadius: 14,
  },
  label: {
    color: "#7B867F",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
