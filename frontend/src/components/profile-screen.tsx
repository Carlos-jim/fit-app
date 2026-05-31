import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import { HealthProviderStatusCard } from "./health-provider-status-card";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// ─── Props ────────────────────────────────────────────────────────
export interface ProfileScreenProps {
  theme: FitnessTheme;
  visualMode: "dark" | "light";
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  userId: string | null;
  onConnectProfile: () => Promise<string | null>;
  onLogout: () => void;
  bootstrapLoading: boolean;
  onToggleMode: () => void;
  ambientPulse: Animated.Value;
  mainScrollY: Animated.Value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  healthProvider: any;
  wellnessCardMode: "day" | "night";
}

// ─── Component ────────────────────────────────────────────────────
export function ProfileScreen(props: ProfileScreenProps) {
  const {
    theme,
    visualMode,
    fullName,
    setFullName,
    email,
    setEmail,
    userId,
    onConnectProfile,
    onLogout,
    bootstrapLoading,
    onToggleMode,
    ambientPulse,
    mainScrollY,
    healthProvider,
    wellnessCardMode,
  } = props;

  const isDark = visualMode === "dark";

  // ─── Tokens ───────────────────────────────────────────────────
  const heroGradient: readonly [string, string, string] = isDark
    ? ["#050D0B", "#10211B", "#18332A"]
    : ["#FFFDF8", "#F6EFE4", "#EEE4D6"];

  const glowColor = isDark
    ? "rgba(118,239,229,0.14)"
    : "rgba(0, 200, 151, 0.10)";

  const panelBg = isDark ? "#0F1513" : "#FBF8F1";
  const panelAlt = isDark ? "#121C18" : "#F2ECE1";
  const panelStroke = isDark ? "#1E2A25" : "#E8DED0";
  const strongText = isDark ? "#F5FBF8" : "#17130F";
  const mutedText = isDark ? "#8AA199" : "#786F65";
  const softText = isDark ? "#5C7369" : "#A3988B";
  const avatarBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(23,19,15,0.07)";
  const pillBg = isDark ? "rgba(255,255,255,0.09)" : "rgba(23,19,15,0.05)";
  const pillText = isDark ? "#F4FBF8" : "#2A241F";
  const rowSeparator = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const btnTextColor = isDark ? "#07110E" : "#FFFFFF";

  const profileInitial = (fullName.trim() || email.trim() || "B")
    .slice(0, 1)
    .toUpperCase();

  const profileCompletion =
    [fullName.trim(), email.trim(), userId].filter(Boolean).length / 3;
  const profileCompletionPct = Math.round(profileCompletion * 100);

  return (
    <View style={styles.root}>
      {/* ─── Hero ───────────────────────────────────────────────── */}
      <Animated.View
        style={{
          transform: [
            {
              translateY: ambientPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -6],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Ambient glow */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroGlow,
              { backgroundColor: glowColor },
              {
                transform: [
                  {
                    scale: ambientPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1.08],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Status pill */}
          <View style={styles.heroTopRow}>
            <View style={[styles.pill, { backgroundColor: pillBg }]}>
              <View
                style={[
                  styles.pillDot,
                  { backgroundColor: userId ? theme.accent : mutedText },
                ]}
              />
              <Text style={[styles.pillText, { color: pillText }]}>
                {userId ? "Conectado" : "Sin conexión"}
              </Text>
            </View>

            {/* Visual mode icon badge */}
            <Pressable
              style={[styles.pill, { backgroundColor: pillBg }]}
              onPress={onToggleMode}
              accessibilityLabel="Cambiar modo visual"
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={14}
                color={isDark ? "#A0C4FF" : "#F59E0B"}
              />
              <Text style={[styles.pillText, { color: pillText }]}>
                {isDark ? "Oscuro" : "Claro"}
              </Text>
            </Pressable>
          </View>

          {/* Avatar + identity */}
          <View style={styles.identityRow}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: strongText }]}>
                {profileInitial}
              </Text>
            </View>
            <View style={styles.identityText}>
              <Text
                style={[styles.heroName, { color: strongText }]}
                numberOfLines={1}
              >
                {fullName.trim() || "Tu perfil Bioma"}
              </Text>
              <Text
                style={[styles.heroEmail, { color: mutedText }]}
                numberOfLines={1}
              >
                {email.trim() || "Sin correo vinculado"}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${profileCompletionPct}%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: mutedText }]}>
              Perfil {profileCompletionPct}% completo
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ─── Settings Card ──────────────────────────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [40, 160],
            outputRange: [0.76, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [40, 160],
                outputRange: [24, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={isDark ? ["#111917", "#0D1412"] : ["#FFFFFF", "#F6F1E8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: panelStroke }]}
        >
          {/* Theme toggle row */}
          <SettingsRow
            icon={isDark ? "moon-outline" : "sunny-outline"}
            iconColor={isDark ? "#A0C4FF" : "#F59E0B"}
            label={isDark ? "Modo oscuro" : "Modo claro"}
            panelAlt={panelAlt}
            panelStroke={panelStroke}
            strongText={strongText}
            mutedText={softText}
            rowSeparator={rowSeparator}
            right={
              <Pressable
                style={[
                  styles.toggleTrack,
                  {
                    backgroundColor:
                      !isDark ? theme.accent : panelAlt,
                    borderColor: panelStroke,
                  },
                ]}
                onPress={onToggleMode}
                accessibilityLabel="Cambiar modo visual"
              >
                <Animated.View
                  style={[
                    styles.toggleKnob,
                    {
                      transform: [
                        { translateX: !isDark ? 22 : 2 },
                      ],
                    },
                  ]}
                />
              </Pressable>
            }
          />

          {/* Name field */}
          <FieldRow
            icon="person-outline"
            iconColor={theme.accent}
            label="Nombre"
            panelAlt={panelAlt}
            panelStroke={panelStroke}
            strongText={strongText}
            softText={softText}
            rowSeparator={rowSeparator}
          >
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nombre completo"
              placeholderTextColor={softText}
              style={[styles.fieldInput, { color: strongText }]}
            />
          </FieldRow>

          {/* Email field */}
          <FieldRow
            icon="mail-outline"
            iconColor={theme.accent}
            label="Correo"
            panelAlt={panelAlt}
            panelStroke={panelStroke}
            strongText={strongText}
            softText={softText}
            rowSeparator={rowSeparator}
            isLast
          >
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="correo@bioma.app"
              placeholderTextColor={softText}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.fieldInput, { color: strongText }]}
            />
          </FieldRow>

          {/* Connect button */}
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.accent },
              bootstrapLoading && styles.btnDisabled,
            ]}
            onPress={onConnectProfile}
            disabled={bootstrapLoading}
          >
            {bootstrapLoading ? (
              <ActivityIndicator color={btnTextColor} />
            ) : (
              <>
                <Ionicons
                  name={userId ? "sync-outline" : "link-outline"}
                  size={18}
                  color={btnTextColor}
                />
                <Text style={[styles.primaryBtnText, { color: btnTextColor }]}>
                  {userId ? "Actualizar perfil" : "Conectar perfil"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Compact status */}
          {userId != null ? (
            <View style={styles.statusRow}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.accent}
              />
              <Text style={[styles.statusText, { color: mutedText }]}>
                ID: {userId.slice(0, 16)}…
              </Text>
            </View>
          ) : null}

          {/* Logout button */}
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: isDark ? "#2A181C" : "#FFE5E5", marginTop: 12 },
            ]}
            onPress={onLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color="#F43F5E"
            />
            <Text style={[styles.primaryBtnText, { color: "#F43F5E" }]}>
              Cerrar sesión
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      {/* ─── Health Provider Card ───────────────────────────────── */}
      <Animated.View
        style={{
          opacity: mainScrollY.interpolate({
            inputRange: [140, 300],
            outputRange: [0.56, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: mainScrollY.interpolate({
                inputRange: [140, 300],
                outputRange: [32, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <View
          style={[
            styles.deviceWrap,
            { backgroundColor: panelBg, borderColor: panelStroke },
          ]}
        >
          <HealthProviderStatusCard
            provider={healthProvider}
            mode={wellnessCardMode}
            theme={theme}
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function SettingsRow(props: {
  icon: IoniconName;
  iconColor: string;
  label: string;
  panelAlt: string;
  panelStroke: string;
  strongText: string;
  mutedText: string;
  rowSeparator: string;
  right?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.settingsRow,
        !props.isLast && {
          borderBottomWidth: 1,
          borderBottomColor: props.rowSeparator,
        },
      ]}
    >
      <View
        style={[
          styles.settingsIconWrap,
          { backgroundColor: `${props.iconColor}18` },
        ]}
      >
        <Ionicons name={props.icon} size={16} color={props.iconColor} />
      </View>
      <Text style={[styles.settingsLabel, { color: props.strongText }]}>
        {props.label}
      </Text>
      {props.right != null ? (
        <View style={styles.settingsRight}>{props.right}</View>
      ) : null}
    </View>
  );
}

function FieldRow(props: {
  icon: IoniconName;
  iconColor: string;
  label: string;
  panelAlt: string;
  panelStroke: string;
  strongText: string;
  softText: string;
  rowSeparator: string;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.fieldRow,
        !props.isLast && {
          borderBottomWidth: 1,
          borderBottomColor: props.rowSeparator,
        },
      ]}
    >
      <View
        style={[
          styles.settingsIconWrap,
          { backgroundColor: `${props.iconColor}18` },
        ]}
      >
        <Ionicons name={props.icon} size={16} color={props.iconColor} />
      </View>
      <View style={styles.fieldBody}>
        <Text style={[styles.fieldLabel, { color: props.softText }]}>
          {props.label}
        </Text>
        {props.children}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    gap: 18,
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 18,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -10,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    lineHeight: 30,
  },
  heroEmail: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  progressWrap: {
    gap: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },

  // ── Settings card ─────────────────────────────────────────────
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 0,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  settingsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingsLabel: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  settingsRight: {
    flexShrink: 0,
  },

  // Toggle switch
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },

  // Field rows
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  fieldBody: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  fieldInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    paddingVertical: 0,
  },

  // Button
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 999,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },

  // Device wrap
  deviceWrap: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 10,
  },
});
