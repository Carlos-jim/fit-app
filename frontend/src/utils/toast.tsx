import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Toast, {
  type ToastConfig,
  type ToastConfigParams,
} from "react-native-toast-message";
import { ApiError } from "../services/bioma-api";

type ToastKind = "success" | "error" | "info";

const KIND_TO_TYPE: Record<ToastKind, "success" | "error" | "info"> = {
  success: "success",
  error: "error",
  info: "info",
};

function show(kind: ToastKind, title: string, message?: string) {
  Toast.show({
    type: KIND_TO_TYPE[kind],
    text1: title,
    text2: message,
    position: "top",
    visibilityTime: kind === "error" ? 4000 : 2500,
    autoHide: true,
    topOffset: 48,
  });
}

export const showSuccess = (title: string, message?: string) =>
  show("success", title, message);

export const showInfo = (title: string, message?: string) =>
  show("info", title, message);

export const showError = (title: string, message?: string) =>
  show("error", title, message);

const CODE_TO_MESSAGE: Record<string, string> = {
  INVALID_CREDENTIALS: "Correo o contrasena incorrectos.",
  INVALID_TOKEN: "Tu sesion expiro. Vuelve a iniciar sesion.",
  UNAUTHORIZED: "No tienes permisos para esta accion.",
  FORBIDDEN: "Acceso denegado.",
  RATE_LIMITED: "Demasiados intentos. Espera un momento.",
  EMAIL_TAKEN: "Ese correo ya esta registrado.",
  WEAK_PASSWORD:
    "La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero.",
  INVALID_GOOGLE_TOKEN: "No pudimos verificar tu cuenta de Google.",
  UNVERIFIED_GOOGLE_EMAIL: "Verifica tu correo de Google antes de continuar.",
  GOOGLE_AUTH_NOT_CONFIGURED: "Google Sign-In no esta configurado.",
  INVALID_REFRESH_TOKEN: "Tu sesion expiro. Vuelve a iniciar sesion.",
  INVALID_RESET_TOKEN: "El enlace de recuperacion ya no es valido.",
  INVALID_VERIFICATION_TOKEN: "El enlace de verificacion ya no es valido.",
  BOOTSTRAP_EMAIL_MISMATCH: "El correo no coincide con el registrado.",
  PROFILE_INCOMPLETE:
    "Completa tu perfil antes de continuar con el plan nutricional.",
  PROFILE_NOT_FOUND: "No encontramos tu perfil. Completa el onboarding.",
  USER_NOT_FOUND: "No encontramos tu cuenta.",
  NETWORK_ERROR: "Sin conexion. Revisa tu internet e intenta de nuevo.",
  TIMEOUT: "La peticion tardo demasiado. Intenta de nuevo.",
  STORAGE_UPLOAD_FAILED: "No pudimos subir la imagen. Intenta de nuevo.",
  IMAGE_TOO_LARGE: "La imagen es demasiado pesada. Usa una mas ligera.",
  UNSUPPORTED_MEDIA_TYPE: "Formato de imagen no soportado.",
  OFF_NETWORK_ERROR: "No pudimos buscar el producto. Revisa tu conexion.",
  OFF_UPSTREAM_ERROR: "El servicio de productos no respondio. Intenta mas tarde.",
  GEMINI_REQUEST_FAILED: "El servicio de IA no respondio. Intenta mas tarde.",
  EMAIL_PROVIDER_ERROR: "No pudimos enviar el correo. Intenta mas tarde.",
};

const NETWORK_FALLBACK = "Sin conexion. Revisa tu internet e intenta de nuevo.";
const GENERIC_FALLBACK = "Algo salio mal. Intenta de nuevo.";

function isLikelyNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { code?: string; message?: string; name?: string };
  if (anyErr.code === "ECONNABORTED" || anyErr.code === "ECONNRESET") {
    return true;
  }
  if (anyErr.name === "AbortError" || anyErr.name === "TimeoutError") {
    return true;
  }
  if (anyErr.message?.toLowerCase().includes("network")) return true;
  if (anyErr.message?.toLowerCase().includes("timeout")) return true;
  return false;
}

/**
 * Turn any thrown value into a user-friendly toast payload based on the
 * backend's `ApiError.code` (Spanish UI). Falls back to the error message,
 * then to a generic copy.
 */
export function describeError(err: unknown): { title: string; message: string } {
  if (err instanceof ApiError) {
    const friendly = CODE_TO_MESSAGE[err.code];
    if (friendly) {
      if (err.code === "INVALID_CREDENTIALS") {
        return { title: "No pudiste entrar", message: friendly };
      }
      if (err.code === "EMAIL_TAKEN" || err.code === "WEAK_PASSWORD") {
        return { title: "Revisa los datos", message: friendly };
      }
      return { title: "Algo salio mal", message: friendly };
    }
    return { title: "Algo salio mal", message: err.message || GENERIC_FALLBACK };
  }

  if (isLikelyNetworkError(err)) {
    return { title: "Sin conexion", message: NETWORK_FALLBACK };
  }

  if (err instanceof Error && err.message) {
    return { title: "Algo salio mal", message: err.message };
  }

  return { title: "Algo salio mal", message: GENERIC_FALLBACK };
}

/**
 * Convenience: show an error toast directly from a thrown value.
 */
export function handleError(err: unknown, fallbackTitle = "Algo salio mal") {
  const { title, message } = describeError(err);
  show("error", fallbackTitle === title ? title : fallbackTitle, message);
}

const styles = StyleSheet.create({
  base: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderLeftWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  success: {
    backgroundColor: "#053B2E",
    borderColor: "#00C897",
    borderWidth: 1,
  },
  error: {
    backgroundColor: "#3B0F14",
    borderColor: "#FF5260",
    borderWidth: 1,
  },
  info: {
    backgroundColor: "#151515",
    borderColor: "#252525",
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  successIcon: { backgroundColor: "#00C89722" },
  errorIcon: { backgroundColor: "#FF526022" },
  infoIcon: { backgroundColor: "#FFFFFF11" },
  textBlock: { flex: 1 },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  message: {
    color: "#D7D7D7",
    fontSize: 13,
    lineHeight: 18,
  },
});

type Variant = "success" | "error" | "info";

function ToastCard({
  variant,
  iconName,
  text1,
  text2,
}: {
  variant: Variant;
  iconName: "checkmark-circle" | "alert-circle" | "information-circle";
  text1?: string;
  text2?: string;
}) {
  const variantStyle =
    variant === "success"
      ? styles.success
      : variant === "error"
        ? styles.error
        : styles.info;
  const iconBg =
    variant === "success"
      ? styles.successIcon
      : variant === "error"
        ? styles.errorIcon
        : styles.infoIcon;
  const iconColor =
    variant === "success" ? "#00C897" : variant === "error" ? "#FF5260" : "#FFFFFF";
  return (
    <View style={[styles.base, variantStyle]}>
      <View style={[styles.iconWrap, iconBg]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.textBlock}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: (params: ToastConfigParams<unknown>) => (
    <ToastCard
      variant="success"
      iconName="checkmark-circle"
      text1={params.text1}
      text2={params.text2 as string | undefined}
    />
  ),
  error: (params: ToastConfigParams<unknown>) => (
    <ToastCard
      variant="error"
      iconName="alert-circle"
      text1={params.text1}
      text2={params.text2 as string | undefined}
    />
  ),
  info: (params: ToastConfigParams<unknown>) => (
    <ToastCard
      variant="info"
      iconName="information-circle"
      text1={params.text1}
      text2={params.text2 as string | undefined}
    />
  ),
};
