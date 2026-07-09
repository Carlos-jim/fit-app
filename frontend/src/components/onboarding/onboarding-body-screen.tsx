import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FitnessTheme } from "../fitness-ui";
import { biomaApi } from "../../services/bioma-api";
import { handleError } from "../../utils/toast";
import { NextButton, OnboardingShell } from "../onboarding";

const TOTAL_STEPS = 7;
const STEP = 3;

const H_CM_MIN = 140;
const H_CM_MAX = 220;
const H_M_MIN = 1.4;
const H_M_MAX = 2.2;

const W_KG_MIN = 40;
const W_KG_MAX = 200;
const W_LBS_MIN = 88;
const W_LBS_MAX = 440;

const FT_MIN = 4;
const FT_MAX = 7;

type HeightUnit = "M" | "FT";
type WeightUnit = "LBS" | "KG";

type VisualMode = "dark" | "light";

interface OnboardingBodyProps {
  userId: string;
  theme: FitnessTheme;
  visualMode: VisualMode;
  onBack: () => void;
  onNext: (weightKg: number) => void;
  onToggleMode: () => void;
}

export function OnboardingBodyScreen({
  userId,
  theme,
  visualMode,
  onBack,
  onNext,
  onToggleMode,
}: OnboardingBodyProps) {
  const [weightKg, setWeightKg] = useState(54);
  const [heightCm, setHeightCm] = useState(168);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("M");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("KG");
  const [loading, setLoading] = useState(false);

  const [editingField, setEditingField] = useState<"heightM" | "heightFt" | "heightIn" | "weight" | null>(null);
  const [draft, setDraft] = useState("");

  const heightPulse = useRef(new Animated.Value(1)).current;
  const weightPulse = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mInputRef = useRef<TextInput>(null);
  const ftInputRef = useRef<TextInput>(null);
  const inInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);

  const triggerPulse = useCallback((anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1.06,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const startHold = useCallback((cb: () => void) => {
    cb();
    timeoutTimer.current = setTimeout(() => {
      holdTimer.current = setInterval(cb, 60);
    }, 350);
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

  const heightM = useMemo(() => heightCm / 100, [heightCm]);

  const heightFt = useMemo(() => {
    const totalIn = heightCm / 2.54;
    let ft = Math.floor(totalIn / 12);
    let inches = Math.round(totalIn - ft * 12);
    if (inches >= 12) {
      ft += 1;
      inches = 0;
    }
    return ft;
  }, [heightCm]);

  const heightIn = useMemo(() => {
    const totalIn = heightCm / 2.54;
    let ft = Math.floor(totalIn / 12);
    let inches = Math.round(totalIn - ft * 12);
    if (inches >= 12) {
      ft += 1;
      inches = 0;
    }
    return inches;
  }, [heightCm]);

  const changeHeightM = useCallback(
    (delta: number) => {
      setHeightCm((prev) => {
        const nextM = prev / 100 + delta;
        const nextCm = Math.round(nextM * 100);
        if (nextCm < H_CM_MIN || nextCm > H_CM_MAX) return prev;
        triggerPulse(heightPulse);
        return nextCm;
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
        if (inches >= 12) {
          ft += 1;
          inches = 0;
        }
        inches += delta;
        if (inches > 11) {
          inches = 0;
          ft += 1;
        }
        if (inches < 0) {
          inches = 11;
          ft -= 1;
        }
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
      return Math.round(weightKg * 10) / 10;
    }
    return Math.round(weightKg * 2.20462);
  }, [weightKg, weightUnit]);

  const changeWeight = useCallback(
    (delta: number) => {
      setWeightKg((prev) => {
        if (weightUnit === "KG") {
          const next = Math.round((prev + delta * 0.1) * 10) / 10;
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

  const commitHeightM = useCallback(
    (text: string) => {
      const normalized = text.replace(",", ".");
      const num = parseFloat(normalized);
      if (!isNaN(num)) {
        const nextCm = Math.round(num * 100);
        if (nextCm >= H_CM_MIN && nextCm <= H_CM_MAX) {
          setHeightCm(nextCm);
          triggerPulse(heightPulse);
        }
      }
      setEditingField(null);
    },
    [triggerPulse, heightPulse],
  );

  const commitHeightFt = useCallback(
    (text: string) => {
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
    },
    [heightCm, triggerPulse, heightPulse],
  );

  const commitHeightIn = useCallback(
    (text: string) => {
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
    },
    [heightCm, triggerPulse, heightPulse],
  );

  const commitWeight = useCallback(
    (text: string) => {
      const normalized = text.replace(",", ".");
      const num = parseFloat(normalized);
      if (!isNaN(num)) {
        if (weightUnit === "KG") {
          const rounded = Math.round(num * 10) / 10;
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
    },
    [weightUnit, triggerPulse, weightPulse],
  );

  const startEditing = useCallback(
    (field: "heightM" | "heightFt" | "heightIn" | "weight", currentValue: string) => {
      setDraft(currentValue);
      setEditingField(field);
    },
    [],
  );

  const heightProgress = (heightM - H_M_MIN) / (H_M_MAX - H_M_MIN);
  const weightProgress =
    weightUnit === "KG"
      ? (weightKg - W_KG_MIN) / (W_KG_MAX - W_KG_MIN)
      : (Math.round(weightKg * 2.20462) - W_LBS_MIN) / (W_LBS_MAX - W_LBS_MIN);

  const handleNext = async () => {
    setLoading(true);
    try {
      await biomaApi.onboardingStep3(
        Number(weightKg.toFixed(1)),
        Number(heightCm.toFixed(1)),
      );
      onNext(weightKg);
    } catch (err) {
      handleError(err, "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  const accent = theme.accent;
  const s = getStyles(theme);

  return (
    <OnboardingShell
      theme={theme}
      visualMode={visualMode}
      step={STEP}
      totalSteps={TOTAL_STEPS}
      title="Altura y peso"
      subtitle="Calibramos tu plan personalizado con estos datos."
      onBack={onBack}
      onToggleMode={onToggleMode}
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
      <View style={s.fields}>
        {/* Height card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.labelRow}>
              <View style={[s.iconBadge, { backgroundColor: `${accent}16` }]}>
                <Ionicons name="resize-outline" size={16} color={accent} />
              </View>
              <Text style={s.label}>Altura</Text>
            </View>
            <UnitToggle
              leftLabel="ft/in"
              rightLabel="m"
              activeSide={heightUnit === "FT" ? "left" : "right"}
              onPressLeft={() => setHeightUnit("FT")}
              onPressRight={() => setHeightUnit("M")}
              accent={accent}
              theme={theme}
            />
          </View>

          {heightUnit === "M" ? (
            <>
              <Pressable
                onPress={() => startEditing("heightM", heightM.toFixed(2).replace(".", ","))}
                style={s.valueWrap}
              >
                {editingField === "heightM" ? (
                  <TextInput
                    ref={mInputRef}
                    style={s.bigNumberInput}
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={() => commitHeightM(draft)}
                    onBlur={() => commitHeightM(draft)}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    maxLength={5}
                    autoFocus
                    selectTextOnFocus
                  />
                ) : (
                  <Animated.View
                    style={{ transform: [{ scale: heightPulse }] }}
                  >
                    <Text style={s.bigNumber}>{heightM.toFixed(2).replace(".", ",")}</Text>
                  </Animated.View>
                )}
                <Text style={s.unitLabel}>metros</Text>
              </Pressable>

              <SliderBar
                progress={heightProgress}
                minLabel="1,40 m"
                maxLabel="2,20 m"
                accent={accent}
                theme={theme}
                onChange={(ratio) => {
                  const nextM = H_M_MIN + ratio * (H_M_MAX - H_M_MIN);
                  setHeightCm(Math.round(nextM * 100));
                }}
              />
            </>
          ) : (
            <>
              <View style={s.imperialRow}>
                <Pressable
                  onPress={() => startEditing("heightFt", String(heightFt))}
                  style={s.imperialValueWrap}
                >
                  {editingField === "heightFt" ? (
                    <TextInput
                      ref={ftInputRef}
                      style={s.medNumberInput}
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
                    <Animated.View
                      style={{ transform: [{ scale: heightPulse }] }}
                    >
                      <Text style={s.medNumber}>{heightFt}</Text>
                    </Animated.View>
                  )}
                  <Text style={s.unitSmall}>ft</Text>
                </Pressable>

                <Text style={s.imperialSep}>′</Text>

                <Pressable
                  onPress={() => startEditing("heightIn", String(heightIn))}
                  style={s.imperialValueWrap}
                >
                  {editingField === "heightIn" ? (
                    <TextInput
                      ref={inInputRef}
                      style={s.medNumberInput}
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
                    <Animated.View
                      style={{ transform: [{ scale: heightPulse }] }}
                    >
                      <Text style={s.medNumber}>{heightIn}</Text>
                    </Animated.View>
                  )}
                  <Text style={s.unitSmall}>in</Text>
                </Pressable>
              </View>

              <SliderBar
                progress={heightProgress}
                minLabel={`${FT_MIN}′0″`}
                maxLabel={`${FT_MAX}′0″`}
                accent={accent}
                theme={theme}
                onChange={(ratio) => {
                  const nextM = H_M_MIN + ratio * (H_M_MAX - H_M_MIN);
                  setHeightCm(Math.round(nextM * 100));
                }}
              />
            </>
          )}

          <View style={s.adjRow}>
            <AdjButton
              icon="remove"
              accent={accent}
              disabled={heightUnit === "M" ? heightCm <= H_CM_MIN : heightCm - 2.54 < H_CM_MIN}
              onPressIn={() =>
                startHold(() => (heightUnit === "M" ? changeHeightM(-0.01) : changeIn(-1)))
              }
              onPressOut={endHold}
              theme={theme}
            />
            <AdjButton
              icon="add"
              accent={accent}
              disabled={heightUnit === "M" ? heightCm >= H_CM_MAX : heightCm + 2.54 > H_CM_MAX}
              onPressIn={() =>
                startHold(() => (heightUnit === "M" ? changeHeightM(0.01) : changeIn(1)))
              }
              onPressOut={endHold}
              theme={theme}
            />
          </View>
        </View>

        {/* Weight card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.labelRow}>
              <View style={[s.iconBadge, { backgroundColor: `${accent}16` }]}>
                <Ionicons name="fitness-outline" size={16} color={accent} />
              </View>
              <Text style={s.label}>Peso</Text>
            </View>
            <UnitToggle
              leftLabel="lbs"
              rightLabel="kg"
              activeSide={weightUnit === "LBS" ? "left" : "right"}
              onPressLeft={() => setWeightUnit("LBS")}
              onPressRight={() => setWeightUnit("KG")}
              accent={accent}
              theme={theme}
            />
          </View>

          <Pressable
            onPress={() => startEditing("weight", String(displayWeight).replace(".", ","))}
            style={s.valueWrap}
          >
            {editingField === "weight" ? (
              <TextInput
                ref={weightInputRef}
                style={s.bigNumberInput}
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
              <Animated.View style={{ transform: [{ scale: weightPulse }] }}>
                <Text style={s.bigNumber}>{String(displayWeight).replace(".", ",")}</Text>
              </Animated.View>
            )}
            <Text style={s.unitLabel}>{weightUnit === "KG" ? "kilogramos" : "libras"}</Text>
          </Pressable>

          <SliderBar
            progress={weightProgress}
            minLabel={weightUnit === "KG" ? "40 kg" : "88 lbs"}
            maxLabel={weightUnit === "KG" ? "200 kg" : "440 lbs"}
            accent={accent}
            theme={theme}
            onChange={(ratio) => {
              if (weightUnit === "KG") {
                const next = W_KG_MIN + ratio * (W_KG_MAX - W_KG_MIN);
                setWeightKg(Math.round(next * 10) / 10);
              } else {
                const nextLbs = W_LBS_MIN + ratio * (W_LBS_MAX - W_LBS_MIN);
                setWeightKg(Math.round(nextLbs / 2.20462 * 10) / 10);
              }
            }}
          />

          <View style={s.adjRow}>
            <AdjButton
              icon="remove"
              accent={accent}
              disabled={
                weightUnit === "KG"
                  ? weightKg <= W_KG_MIN
                  : Math.round(weightKg * 2.20462) <= W_LBS_MIN
              }
              onPressIn={() => startHold(() => changeWeight(-1))}
              onPressOut={endHold}
              theme={theme}
            />
            <AdjButton
              icon="add"
              accent={accent}
              disabled={
                weightUnit === "KG"
                  ? weightKg >= W_KG_MAX
                  : Math.round(weightKg * 2.20462) >= W_LBS_MAX
              }
              onPressIn={() => startHold(() => changeWeight(1))}
              onPressOut={endHold}
              theme={theme}
            />
          </View>
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
  theme,
}: {
  leftLabel: string;
  rightLabel: string;
  activeSide: "left" | "right";
  onPressLeft: () => void;
  onPressRight: () => void;
  accent: string;
  theme: FitnessTheme;
}) {
  return (
    <View
      style={[
        styles.toggle,
        { backgroundColor: theme.cardMuted, borderColor: theme.stroke },
      ]}
    >
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
            { color: activeSide === "left" ? theme.background : theme.muted },
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
            { color: activeSide === "right" ? theme.background : theme.muted },
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
  theme,
}: {
  icon: "add" | "remove";
  accent: string;
  disabled: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  theme: FitnessTheme;
}) {
  return (
    <Pressable
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      style={[
        styles.adjBtn,
        disabled && { backgroundColor: theme.cardMuted, borderColor: theme.stroke },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? theme.muted : accent}
      />
    </Pressable>
  );
}

function SliderBar({
  progress,
  minLabel,
  maxLabel,
  accent,
  theme,
  onChange,
}: {
  progress: number;
  minLabel: string;
  maxLabel: string;
  accent: string;
  theme: FitnessTheme;
  onChange: (ratio: number) => void;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const trackWidth = useRef(0);
  const thumbAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    if (trackWidth.current > 0) {
      const x = clamped * (trackWidth.current - 28);
      thumbAnim.setValue({ x, y: 0 });
    }
  }, [clamped, thumbAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const ratio = Math.min(
          1,
          Math.max(0, evt.nativeEvent.locationX / trackWidth.current),
        );
        onChange(ratio);
      },
      onPanResponderMove: (evt) => {
        const ratio = Math.min(
          1,
          Math.max(0, evt.nativeEvent.locationX / trackWidth.current),
        );
        onChange(ratio);
      },
      onPanResponderRelease: (evt) => {
        const ratio = Math.min(
          1,
          Math.max(0, evt.nativeEvent.locationX / trackWidth.current),
        );
        onChange(ratio);
      },
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
    const x = clamped * (trackWidth.current - 28);
    thumbAnim.setValue({ x, y: 0 });
  };

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeText, { color: theme.muted }]}>{minLabel}</Text>
        <Text style={[styles.rangeText, { color: theme.muted }]}>{maxLabel}</Text>
      </View>
      <View
        style={[styles.track, { backgroundColor: theme.cardMuted }]}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.fill,
            { width: `${clamped * 100}%`, backgroundColor: accent },
          ]}
        />
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: theme.background,
              borderColor: accent,
              transform: [{ translateX: thumbAnim.x }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
  },
  toggleBtn: {
    minWidth: 46,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  adjBtn: {
    width: 64,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(0,200,151,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,200,151,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderWrap: {
    gap: 10,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  rangeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "visible",
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  thumb: {
    position: "absolute",
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});

function getStyles(theme: FitnessTheme) {
  return StyleSheet.create({
    fields: {
      gap: 18,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.stroke,
      paddingVertical: 24,
      paddingHorizontal: 22,
      gap: 22,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme.background === "#050505" ? 0.12 : 0.04,
      shadowRadius: 24,
      elevation: 4,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 16,
    },
    valueWrap: {
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
    },
    bigNumber: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 68,
      lineHeight: 76,
      letterSpacing: -1,
    },
    bigNumberInput: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 68,
      lineHeight: 76,
      textAlign: "center",
      padding: 0,
      minWidth: 140,
      letterSpacing: -1,
    },
    unitLabel: {
      color: theme.muted,
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      letterSpacing: 0.2,
    },
    imperialRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 8,
    },
    imperialValueWrap: {
      alignItems: "center",
      gap: 4,
      minWidth: 80,
    },
    imperialSep: {
      color: theme.muted,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 36,
      lineHeight: 48,
      paddingHorizontal: 6,
    },
    medNumber: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -0.5,
    },
    medNumberInput: {
      color: theme.text,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 48,
      lineHeight: 56,
      textAlign: "center",
      padding: 0,
      minWidth: 70,
      letterSpacing: -0.5,
    },
    unitSmall: {
      color: theme.muted,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
    },
    adjRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 14,
    },
  });
}
