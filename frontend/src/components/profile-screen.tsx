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
  onOpenWeightHistory?: () => void;
  onOpenAccountSettings?: () => void;
  onOpenEditProfile?: () => void;
  onOpenWorkoutHistory?: () => void;
  onForgotPassword?: () => void;
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
    onOpenWeightHistory,
    onOpenAccountSettings,
    onOpenEditProfile,
    onOpenWorkoutHistory,
    onForgotPassword,
  } = props;

  const isDark = visualMode === "dark";

  // ─── Tokens ───────────────────────────────────────────────────
  const heroGradient: readonly [string, string, string] = isDark
    ? ["#091612", "#0F241E", "#14332A"]
    : ["#E8F9F1", "#D8F4E8", "#C8EFDF"];

  const avatarGradient: readonly [string, string] = isDark
    ? ["#1A3D33", "#0F241E"]
    : ["#FFFFFF", "#F0FAF5"];

  const strongText = isDark ? "#F5FBF8" : "#17130F";
  const mutedText = isDark ? "#8AA199" : "#5E6B65";
  const softText = isDark ? "#5C7369" : "#8A9A90";
  const panelBg = isDark ? "#0F1513" : "#FFFFFF";
  const panelStroke = isDark ? "#1E2A25" : "#E8E8E0";
  const inputBg = isDark ? "#141D19" : "#F8FAF8";

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
                outputRange: [0, -5],
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
          {/* Top status row */}
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.7)" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: userId ? theme.accent : mutedText },
                ]}
              />
              <Text style={[styles.statusPillText, { color: strongText }]}>
                {userId ? "Conectado" : "Sin conexión"}
              </Text>
            </View>

            <Pressable
              style={[
                styles.statusPill,
                { backgroundColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.7)" },
              ]}
              onPress={onToggleMode}
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={14}
                color={isDark ? "#A0C4FF" : "#F59E0B"}
              />
              <Text style={[styles.statusPillText, { color: strongText }]}>
                {isDark ? "Oscuro" : "Claro"}
              </Text>
            </Pressable>
          </View>

          {/* Avatar + identity */}
          <View style={styles.identityRow}>
            <LinearGradient
              colors={avatarGradient}
              style={styles.avatar}
            >
              <Text style={[styles.avatarText, { color: strongText }]}>
                {profileInitial}
              </Text>
            </LinearGradient>

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
              <View style={styles.completionRow}>
                <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
                <Text style={[styles.completionText, { color: mutedText }]}>
                  Perfil {profileCompletionPct}% completo
                </Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)" },
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
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ─── Account Section ─────────────────────────────────────── */}
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
        <View style={[styles.card, { backgroundColor: panelBg, borderColor: panelStroke }]}>
          <SectionTitle title="Cuenta" theme={theme} />

          {/* Name field */}
          <InputField
            icon="person-outline"
            label="Nombre completo"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tu nombre"
            theme={theme}
            inputBg={inputBg}
            strongText={strongText}
            softText={softText}
          />

          {/* Email field */}
          <InputField
            icon="mail-outline"
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="correo@bioma.app"
            keyboardType="email-address"
            autoCapitalize="none"
            theme={theme}
            inputBg={inputBg}
            strongText={strongText}
            softText={softText}
          />

          {/* Theme toggle */}
          <View style={styles.toggleRow}>
            <View style={[styles.toggleIconWrap, { backgroundColor: `${isDark ? "#A0C4FF" : "#F59E0B"}18` }]}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={18} color={isDark ? "#A0C4FF" : "#F59E0B"} />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: strongText }]}>
                Modo {isDark ? "oscuro" : "claro"}
              </Text>
              <Text style={[styles.toggleHint, { color: softText }]}>
                Cambia la apariencia de la app
              </Text>
            </View>
            <Switch value={!isDark} onToggle={onToggleMode} accent={theme.accent} />
          </View>

          {/* Primary action */}
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
              <ActivityIndicator color={isDark ? "#050505" : "#FFFFFF"} />
            ) : (
              <>
                <Ionicons
                  name={userId ? "sync-outline" : "link-outline"}
                  size={18}
                  color={isDark ? "#050505" : "#FFFFFF"}
                />
                <Text style={[styles.primaryBtnText, { color: isDark ? "#050505" : "#FFFFFF" }]}>
                  {userId ? "Actualizar perfil" : "Conectar perfil"}
                </Text>
              </>
            )}
          </Pressable>

          {userId != null ? (
            <View style={styles.idRow}>
              <Ionicons name="id-card-outline" size={14} color={mutedText} />
              <Text style={[styles.idText, { color: mutedText }]}>
                ID: {userId.slice(0, 18)}…
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* ─── Devices Section ─────────────────────────────────────── */}
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
        <View style={[styles.card, { backgroundColor: panelBg, borderColor: panelStroke }]}>
          <SectionTitle title="Dispositivos" theme={theme} />
          <HealthProviderStatusCard
            provider={healthProvider}
            mode={wellnessCardMode}
            theme={theme}
          />
        </View>
      </Animated.View>

      {/* ─── Quick links ───────────────────────────────────────── */}
      <View style={styles.quickLinks}>
        {onOpenWeightHistory ? (
          <Pressable
            style={[
              styles.quickLink,
              { backgroundColor: panelBg, borderColor: panelStroke },
            ]}
            onPress={onOpenWeightHistory}
          >
            <Ionicons name="fitness-outline" size={18} color={theme.accent} />
            <Text style={[styles.quickLinkText, { color: strongText }]}>
              Mi peso y medidas
            </Text>
            <Ionicons name="chevron-forward" size={16} color={mutedText} />
          </Pressable>
        ) : null}
        {onForgotPassword ? (
          <Pressable
            style={[
              styles.quickLink,
              { backgroundColor: panelBg, borderColor: panelStroke },
            ]}
            onPress={onForgotPassword}
          >
            <Ionicons name="key-outline" size={18} color={theme.accent} />
            <Text style={[styles.quickLinkText, { color: strongText }]}>
              Cambiar contraseña
            </Text>
            <Ionicons name="chevron-forward" size={16} color={mutedText} />
          </Pressable>
        ) : null}
        {onOpenEditProfile ? (
          <Pressable
            style={[
              styles.quickLink,
              { backgroundColor: panelBg, borderColor: panelStroke },
            ]}
            onPress={onOpenEditProfile}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.accent}
            />
            <Text style={[styles.quickLinkText, { color: strongText }]}>
              Editar perfil físico
            </Text>
            <Ionicons name="chevron-forward" size={16} color={mutedText} />
          </Pressable>
        ) : null}
        {onOpenWorkoutHistory ? (
          <Pressable
            style={[
              styles.quickLink,
              { backgroundColor: panelBg, borderColor: panelStroke },
            ]}
            onPress={onOpenWorkoutHistory}
          >
            <Ionicons
              name="barbell-outline"
              size={18}
              color={theme.accent}
            />
            <Text style={[styles.quickLinkText, { color: strongText }]}>
              Entrenamientos
            </Text>
            <Ionicons name="chevron-forward" size={16} color={mutedText} />
          </Pressable>
        ) : null}
        {onOpenAccountSettings ? (
          <Pressable
            style={[
              styles.quickLink,
              { backgroundColor: panelBg, borderColor: panelStroke },
            ]}
            onPress={onOpenAccountSettings}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={theme.accent}
            />
            <Text style={[styles.quickLinkText, { color: strongText }]}>
              Privacidad y datos
            </Text>
            <Ionicons name="chevron-forward" size={16} color={mutedText} />
          </Pressable>
        ) : null}
      </View>

      {/* ─── Logout ──────────────────────────────────────────────── */}
      <Pressable
        style={[
          styles.logoutBtn,
          { backgroundColor: isDark ? "#2A181C" : "#FFF0F0", borderColor: isDark ? "#3D2228" : "#FFD6D6" },
        ]}
        onPress={onLogout}
      >
        <Ionicons name="log-out-outline" size={18} color="#F43F5E" />
        <Text style={[styles.logoutText, { color: "#F43F5E" }]}>
          Cerrar sesión
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function SectionTitle({ title, theme }: { title: string; theme: FitnessTheme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
  );
}

