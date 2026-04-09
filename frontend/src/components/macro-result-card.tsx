import { StyleSheet, Text, View } from "react-native";

import type { MealAnalysisSummary } from "../types/api";

export function MacroResultCard(props: {
  analysis: MealAnalysisSummary;
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
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.eyebrow, { color: palette.eyebrow }]}>Resultado IA</Text>
          <Text style={[styles.title, { color: palette.title }]}>
            {props.analysis.title ?? "Analisis de comida"}
          </Text>
        </View>
        <View style={[styles.confidencePill, { backgroundColor: palette.confidenceBg }]}>
          <Text style={[styles.confidenceText, { color: palette.confidenceText }]}>
            {props.analysis.confidence}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <MacroBox label="Calorias" value={`${Math.round(props.analysis.calories)}`} palette={palette} />
        <MacroBox label="Proteina" value={`${Math.round(props.analysis.proteinGrams)} g`} palette={palette} />
        <MacroBox label="Carbohidratos" value={`${Math.round(props.analysis.carbsGrams)} g`} palette={palette} />
        <MacroBox label="Grasas" value={`${Math.round(props.analysis.fatGrams)} g`} palette={palette} />
      </View>

      <Text style={[styles.subheading, { color: palette.title }]}>Ingredientes detectados</Text>
      {props.analysis.ingredients.map((ingredient, index) => (
        <View
          key={`${ingredient.name}-${index}`}
          style={[styles.ingredientRow, { borderBottomColor: palette.rowBorder }]}
        >
          <View>
            <Text style={[styles.ingredientName, { color: palette.title }]}>
              {ingredient.name}
            </Text>
            <Text style={[styles.ingredientMeta, { color: palette.muted }]}>
              {Math.round(ingredient.estimatedGrams)} g
            </Text>
          </View>
          <Text style={[styles.ingredientCalories, { color: palette.title }]}>
            {Math.round(ingredient.calories)} kcal
          </Text>
        </View>
      ))}

      {props.analysis.warnings.length > 0 ? (
        <>
          <Text style={[styles.subheading, { color: palette.title }]}>Observaciones</Text>
          {props.analysis.warnings.map((warning, index) => (
            <Text key={`${warning}-${index}`} style={[styles.warning, { color: palette.text }]}>
              - {warning}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

function MacroBox(props: { label: string; value: string; palette: typeof dayPalette }) {
  return (
    <View
      style={[
        styles.macroBox,
        { backgroundColor: props.palette.boxBg, borderColor: props.palette.border },
      ]}
    >
      <Text style={[styles.macroLabel, { color: props.palette.muted }]}>{props.label}</Text>
      <Text style={[styles.macroValue, { color: props.palette.title }]}>{props.value}</Text>
    </View>
  );
}

const dayPalette = {
  border: "#E7EEE4",
  boxBg: "#FFFFFF",
  card: "#FCFCFA",
  confidenceBg: "#FBE7E0",
  confidenceText: "#B45F48",
  eyebrow: "#97B89D",
  muted: "#718078",
  rowBorder: "#E8EDE5",
  text: "#7A665F",
  title: "#1F2C23",
};

const nightPalette = {
  border: "#3B281B",
  boxBg: "#21170F",
  card: "#15110D",
  confidenceBg: "#2C1B10",
  confidenceText: "#6EF3D1",
  eyebrow: "#6EF3D1",
  muted: "#B99B83",
  rowBorder: "#3B281B",
  text: "#CDB39B",
  title: "#FFF4EA",
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#FCFCFA",
    borderWidth: 1,
    borderColor: "#E7EEE4",
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  eyebrow: {
    color: "#97B89D",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 6,
    color: "#1F2C23",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  confidencePill: {
    borderRadius: 999,
    backgroundColor: "#FBE7E0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confidenceText: {
    color: "#B45F48",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  macroBox: {
    width: "47.8%",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EEE4",
  },
  macroLabel: {
    color: "#718078",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  macroValue: {
    marginTop: 8,
    color: "#202D24",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 22,
  },
  subheading: {
    color: "#223027",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDE5",
  },
  ingredientName: {
    color: "#233128",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  ingredientMeta: {
    marginTop: 4,
    color: "#718078",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  ingredientCalories: {
    color: "#233128",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  warning: {
    color: "#7A665F",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
});
