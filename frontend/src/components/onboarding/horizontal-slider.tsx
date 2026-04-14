import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { FitnessTheme } from "../fitness-ui";

interface HorizontalSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  label?: string;
  theme: FitnessTheme;
  onChange: (value: number) => void;
  headerRight?: React.ReactNode;
  formatValue?: (value: number) => string;
  majorStep?: number;
  centerHint?: string;
  centerBand?: boolean;
}

const ITEM_H = 52;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;
const CARD_BG = "#111318";

export function HorizontalSlider({
  value,
  min,
  max,
  step = 1,
  unit,
  label,
  theme,
  onChange,
  headerRight,
  formatValue,
  centerHint,
}: HorizontalSliderProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollingRef = useRef(false);
  const hasMomentumRef = useRef(false);
  const lastValueRef = useRef(value);
  const pulse = useRef(new Animated.Value(1)).current;

  const precision = useMemo(() => {
    const text = `${step}`;
    const dot = text.indexOf(".");
    return dot === -1 ? 0 : text.length - dot - 1;
  }, [step]);

  const totalSteps = useMemo(
    () => Math.max(1, Math.round((max - min) / step)),
    [max, min, step],
  );

  const values = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i <= totalSteps; i++) {
      result.push(Number((min + i * step).toFixed(precision)));
    }
    return result;
  }, [min, precision, step, totalSteps]);

  const currentIndex = useMemo(() => {
    const index = Math.round((value - min) / step);
    return Math.max(0, Math.min(totalSteps, index));
  }, [min, step, totalSteps, value]);

  const displayValue = useMemo(() => {
    if (formatValue) return formatValue(value);
    return `${value.toFixed(precision)}${unit}`;
  }, [formatValue, precision, unit, value]);

  const sidePad = (PICKER_H - ITEM_H) / 2;

  // Sync scroll position when value changes programmatically
  useEffect(() => {
    if (!scrollRef.current || scrollingRef.current) return;
    scrollRef.current.scrollTo({ y: currentIndex * ITEM_H, animated: false });
  }, [currentIndex]);

  // Pulse on value change
  useEffect(() => {
    if (lastValueRef.current === value) return;
    lastValueRef.current = value;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 70, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [pulse, value]);

  const applyOffset = (offsetY: number) => {
    const rawIndex = Math.round(offsetY / ITEM_H);
    const index = Math.max(0, Math.min(totalSteps, rawIndex));
    const next = values[index];
    if (next !== undefined && next !== lastValueRef.current) {
      lastValueRef.current = next;
      Vibration.vibrate(6);
      onChange(next);
    }
  };

  const snapAndApply = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollingRef.current = false;
    hasMomentumRef.current = false;
    const rawY = event.nativeEvent.contentOffset.y;
    const snappedY = Math.round(rawY / ITEM_H) * ITEM_H;
    scrollRef.current?.scrollTo({ y: snappedY, animated: true });
    applyOffset(snappedY);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    applyOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasMomentumRef.current) snapAndApply(event);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    snapAndApply(event);
  };

  const accent = theme.accent;

  return (
    <View style={styles.card}>
      {(label || headerRight) && (
        <View style={styles.cardHeader}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {headerRight ?? null}
        </View>
      )}

      <Animated.Text
        style={[styles.displayValue, { color: accent, transform: [{ scale: pulse }] }]}
      >
        {displayValue}
      </Animated.Text>

      <View style={[styles.pickerWrap, { height: PICKER_H }]}>
        {/* Center selection highlight */}
        <View
          style={[
            styles.selectionBar,
            {
              top: sidePad,
              borderColor: `${accent}28`,
              backgroundColor: `${accent}0A`,
            },
          ]}
          pointerEvents="none"
        />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={ITEM_H}
          contentContainerStyle={[styles.scrollContent, { paddingVertical: sidePad }]}
          onScrollBeginDrag={() => {
            scrollingRef.current = true;
            hasMomentumRef.current = false;
          }}
          onMomentumScrollBegin={() => {
            hasMomentumRef.current = true;
          }}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          {values.map((tickValue, index) => {
            const isSelected = index === currentIndex;
            return (
              <View key={index} style={styles.tickItem}>
                <Text
                  style={[
                    styles.tickText,
                    isSelected
                      ? [styles.tickSelected, { color: accent }]
                      : styles.tickDefault,
                  ]}
                >
                  {precision > 0
                    ? tickValue.toFixed(precision)
                    : `${Math.round(tickValue)}`}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Fade overlays — pass-through touches */}
        <View style={styles.fadeTop} pointerEvents="none">
          <LinearGradient
            colors={[CARD_BG, `${CARD_BG}00`]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.fadeBottom} pointerEvents="none">
          <LinearGradient
            colors={[`${CARD_BG}00`, CARD_BG]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      {centerHint ? (
        <Text style={[styles.centerHint, { color: theme.muted }]}>{centerHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 12,
  },
  label: {
    color: "#484B5E",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  displayValue: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 52,
    lineHeight: 60,
    textAlign: "center",
    paddingTop: 14,
    paddingBottom: 4,
  },
  pickerWrap: {
    position: "relative",
  },
  selectionBar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: ITEM_H,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  tickItem: {
    height: ITEM_H,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  tickText: {
    textAlign: "center",
  },
  tickDefault: {
    fontFamily: "Inter_500Medium",
    fontSize: 17,
    color: "#2E3044",
  },
  tickSelected: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
  },
  centerHint: {
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    paddingBottom: 14,
    paddingTop: 6,
  },
});
