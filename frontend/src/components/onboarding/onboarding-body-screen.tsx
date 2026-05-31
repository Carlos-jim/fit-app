import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 3;

const H_CM_MIN = 140;
const H_CM_MAX = 220;
const W_KG_MIN = 40;
const W_KG_MAX = 200;
const W_LBS_MIN = 88;
const W_LBS_MAX = 440;
const FT_MIN = 4;
const FT_MAX = 7;

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
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("CM");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("KG");
  const [loading, setLoading] = useState(false);

  const [editingField, setEditingField] = useState<"heightCm" | "heightFt" | "heightIn" | "weight" | null>(null);
  const [draft, setDraft] = useState("");

  const heightPulse = useRef(new Animated.Value(1)).current;
  const weightPulse = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmInputRef = useRef<TextInput>(null);
  const ftInputRef = useRef<TextInput>(null);
  const inInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);

  const triggerPulse = useCallback((anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1.08,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const startHold = useCallback((cb: () => void) => {
    cb();
    timeoutTimer.current = setTimeout(() => {
      holdTimer.current = setInterval(cb, 80);
    }, 400);
  }, []);

  const endHold = useCallback(() => {
    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current);
      timeoutTimer.current = null;
    }
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const heightFt = useMemo(() => {
    const totalIn = heightCm / 2.54;
    let ft = Math.floor(totalIn / 12);
    let inches = Math.round(totalIn - ft * 12);
    if (inches >= 12) { ft += 1; inches = 0; }
    return ft;
  }, [heightCm]);

  const heightIn = useMemo(() => {
    const totalIn = heightCm / 2.54;
    let ft = Math.floor(totalIn / 12);
    let inches = Math.round(totalIn - ft * 12);
    if (inches >= 12) { ft += 1; inches = 0; }
    return inches;
  }, [heightCm]);

  const changeCm = useCallback(
    (delta: number) => {
      setHeightCm((prev) => {
        const next = prev + delta;
        if (next < H_CM_MIN || next > H_CM_MAX) return prev;
        triggerPulse(heightPulse);
        return next;
      });
    },
    [triggerPulse, heightPulse],
  );

  const changeFt = useCallback(
    (delta: number) => {
      setHeightCm((prev) => {
        const totalIn = prev / 2.54;
        let ft = Math.floor(totalIn / 12);
        const inches = Math.round(totalIn - ft * 12);
        ft += delta;
        if (ft < FT_MIN || ft > FT_MAX) return prev;
        const newCm = Math.round((ft * 12 + inches) * 2.54);
        if (newCm < H_CM_MIN || newCm > H_CM_MAX) return prev;
        triggerPulse(heightPulse);
        return newCm;
      });
    },
    [triggerPulse, heightPulse],
  );

  const changeIn = useCallback(
    (delta: number) => {
      setHeightCm((prev) => {
        const totalIn = prev / 2.54;
        let ft = Math.floor(totalIn / 12);
        let inches = Math.round(totalIn - ft * 12);
        if (inches >= 12) { ft += 1; inches = 0; }
        inches += delta;
        if (inches > 11) { inches = 0; ft += 1; }
        if (inches < 0) { inches = 11; ft -= 1; }
        if (ft < FT_MIN || ft > FT_MAX) return prev;
        const newCm = Math.round((ft * 12 + inches) * 2.54);
        if (newCm < H_CM_MIN || newCm > H_CM_MAX) return prev;
        triggerPulse(heightPulse);
        return newCm;
      });
    },
    [triggerPulse, heightPulse],
  );

  const displayWeight = useMemo(() => {
    if (weightUnit === "KG") {
      const snapped = Math.round(weightKg * 2) / 2;
      return Number.isInteger(snapped) ? snapped : snapped;
    }
    return Math.round(weightKg * 2.20462);
  }, [weightKg, weightUnit]);

  const changeWeight = useCallback(
    (delta: number) => {
      setWeightKg((prev) => {
        if (weightUnit === "KG") {
          const next = Math.round((prev + delta * 0.5) * 2) / 2;
          if (next < W_KG_MIN || next > W_KG_MAX) return prev;
          triggerPulse(weightPulse);
          return next;
        }
        const currentLbs = Math.round(prev * 2.20462);
        const nextLbs = currentLbs + delta;
        if (nextLbs < W_LBS_MIN || nextLbs > W_LBS_MAX) return prev;
        triggerPulse(weightPulse);
        return nextLbs / 2.20462;
      });
    },
    [weightUnit, triggerPulse, weightPulse],
  );

  const commitHeightCm = useCallback((text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= H_CM_MIN && num <= H_CM_MAX) {
      setHeightCm(num);
      triggerPulse(heightPulse);
    }
    setEditingField(null);
  }, [triggerPulse, heightPulse]);

  const commitHeightFt = useCallback((text: string) => {
    const ft = parseInt(text, 10);
    if (!isNaN(ft) && ft >= FT_MIN && ft <= FT_MAX) {
      const totalIn = heightCm / 2.54;
      const inches = Math.round(totalIn - Math.floor(totalIn / 12) * 12);
      const newCm = Math.round((ft * 12 + inches) * 2.54);
      if (newCm >= H_CM_MIN && newCm <= H_CM_MAX) {
        setHeightCm(newCm);
        triggerPulse(heightPulse);
      }
    }
    setEditingField(null);
  }, [heightCm, triggerPulse, heightPulse]);

  const commitHeightIn = useCallback((text: string) => {
    const inches = parseInt(text, 10);
    if (!isNaN(inches) && inches >= 0 && inches <= 11) {
      const totalIn = heightCm / 2.54;
      const ft = Math.floor(totalIn / 12);
      const newCm = Math.round((ft * 12 + inches) * 2.54);
      if (newCm >= H_CM_MIN && newCm <= H_CM_MAX) {
        setHeightCm(newCm);
        triggerPulse(heightPulse);
      }
    }
    setEditingField(null);
  }, [heightCm, triggerPulse, heightPulse]);

  const commitWeight = useCallback((text: string) => {
    const num = parseFloat(text);
    if (!isNaN(num)) {
      if (weightUnit === "KG") {
        const rounded = Math.round(num * 2) / 2;
        if (rounded >= W_KG_MIN && rounded <= W_KG_MAX) {
          setWeightKg(rounded);
          triggerPulse(weightPulse);
        }
      } else {
        if (num >= W_LBS_MIN && num <= W_LBS_MAX) {
          setWeightKg(num / 2.20462);
          triggerPulse(weightPulse);
        }
      }
    }
    setEditingField(null);
  }, [weightUnit, triggerPulse, weightPulse]);

  const startEditing = useCallback((field: "heightCm" | "heightFt" | "heightIn" | "weight", currentValue: string) => {
    setDraft(currentValue);
    setEditingField(field);
  }, []);

  const heightProgress =
    ((heightCm - H_CM_MIN) / (H_CM_MAX - H_CM_MIN)) * 100;

  const weightProgress =
    weightUnit === "KG"
      ? ((weightKg - W_KG_MIN) / (W_KG_MAX - W_KG_MIN)) * 100
      : ((Math.round(weightKg * 2.20462) - W_LBS_MIN) /
          (W_LBS_MAX - W_LBS_MIN)) *
        100;

  const cmDecDisabled = heightCm <= H_CM_MIN;
  const cmIncDisabled = heightCm >= H_CM_MAX;
  const ftDecDisabled = heightCm - 30.48 < H_CM_MIN;
  const ftIncDisabled = heightCm + 30.48 > H_CM_MAX;
  const inDecDisabled = heightCm - 2.54 < H_CM_MIN;
  const inIncDisabled = heightCm + 2.54 > H_CM_MAX;
  const wDecDisabled =
    weightUnit === "KG"
      ? weightKg <= W_KG_MIN
      : Math.round(weightKg * 2.20462) <= W_LBS_MIN;
  const wIncDisabled =
    weightUnit === "KG"
      ? weightKg >= W_KG_MAX
      : Math.round(weightKg * 2.20462) >= W_LBS_MAX;

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep3(
        userId,
        Number(weightKg.toFixed(1)),
        Number(heightCm.toFixed(1)),
      );
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

  const accent = theme.accent;
  const isEditingHeightCm = editingField === "heightCm";
  const isEditingHeightFt = editingField === "heightFt";
  const isEditingHeightIn = editingField === "heightIn";
  const isEditingWeight = editingField === "weight";

  return (
    <OnboardingShell
      theme={theme}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="Altura y peso"
      subtitle="Calibramos tu plan personalizado con estos datos."
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
      <View style={styles.fields}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <Ionicons name="resize-outline" size={15} color={accent} />
              <Text style={styles.label}>ALTURA</Text>
            </View>
            <UnitToggle
              leftLabel="ft/in"
              rightLabel="cm"
              activeSide={heightUnit === "FT" ? "left" : "right"}
              onPressLeft={() => setHeightUnit("FT")}
              onPressRight={() => setHeightUnit("CM")}
              accent={accent}
            />
          </View>

          {heightUnit === "CM" ? (
            <View style={styles.counterRow}>
              <AdjButton
                icon="remove"
                accent={accent}
                disabled={cmDecDisabled}
                onPressIn={() => startHold(() => changeCm(-1))}
                onPressOut={endHold}
              />
              <Pressable
                onPress={() => startEditing("heightCm", String(Math.round(heightCm)))}
                style={styles.valueWrap}
              >
                {isEditingHeightCm ? (
                  <TextInput
                    ref={cmInputRef}
                    style={styles.bigNumberInput}
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={() => commitHeightCm(draft)}
                    onBlur={() => commitHeightCm(draft)}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={3}
                    autoFocus
                    selectTextOnFocus
                  />
                ) : (
                  <Animated.Text
                    style={[
                      styles.bigNumber,
                      { transform: [{ scale: heightPulse }] },
                    ]}
                  >
                    {Math.round(heightCm)}
                  </Animated.Text>
                )}
                <Text style={styles.unitLabel}>cm</Text>
              </Pressable>
              <AdjButton
                icon="add"
                accent={accent}
                disabled={cmIncDisabled}
                onPressIn={() => startHold(() => changeCm(1))}
                onPressOut={endHold}
              />
            </View>
          ) : (
            <View style={styles.dualCounter}>
              <View style={styles.dualItem}>
                <AdjButton
                  icon="remove"
                  size="sm"
                  accent={accent}
                  disabled={ftDecDisabled}
                  onPressIn={() => startHold(() => changeFt(-1))}
                  onPressOut={endHold}
                />
                <Pressable
                  onPress={() => startEditing("heightFt", String(heightFt))}
                  style={styles.valueWrap}
                >
                  {isEditingHeightFt ? (
                    <TextInput
                      ref={ftInputRef}
                      style={styles.medNumberInput}
                      value={draft}
                      onChangeText={setDraft}
                      onSubmitEditing={() => commitHeightFt(draft)}
                      onBlur={() => commitHeightFt(draft)}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      maxLength={1}
                      autoFocus
                      selectTextOnFocus
                    />
                  ) : (
                    <Animated.Text
                      style={[
                        styles.medNumber,
                        { transform: [{ scale: heightPulse }] },
                      ]}
                    >
                      {heightFt}
                    </Animated.Text>
                  )}
                  <Text style={styles.unitSmall}>ft</Text>
                </Pressable>
                <AdjButton
                  icon="add"
                  size="sm"
                  accent={accent}
                  disabled={ftIncDisabled}
                  onPressIn={() => startHold(() => changeFt(1))}
                  onPressOut={endHold}
                />
              </View>

              <View style={styles.dualSepWrap}>
                <Text style={styles.dualSep}>&#x2032;</Text>
              </View>

              <View style={styles.dualItem}>
                <AdjButton
                  icon="remove"
                  size="sm"
                  accent={accent}
                  disabled={inDecDisabled}
                  onPressIn={() => startHold(() => changeIn(-1))}
                  onPressOut={endHold}
                />
                <Pressable
                  onPress={() => startEditing("heightIn", String(heightIn))}
                  style={styles.valueWrap}
                >
                  {isEditingHeightIn ? (
                    <TextInput
                      ref={inInputRef}
                      style={styles.medNumberInput}
                      value={draft}
                      onChangeText={setDraft}
                      onSubmitEditing={() => commitHeightIn(draft)}
                      onBlur={() => commitHeightIn(draft)}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      maxLength={2}
                      autoFocus
                      selectTextOnFocus
                    />
                  ) : (
                    <Animated.Text
                      style={[
                        styles.medNumber,
                        { transform: [{ scale: heightPulse }] },
                      ]}
                    >
                      {heightIn}
                    </Animated.Text>
                  )}
                  <Text style={styles.unitSmall}>in</Text>
                </Pressable>
                <AdjButton
                  icon="add"
                  size="sm"
                  accent={accent}
                  disabled={inIncDisabled}
                  onPressIn={() => startHold(() => changeIn(1))}
                  onPressOut={endHold}
                />
              </View>
            </View>
          )}

          <RangeBar
            progress={heightProgress}
            minLabel={heightUnit === "CM" ? "140" : "4\u20197\""}
            maxLabel={heightUnit === "CM" ? "220" : "7\u20196\""}
            accent={accent}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <Ionicons name="fitness-outline" size={15} color={accent} />
              <Text style={styles.label}>PESO</Text>
            </View>
            <UnitToggle
              leftLabel="lbs"
              rightLabel="kg"
              activeSide={weightUnit === "LBS" ? "left" : "right"}
              onPressLeft={() => setWeightUnit("LBS")}
              onPressRight={() => setWeightUnit("KG")}
              accent={accent}
            />
          </View>

          <View style={styles.counterRow}>
            <AdjButton
              icon="remove"
              accent={accent}
              disabled={wDecDisabled}
              onPressIn={() => startHold(() => changeWeight(-1))}
              onPressOut={endHold}
            />
            <Pressable
              onPress={() => startEditing("weight", String(displayWeight))}
              style={styles.valueWrap}
            >
              {isEditingWeight ? (
                <TextInput
                  ref={weightInputRef}
                  style={styles.bigNumberInput}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => commitWeight(draft)}
                  onBlur={() => commitWeight(draft)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={6}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Animated.Text
                  style={[
                    styles.bigNumber,
                    { transform: [{ scale: weightPulse }] },
                  ]}
                >
                  {displayWeight}
                </Animated.Text>
              )}
              <Text style={styles.unitLabel}>
                {weightUnit === "KG" ? "kg" : "lbs"}
              </Text>
            </Pressable>
            <AdjButton
              icon="add"
              accent={accent}
              disabled={wIncDisabled}
              onPressIn={() => startHold(() => changeWeight(1))}
              onPressOut={endHold}
            />
          </View>

          <RangeBar
            progress={weightProgress}
            minLabel={weightUnit === "KG" ? "40" : "88"}
            maxLabel={weightUnit === "KG" ? "200" : "440"}
            accent={accent}
          />
        </View>
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
  accent,
}: {
  leftLabel: string;
  rightLabel: string;
  activeSide: "left" | "right";
  onPressLeft: () => void;
  onPressRight: () => void;
  accent: string;
}) {
  return (
    <View style={styles.toggle}>
      <Pressable
        onPress={onPressLeft}
        style={[
          styles.toggleBtn,
          activeSide === "left" && { backgroundColor: accent },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            activeSide === "left" && styles.toggleTextActive,
          ]}
        >
          {leftLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={onPressRight}
        style={[
          styles.toggleBtn,
          activeSide === "right" && { backgroundColor: accent },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            activeSide === "right" && styles.toggleTextActive,
          ]}
        >
          {rightLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function AdjButton({
  icon,
  accent,
  disabled,
  onPressIn,
  onPressOut,
  size = "md",
}: {
  icon: "add" | "remove";
  accent: string;
  disabled: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  return (
    <Pressable
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      style={[
        styles.adjBtn,
        isSm && styles.adjBtnSm,
        disabled && styles.adjBtnDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={isSm ? 20 : 24}
        color={disabled ? "#2E3148" : accent}
      />
    </Pressable>
  );
}

function RangeBar({
  progress,
  minLabel,
  maxLabel,
  accent,
}: {
  progress: number;
  minLabel: string;
  maxLabel: string;
  accent: string;
}) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <View style={styles.rangeRow}>
      <Text style={styles.rangeText}>{minLabel}</Text>
      <View style={styles.rangeLine}>
        <View
          style={[styles.rangeFill, { width: `${clamped}%`, backgroundColor: accent }]}
        />
      </View>
      <Text style={styles.rangeText}>{maxLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 16,
  },
  card: {
    backgroundColor: "#111219",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 28,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#484B5E",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueWrap: {
    alignItems: "center",
    gap: 2,
  },
  bigNumber: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 64,
    lineHeight: 72,
  },
  bigNumberInput: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 64,
    lineHeight: 72,
    textAlign: "center",
    padding: 0,
    minWidth: 100,
  },
  unitLabel: {
    color: "#4B4E65",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  medNumber: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 44,
    lineHeight: 52,
  },
  medNumberInput: {
    color: "#FFFFFF",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 44,
    lineHeight: 52,
    textAlign: "center",
    padding: 0,
    minWidth: 60,
  },
  unitSmall: {
    color: "#4B4E65",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  dualCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dualItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dualSepWrap: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dualSep: {
    color: "#3E4259",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
  },
  adjBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,200,151,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,200,151,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  adjBtnSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  adjBtnDisabled: {
    backgroundColor: "#0F1018",
    borderColor: "rgba(255,255,255,0.04)",
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rangeText: {
    color: "#3A3D58",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    minWidth: 24,
    textAlign: "center",
  },
  rangeLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#1E2030",
    borderRadius: 999,
    overflow: "hidden",
  },
  rangeFill: {
    height: "100%",
    borderRadius: 999,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#09090E",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  toggleBtn: {
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    color: "#3E4259",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  toggleTextActive: {
    color: "#09090E",
    fontFamily: "Inter_700Bold",
  },
});