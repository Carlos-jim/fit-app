import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { FitnessTheme } from "./fitness-ui";
import { biomaApi } from "../services/bioma-api";
import { handleError, showError, showSuccess } from "../utils/toast";

type VisualMode = "dark" | "light";

interface AccountSettingsModalProps {
  theme: FitnessTheme;
  visualMode: VisualMode;
  visible: boolean;
  onClose: () => void;
  /** Called once the account has been permanently deleted. */
  onDeleted: () => void;
}

/**
 * GDPR-friendly settings modal.
 *
 * SOLID notes
 * ───────────
 * • SRP — owns only the export/delete UI flow. Auth, navigation, and
 *   toast handling live in the parent.
 * • ISP — exposes only the two high-level actions a user expects. The
 *   complex backend contract is hidden behind `exportMyData` and
 *   `deleteMyAccount`.
 *
 * UX safeguards
 * ─────────────
 * • Delete requires the user to type the literal word "ELIMINAR" before
 *   the danger button activates. No accidental 1-tap destruction.
 */
export function AccountSettingsModal({
  theme,
  visualMode,
  visible,
  onClose,
  onDeleted,
}: AccountSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const dark = theme.background === "#050505";

  useEffect(() => {
    if (!visible) {
      setConfirmText("");
      setExporting(false);
      setDeleting(false);
    }
  }, [visible]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = await biomaApi.exportMyData();
      // Share sheet gives the user a save/share/email action.
      try {
        await Share.share({
          message: JSON.stringify(data, null, 2),
          title: "bioma-data-export.json",
        });
      } catch {
        // User cancelled the share sheet — the export itself succeeded.
      }
      showSuccess(
        "Exportación lista",
        "Tus datos están listos. Guárdalos en un lugar seguro.",
      );
    } catch (err) {
      handleError(err, "No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== "ELIMINAR") {
      showError("Confirmación incorrecta", "Escribe ELIMINAR para confirmar.");
      return;
    }
    Alert.alert(
      "¿Eliminar tu cuenta?",
      "Esta acción es permanente y borrará todos tus datos (logs, métricas, tips, plan nutricional). No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await biomaApi.deleteMyAccount();
              onDeleted();
            } catch (err) {
              handleError(err, "No se pudo eliminar");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
              borderColor: theme.stroke,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: dark
                    ? "rgba(244, 63, 94, 0.18)"
                    : "rgba(244, 63, 94, 0.10)",
                },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#F43F5E" />
              <Text style={[styles.badgeText, { color: "#F43F5E" }]}>
                Privacidad y datos
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Tus datos, tus reglas
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Bioma cumple con GDPR y la ley local de protección de datos.
              Puedes llevarte una copia de todo lo que guardamos o eliminar
              tu cuenta cuando quieras.
            </Text>

            <View
              style={[
                styles.section,
                {
                  backgroundColor: dark ? "#13211D" : "#F4FBF7",
                  borderColor: theme.stroke,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Descargar mis datos
              </Text>
              <Text style={[styles.sectionBody, { color: theme.muted }]}>
                Generamos un archivo JSON con tu perfil, plan, comidas
                registradas, métricas y tips.
              </Text>
              <Pressable
                onPress={handleExport}
                disabled={exporting}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: exporting ? 0.7 : 1,
                  },
                ]}
              >
                {exporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.secondaryButtonText}>Exportar ahora</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View
              style={[
                styles.section,
                styles.dangerSection,
                {
                  backgroundColor: dark ? "#1F1014" : "#FFF0F0",
                  borderColor: "#F43F5E",
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: "#F43F5E" }]}>
                Eliminar cuenta
              </Text>
              <Text style={[styles.sectionBody, { color: theme.text }]}>
                Borramos de forma permanente tu perfil, plan nutricional,
                historial de comidas, métricas, tips y tokens. Esta acción
                no se puede deshacer.
              </Text>

              <Text
                style={[
                  styles.confirmLabel,
                  { color: theme.muted },
                ]}
              >
                Escribe ELIMINAR para confirmar
              </Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="ELIMINAR"
                placeholderTextColor={theme.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[
                  styles.confirmInput,
                  {
                    color: theme.text,
                    borderColor: theme.stroke,
                    backgroundColor: dark ? "#0F1A16" : "#FFFFFF",
                  },
                ]}
              />

              <Pressable
                onPress={handleDelete}
                disabled={
                  deleting || confirmText.trim().toUpperCase() !== "ELIMINAR"
                }
                style={[
                  styles.dangerButton,
                  {
                    opacity:
                      deleting ||
                      confirmText.trim().toUpperCase() !== "ELIMINAR"
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.dangerButtonText}>
                      Eliminar mi cuenta permanentemente
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  scroll: {
    paddingBottom: 24,
    gap: 18,
  },
  title: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  dangerSection: {
    borderWidth: 1,
  },
  sectionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 16,
  },
  sectionBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
  },
  secondaryButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  confirmLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  confirmInput: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    letterSpacing: 2,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#F43F5E",
  },
  dangerButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});