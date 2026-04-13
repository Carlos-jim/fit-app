import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWaterStore } from "../store/water-store";

const WATER_COLOR = "#3B9EE2";

export function WaterCelebration({ isDark }: { isDark: boolean }) {
  const waterGlasses = useWaterStore((state) => state.waterGlasses);
  const waterGoal = useWaterStore((state) => state.waterGoal);

  const celebAnim = useRef(new Animated.Value(0)).current;
  const prevWaterRef = useRef(waterGlasses);

  const mutedText = isDark ? "#8AA199" : "#786F65";

  useEffect(() => {
    const prev = prevWaterRef.current;
    prevWaterRef.current = waterGlasses;

    // Trigger only when crossing the goal threshold (not already above)
    if (prev < waterGoal && waterGlasses >= waterGoal) {
      celebAnim.setValue(0);
      Animated.sequence([
        Animated.spring(celebAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.delay(2200),
        Animated.timing(celebAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [waterGlasses, waterGoal, celebAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.celebOverlay,
        {
          opacity: celebAnim,
          transform: [
            {
              scale: celebAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.6, 1.08, 1],
              }),
            },
          ],
        },
      ]}
    >
      {/* Full screen backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.6)",
            opacity: celebAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.8, 1],
            }),
          },
        ]}
      />

      <View
        style={[
          styles.celebCard,
          {
            backgroundColor: isDark ? "rgba(6, 22, 32, 0.94)" : "rgba(230, 247, 255, 0.96)",
            borderColor: `${WATER_COLOR}44`,
          },
        ]}
      >
        {/* Ripple rings */}
        <Animated.View
          style={[
            styles.celebRing,
            styles.celebRingOuter,
            {
              borderColor: `${WATER_COLOR}28`,
              transform: [
                {
                  scale: celebAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.6],
                  }),
                },
              ],
              opacity: celebAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.9, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.celebRing,
            styles.celebRingMid,
            {
              borderColor: `${WATER_COLOR}44`,
              transform: [
                {
                  scale: celebAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.3],
                  }),
                },
              ],
              opacity: celebAnim.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0, 1, 0.2],
              }),
            },
          ]}
        />

        <View style={styles.celebIconWrap}>
          <Ionicons name="water" size={48} color={WATER_COLOR} />
        </View>
        <Text style={[styles.celebTitle, { color: WATER_COLOR }]}>¡Meta alcanzada!</Text>
        <Text style={[styles.celebSub, { color: mutedText }]}>
          Completaste tus {waterGoal} vasos de agua de hoy. 🎉
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  celebOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  celebCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 36,
    paddingVertical: 32,
    marginHorizontal: 24,
    overflow: "visible",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  celebRing: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 999,
  },
  celebRingOuter: {
    width: 200,
    height: 200,
  },
  celebRingMid: {
    width: 140,
    height: 140,
  },
  celebIconWrap: {
    marginBottom: 8,
  },
  celebTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
  },
  celebSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
});
