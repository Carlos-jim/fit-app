import React, { useMemo, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  PanResponder,
  Dimensions,
} from "react-native";
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
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SLIDER_WIDTH = SCREEN_WIDTH - 48;
const TICK_COUNT = 40;

export function HorizontalSlider({
  value,
  min,
  max,
  step = 1,
  unit,
  label,
  theme,
  onChange,
}: HorizontalSliderProps) {
  const sliderRef = useRef<View>(null);

  const normalizedValue = useMemo(() => {
    const ratio = (value - min) / (max - min);
    return Math.max(0, Math.min(1, ratio));
  }, [value, min, max]);

  const getValueFromPosition = useCallback(
    (positionX: number): number => {
      const ratio = Math.max(0, Math.min(1, positionX / SLIDER_WIDTH));
      const rawValue = min + ratio * (max - min);
      const snapped = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, snapped));
    },
    [min, max, step],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_evt, gestureState) => {
          const newValue = getValueFromPosition(gestureState.x0);
          onChange(newValue);
        },
        onPanResponderMove: (_evt, gestureState) => {
          const newValue = getValueFromPosition(gestureState.moveX - gestureState.dx + gestureState.dx);
          onChange(newValue);
        },
        onPanResponderRelease: () => {},
      }),
    [getValueFromPosition, onChange],
  );

  const ticks = useMemo(() => {
    const result: { value: number; isMajor: boolean }[] = [];
    const range = max - min;
    const majorInterval = range / 4;
    for (let i = 0; i <= TICK_COUNT; i++) {
      const tickValue = min + (range * i) / TICK_COUNT;
      const isMajor = Math.abs(tickValue - Math.round(tickValue / majorInterval) * majorInterval) < range / TICK_COUNT / 2;
      result.push({ value: Math.round(tickValue), isMajor });
    }
    return result;
  }, [min, max]);

  const indicatorPosition = normalizedValue * SLIDER_WIDTH;

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        </View>
      )}

      <View style={styles.valueDisplay}>
        <Text style={[styles.valueText, { color: theme.text }]}>
          {value}
          <Text style={[styles.unitText, { color: theme.muted }]}>{unit}</Text>
        </Text>
      </View>

      <View style={styles.sliderTrack}>
        <View
          style={[
            styles.sliderBackground,
            { backgroundColor: theme.cardMuted },
          ]}
        >
          <View
            ref={sliderRef}
            style={styles.sliderTouchArea}
            {...panResponder.panHandlers}
          >
            {ticks.map((tick, index) => (
              <View
                key={index}
                style={[
                  styles.tick,
                  tick.isMajor && styles.tickMajor,
                  { backgroundColor: tick.isMajor ? theme.muted : `${theme.muted}40` },
                ]}
              />
            ))}

            <View
              style={[
                styles.indicator,
                {
                  left: indicatorPosition - 2,
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <View
                style={[
                  styles.indicatorArrow,
                  { borderBottomColor: theme.accent },
                ]}
              />
            </View>
          </View>

          <View style={styles.tickLabels}>
            {Array.from({ length: 5 }, (_, i) => {
              const tickValue = Math.round(min + ((max - min) * i) / 4);
              return (
                <Text
                  key={i}
                  style={[styles.tickLabel, { color: theme.muted }]}
                >
                  {tickValue}
                </Text>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  labelRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 20,
    fontWeight: "700",
  },
  valueDisplay: {
    alignItems: "center",
    marginBottom: 20,
  },
  valueText: {
    fontSize: 36,
    fontWeight: "800",
  },
  unitText: {
    fontSize: 24,
    fontWeight: "600",
    marginLeft: 2,
  },
  sliderTrack: {
    paddingHorizontal: 0,
  },
  sliderBackground: {
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 4,
    position: "relative",
  },
  sliderTouchArea: {
    height: 40,
    position: "relative",
  },
  tick: {
    position: "absolute",
    width: 1,
    height: 16,
    top: 0,
  },
  tickMajor: {
    height: 24,
    width: 2,
  },
  indicator: {
    position: "absolute",
    width: 4,
    height: 40,
    top: -4,
    borderRadius: 2,
  },
  indicatorArrow: {
    position: "absolute",
    top: -8,
    left: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  tickLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  tickLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
