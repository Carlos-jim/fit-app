import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { HorizontalSlider, NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 3;

type HeightUnit = "FT" | "CM";
type WeightUnit = "LBS" | "KG";

interface OnboardingBodyProps {
  userId: string;
  theme: FitnessTheme;
  onBack: () => void;
  onNext: (weightKg: number) => void;
}

export function OnboardingBodyScreen({
  userId,
  theme,
  onBack,
  onNext,
}: OnboardingBodyProps) {
  const [weightKg, setWeightKg] = useState(54);
  const [heightCm, setHeightCm] = useState(168);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("FT");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("LBS");
  const [loading, setLoading] = useState(false);

  const heightDisplayValue = useMemo(() => {
    if (heightUnit === "CM") {
      return `${Math.round(heightCm)}cm`;
    }
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    return `${feet}ft,${inches}in`;
  }, [heightCm, heightUnit]);

  const weightDisplayValue = useMemo(() => {
    if (weightUnit === "KG") {
      return `${Math.round(weightKg)}kg`;
    }
    const pounds = Math.round(weightKg * 2.20462);
    return `${pounds}lbs`;
  }, [weightKg, weightUnit]);

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep3(userId, Number(weightKg.toFixed(1)), Number(heightCm.toFixed(1)));
      onNext(weightKg);
    } catch (err) {
      Alert.alert(
        "No se pudo guardar",
        err instanceof Error ? err.message : "Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="Altura y peso"
      subtitle="Esto se utilizara para calibrar su plan personalizado."
      onBack={onBack}
      footer={
        <NextButton
          enabled
          onPress={handleNext}
          loading={loading}
          label="Siguiente"
          theme={theme}
        />
      }
    >
      <View style={styles.formFields}>
        <HorizontalSlider
          value={heightUnit === "CM" ? heightCm : heightCm / 30.48}
          min={heightUnit === "CM" ? 140 : 4}
          max={heightUnit === "CM" ? 220 : 7.5}
          step={heightUnit === "CM" ? 1 : 0.1}
          unit=""
          label="Altura"
          majorStep={heightUnit === "CM" ? 20 : 1}
          formatValue={() => heightDisplayValue}
          headerRight={
            <UnitToggle
              leftLabel="ft/in"
              rightLabel="cm"
              activeSide={heightUnit === "FT" ? "left" : "right"}
              onPressLeft={() => setHeightUnit("FT")}
              onPressRight={() => setHeightUnit("CM")}
            />
          }
          theme={theme}
          onChange={(next) => {
            if (heightUnit === "CM") {
              setHeightCm(next);
            } else {
              setHeightCm(next * 30.48);
            }
          }}
        />

        <HorizontalSlider
          value={weightUnit === "KG" ? weightKg : weightKg * 2.20462}
          min={weightUnit === "KG" ? 40 : 88}
          max={weightUnit === "KG" ? 200 : 440}
          step={weightUnit === "KG" ? 0.5 : 1}
          unit=""
          label="Peso"
          majorStep={weightUnit === "KG" ? 10 : 10}
          formatValue={() => weightDisplayValue}
          headerRight={
            <UnitToggle
              leftLabel="lbs"
              rightLabel="kg"
              activeSide={weightUnit === "LBS" ? "left" : "right"}
              onPressLeft={() => setWeightUnit("LBS")}
              onPressRight={() => setWeightUnit("KG")}
            />
          }
          theme={theme}
          onChange={(next) => {
            if (weightUnit === "KG") {
              setWeightKg(next);
            } else {
              setWeightKg(next / 2.20462);
            }
          }}
        />
      </View>
    </OnboardingShell>
  );
}

function UnitToggle({
  leftLabel,
  rightLabel,
  activeSide,
  onPressLeft,
  onPressRight,
}: {
  leftLabel: string;
  rightLabel: string;
  activeSide: "left" | "right";
  onPressLeft: () => void;
  onPressRight: () => void;
}) {
  return (
    <View style={styles.toggleWrap}>
      <Pressable
        onPress={onPressLeft}
        style={[
          styles.toggleButton,
          activeSide === "left" ? styles.toggleButtonActive : null,
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            activeSide === "left" ? styles.toggleTextActive : null,
          ]}
        >
          {leftLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={onPressRight}
        style={[
          styles.toggleButton,
          activeSide === "right" ? styles.toggleButtonActive : null,
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            activeSide === "right" ? styles.toggleTextActive : null,
          ]}
        >
          {rightLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  formFields: {
    gap: 16,
    marginTop: 8,
  },
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0F16",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toggleButton: {
    minWidth: 64,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#00C897",
  },
  toggleText: {
    color: "#454860",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  toggleTextActive: {
    color: "#0D0F16",
    fontFamily: "Inter_700Bold",
  },
});
