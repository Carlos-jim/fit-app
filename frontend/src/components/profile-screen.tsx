import { useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import { biomaApi } from "../services/bioma-api";
import { handleError } from "../utils/toast";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// ─── Props ────────────────────────────────────────────────────────
export interface ProfileScreenProps {
  theme: FitnessTheme;
  visualMode: "dark" | "light";
  fullName: string;
  email: string;
  userId: string | null;
  plan: string;
  onLogout: () => void;
  bootstrapLoading: boolean;
  onToggleMode: () => void;
  onOpenWeightHistory?: () => void;
  onOpenAccountSettings?: () => void;
  onOpenEditProfile?: () => void;
  onOpenWorkoutHistory?: () => void;
  onForgotPassword?: () => void;
  /**
   * Called whenever the local name/email changes are persisted. The
   * parent uses this to refresh the persisted session snapshot.
   */
  onProfileChanged?: (changes: {
    fullName?: string;
    email?: string;
  }) => void | Promise<void>;
  ambientPulse: Animated.Value;
  mainScrollY: Animated.Value;
}

// ─── Component ────────────────────────────────────────────────────
export function ProfileScreen(props: ProfileScreenProps) {
  const {
    theme,
    visualMode,
    fullName,
    email,
    userId,
    onLogout,
    bootstrapLoading,
    onToggleMode,
    ambientPulse,
    mainScrollY,
    onOpenWeightHistory,
    onOpenAccountSettings,
    onOpenEditProfile,
    onOpenWorkoutHistory,
    onForgotPassword,
    onProfileChanged,
  } = props;

  const [draftName, setDraftName] = useState(fullName);
  const [draftEmail, setDraftEmail] = useState(email);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = draftName.trim() !== fullName.trim() || draftEmail.trim() !== email.trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(draftEmail.trim());

  const persistField = async (
    field: "fullName" | "email",
    value: string,
  ): Promise<boolean> => {
    try {
      setSaving(true);
      if (field === "email") {
        // The backend currently has no dedicated PATCH for name/email
        // updates — bootstrap is the supported path for self-service
        // changes. Calling it rewrites the user row with the latest
        // values without mutating the password.
        await biomaApi.bootstrapUser({
          email: value.trim().toLowerCase(),
          fullName: draftName.trim(),
        });
      } else {
        await biomaApi.bootstrapUser({
          email: draftEmail.trim().toLowerCase(),
          fullName: value.trim(),
        });
      }
      setSavedAt(Date.now());
      await onProfileChanged?.({
        fullName: field === "fullName" ? value.trim() : undefined,
        email: field === "email" ? value.trim() : undefined,
      });
      return true;
    } catch (err) {
      handleError(err, "No se pudo guardar");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCommit = async () => {
    if (!dirty || !validEmail) return;
    setSaving(true);
    try {
      // Single round-trip for both fields at once.
      await biomaApi.bootstrapUser({
        email: draftEmail.trim().toLowerCase(),
        fullName: draftName.trim(),
      });
      setSavedAt(Date.now());
      await onProfileChanged?.({
        fullName: draftName.trim(),
        email: draftEmail.trim(),
      });
    } catch (err) {
      handleError(err, "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

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
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Tu nombre"
            onBlur={() => {
              if (draftName.trim() && draftName.trim() !== fullName.trim()) {
                void persistField("fullName", draftName.trim());
              }
            }}
            theme={theme}
            inputBg={inputBg}
            strongText={strongText}
            softText={softText}
          />

          {/* Email field */}
          <InputField
            icon="mail-outline"
            label="Correo electrónico"
            value={draftEmail}
            onChangeText={setDraftEmail}
            placeholder="correo@bioma.app"
            keyboardType="email-address"
            autoCapitalize="none"
            onBlur={() => {
              if (
                draftEmail.trim() &&
                validEmail &&
                draftEmail.trim() !== email.trim()
              ) {
                void persistField("email", draftEmail.trim());
              }
            }}
            theme={theme}
            inputBg={inputBg}
            strongText={strongText}
            softText={softText}
          />

          {dirty && validEmail ? (
            <Pressable
              onPress={handleCommit}
              disabled={saving}
              style={[
                styles.saveBtn,
                { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar cambios</Text>
              )}
            </Pressable>
          ) : null}

          {savedAt && !dirty ? (
            <Text style={[styles.savedHint, { color: mutedText }]}>
              Cambios guardados
            </Text>
          ) : null}

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

      {/* ─── Quick actions (collapsible) ───────────────────────── */}
      <View style={styles.quickLinks}>
        {onOpenWeightHistory ? (
          <ProfileAccordionItem
            icon="fitness-outline"
            title="Mi peso y medidas"
            description="Registra y consulta tu peso, cintura, cadera, pecho y porcentaje de grasa para seguir tu progreso."
            actionLabel="Abrir historial"
            onAction={onOpenWeightHistory}
            theme={theme}
            panelBg={panelBg}
            panelStroke={panelStroke}
            strongText={strongText}
            mutedText={mutedText}
          />
        ) : null}
        {onForgotPassword ? (
          <ProfileAccordionItem
            icon="key-outline"
            title="Cambiar contraseña"
            description="Actualiza tu contraseña o solicita un enlace de recuperacion si no puedes entrar."
            actionLabel="Recuperar acceso"
            onAction={onForgotPassword}
            theme={theme}
            panelBg={panelBg}
            panelStroke={panelStroke}
            strongText={strongText}
            mutedText={mutedText}
          />
        ) : null}
        {onOpenEditProfile ? (
          <ProfileAccordionItem
            icon="create-outline"
            title="Editar perfil fisico"
            description="Modifica tu altura, peso, objetivo, nivel de actividad y pais para recalibrar el plan."
            actionLabel="Editar perfil"
            onAction={onOpenEditProfile}
            theme={theme}
            panelBg={panelBg}
            panelStroke={panelStroke}
            strongText={strongText}
            mutedText={mutedText}
          />
        ) : null}
        {onOpenWorkoutHistory ? (
          <ProfileAccordionItem
            icon="barbell-outline"
            title="Entrenamientos"
            description="Consulta, registra o elimina tus sesiones de ejercicio y series por dia."
            actionLabel="Ver entrenamientos"
            onAction={onOpenWorkoutHistory}
            theme={theme}
            panelBg={panelBg}
            panelStroke={panelStroke}
            strongText={strongText}
            mutedText={mutedText}
          />
        ) : null}
        {onOpenAccountSettings ? (
          <ProfileAccordionItem
            icon="shield-checkmark-outline"
            title="Privacidad y datos"
            description="Exporta tu informacion o elimina tu cuenta y todos los datos asociados."
            actionLabel="Configurar cuenta"
            onAction={onOpenAccountSettings}
            theme={theme}
            panelBg={panelBg}
            panelStroke={panelStroke}
            strongText={strongText}
            mutedText={mutedText}
          />
        ) : null}
      </View>

      {/* ─── Logout ──────────────────────────────────────────────── */}
      <Pressable
        style={[
          styles.logoutBtn,
          { backgroundColor: isDark ? "#2A181C" : "#FFF0F0", borderColor: isDark ? "#3D2228" : "#FFD6D6" },
        ]}
        onPress={() => {
          Alert.alert(
            "Cerrar sesion",
            "Vamos a cerrar tu sesion en este dispositivo. Puedes volver a entrar cuando quieras.",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Cerrar sesion", style: "destructive", onPress: onLogout },
            ],
          );
        }}
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

function ProfileAccordionItem({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  theme,
  panelBg,
  panelStroke,
  strongText,
  mutedText,
}: {
  icon: IoniconName;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  theme: FitnessTheme;
  panelBg: string;
  panelStroke: string;
  strongText: string;
  mutedText: string;
}) {
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 220,
      easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const bodyHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 96],
   });
  const bodyOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });
  const chevronRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      style={[
        styles.accordionItem,
        { backgroundColor: panelBg, borderColor: panelStroke },
      ]}
    >
      <Pressable
        style={styles.accordionHeader}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
      >
        <View
          style={[
            styles.accordionIconWrap,
            { backgroundColor: `${theme.accent}1A` },
          ]}
        >
          <Ionicons name={icon} size={18} color={theme.accent} />
        </View>
        <Text style={[styles.accordionTitle, { color: strongText }]}>
          {title}
        </Text>
        <Animated.View
          style={[
            styles.accordionChevron,
            { transform: [{ rotate: chevronRotate }] },
          ]}
        >
          <Ionicons name="chevron-down" size={16} color={mutedText} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.accordionBody,
          { height: bodyHeight, opacity: bodyOpacity },
        ]}
      >
        <View style={styles.accordionBodyInner}>
          <View
            style={[
              styles.accordionDivider,
              { backgroundColor: panelStroke },
            ]}
          />
          <Text
            style={[styles.accordionDescription, { color: mutedText }]}
          >
            {description}
          </Text>
          <Pressable
            style={[
              styles.accordionActionBtn,
              { backgroundColor: `${theme.accent}1A`, borderColor: theme.accent },
            ]}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.accordionActionText, { color: theme.accent }]}>
              {actionLabel}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={13}
              color={theme.accent}
            />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function InputField({
  icon,
  label,
  value,
  onChangeText,
  onBlur,
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
  onBlur?: () => void;
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
          onBlur={onBlur}
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
  // ─── Save button + saved hint ─────────────────────────────────
  saveBtn: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  savedHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
  quickLinks: {
    gap: 8,
    marginBottom: 12,
  },
  accordionItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accordionTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  accordionChevron: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  accordionBody: {
    overflow: "hidden",
  },
  accordionBodyInner: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
    gap: 12,
  },
  accordionDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 48,
  },
  accordionActionBtn: {
    marginLeft: 48,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  accordionActionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  accordionDivider: {
    height: 1,
  },
});