function InputField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  theme,
  inputBg,
  strongText,
  softText,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  theme: FitnessTheme;
  inputBg: string;
  strongText: string;
  softText: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: softText }]}>{label}</Text>
      <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: theme.stroke }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={softText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, { color: strongText }]}
        />
      </View>
    </View>
  );
}

function Switch({
  value,
  onToggle,
  accent,
}: {
  value: boolean;
  onToggle: () => void;
  accent: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.switchTrack,
        { backgroundColor: value ? accent : "rgba(120,120,120,0.25)" },
      ]}
    >
      <Animated.View
        style={[
          styles.switchKnob,
          { transform: [{ translateX: value ? 24 : 2 }] },
        ]}
      />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    gap: 18,
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 26,
    gap: 22,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
  },
  identityText: {
    flex: 1,
    gap: 5,
  },
  heroName: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    lineHeight: 32,
  },
  heroEmail: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  completionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  completionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  progressWrap: {
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  // ── Card ──────────────────────────────────────────────────────
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  // ── Inputs ────────────────────────────────────────────────────
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    paddingVertical: 0,
  },

  // ── Toggle ────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  toggleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  toggleHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },

  // ── Buttons ───────────────────────────────────────────────────
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  idText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },

  // ── Logout ────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  quickLinks: {
    gap: 8,
    marginBottom: 12,
  },
  quickLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickLinkText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
