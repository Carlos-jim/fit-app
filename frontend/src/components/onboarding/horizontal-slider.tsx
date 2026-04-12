import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
  headerRight?: React.ReactNode;
  formatValue?: (value: number) => string;
  majorStep?: number;
  centerHint?: string;
  centerBand?: boolean;
}

const STEP_WIDTH = 22;
const MIN_MAJOR_TICKS = 4;

export function HorizontalSlider({
  value,
  min,
  max,
  step = 1,
  unit,
  label,
  theme: _theme,
  onChange,
  headerRight,
  formatValue,
  majorStep,
  centerHint,
  centerBand = false,
}: HorizontalSliderProps) {
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const scrollingRef = useRef(false);
  const lastValueRef = useRef(value);
  const pulse = useRef(new Animated.Value(1)).current;

  const precision = useMemo(() => {
    const text = `${step}`;
    const dot = text.indexOf(".");
    return dot === -1 ? 0 : text.length - dot - 1;
  }, [step]);

  const totalSteps = useMemo(() => {
    return Math.max(1, Math.round((max - min) / step));
  }, [max, min, step]);

  const values = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i <= totalSteps; i += 1) {
      result.push(Number((min + i * step).toFixed(precision)));
    }
    return result;
  }, [min, precision, step, totalSteps]);

  const resolvedMajorStep = useMemo(() => {
    if (majorStep && majorStep > 0) {
      return majorStep;
    }
    const range = max - min;
    const raw = range / MIN_MAJOR_TICKS;
    if (raw <= 1) return 1;
    if (raw <= 2) return 2;
    if (raw <= 5) return 5;
    if (raw <= 10) return 10;
    if (raw <= 20) return 20;
    return 25;
  }, [majorStep, max, min]);

  const currentIndex = useMemo(() => {
    const index = Math.round((value - min) / step);
    return Math.max(0, Math.min(totalSteps, index));
  }, [min, step, totalSteps, value]);

  const displayValue = useMemo(() => {
    if (formatValue) {
      return formatValue(value);
    }
    return `${value.toFixed(precision)}${unit}`;
  }, [formatValue, precision, unit, value]);

  const sidePadding = useMemo(() => {
    return Math.max((windowWidth - 40) / 2, 80);
  }, [windowWidth]);

  useEffect(() => {
    if (!scrollRef.current || trackWidth <= 0 || scrollingRef.current) {
      return;
    }
    const x = currentIndex * STEP_WIDTH;
    scrollRef.current.scrollTo({ x, animated: false });
  }, [currentIndex, trackWidth]);

  useEffect(() => {
    if (lastValueRef.current === value) {
      return;
    }
    lastValueRef.current = value;
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.04,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse, value]);

  const applyOffset = (offsetX: number) => {
    const rawIndex = Math.round(offsetX / STEP_WIDTH);
    const index = Math.max(0, Math.min(totalSteps, rawIndex));
    const next = values[index];
    if (next !== lastValueRef.current) {
      lastValueRef.current = next;
      onChange(next);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    applyOffset(event.nativeEvent.contentOffset.x);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollingRef.current = false;
    const rawX = event.nativeEvent.contentOffset.x;
    const snappedX = Math.round(rawX / STEP_WIDTH) * STEP_WIDTH;
    scrollRef.current?.scrollTo({ x: snappedX, animated: true });
    applyOffset(snappedX);
  };

  const getTickLabel = (tickValue: number) => {
    if (precision > 0) {
      return tickValue.toFixed(precision);
    }
    return `${Math.round(tickValue)}`;
  };

  return (
    <View style={styles.container}>
      {(label || headerRight) && (
        <View style={styles.header}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {headerRight ?? null}
        </View>
      )}

      <Animated.Text style={[styles.valueText, { transform: [{ scale: pulse }] }]}>
        {displayValue}
      </Animated.Text>

      <View style={styles.sliderShell}>
        {centerBand ? <View style={styles.centerBand} pointerEvents="none" /> : null}

        <ScrollView
          ref={scrollRef}
          horizontal
          decelerationRate="fast"
          snapToInterval={STEP_WIDTH}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: sidePadding },
          ]}
          onLayout={(event) => {
            setTrackWidth(event.nativeEvent.layout.width);
          }}
          onScrollBeginDrag={() => {
            scrollingRef.current = true;
          }}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {values.map((tickValue, index) => {
            const isMajor =
              Math.round((tickValue - min) / resolvedMajorStep) ===
              (tickValue - min) / resolvedMajorStep;
            return (
              <View key={index} style={styles.tickItem}>
                <View style={[styles.tick, isMajor ? styles.tickMajor : styles.tickMinor]} />
                {isMajor ? (
                  <Text style={styles.tickLabel}>{getTickLabel(tickValue)}</Text>
                ) : (
                  <View style={styles.tickLabelPlaceholder} />
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.centerIndicator} pointerEvents="none">
          <View style={styles.centerTriangle} />
          <View style={styles.centerLine} />
        </View>
      </View>

      {centerHint ? <Text style={styles.centerHint}>{centerHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: "#111318",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  valueText: {
    color: "#111318",
    textAlign: "center",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 46,
    lineHeight: 52,
  },
  sliderShell: {
    height: 156,
    justifyContent: "center",
  },
  centerBand: {
    position: "absolute",
    width: 92,
    top: 48,
    bottom: 52,
    alignSelf: "center",
    backgroundColor: "#E1E2E6",
    borderRadius: 4,
    zIndex: 1,
  },
  scrollContent: {
    alignItems: "flex-start",
  },
  tickItem: {
    width: STEP_WIDTH,
    alignItems: "center",
  },
  tick: {
    width: 2,
    borderRadius: 2,
    backgroundColor: "#C5C7CC",
  },
  tickMinor: {
    height: 44,
  },
  tickMajor: {
    height: 56,
  },
  tickLabel: {
    marginTop: 8,
    color: "#858890",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  tickLabelPlaceholder: {
    marginTop: 8,
    height: 22,
  },
  centerIndicator: {
    position: "absolute",
    top: 44,
    alignSelf: "center",
    alignItems: "center",
    zIndex: 2,
  },
  centerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#101115",
  },
  centerLine: {
    width: 4,
    height: 62,
    backgroundColor: "#101115",
    marginTop: -1,
    borderRadius: 2,
  },
  centerHint: {
    marginTop: -14,
    textAlign: "center",
    color: "#2D2F33",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
