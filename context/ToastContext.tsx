import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

type ToastType = "success" | "error";

interface ToastMessage {
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastViewport toast={toast} onDismiss={() => setToast(null)} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        { top: insets.top + spacing.md, left: spacing.md, right: spacing.md },
      ]}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${toast.type}: ${toast.message}. Tap to dismiss.`}
        onPress={onDismiss}
        style={[
          styles.toast,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
          },
        ]}
      >
        <Ionicons
          name={toast.type === "success" ? "checkmark-circle" : "alert-circle"}
          size={20}
          color={colors.primary}
        />
        <ThemedText variant="bodySmall" style={styles.message}>
          {toast.message}
        </ThemedText>
        <Ionicons
          name="close"
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    zIndex: 1000,
  },
  toast: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  message: {
    flex: 1,
  },
});
