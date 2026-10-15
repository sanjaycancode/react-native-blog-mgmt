// src/components/forms/ImageSourceSheet.tsx
import type { ComponentProps } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

const DANGER = "#DC2626"; // swap for a theme color if you have one

export type ImageSourceOption = {
  key: string;
  label: string;
  hint?: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  options: ImageSourceOption[];
  onClose: () => void;
  onDismiss?: () => void;
};

export function ImageSourceSheet({
  visible,
  title,
  options,
  onClose,
  onDismiss,
}: Props) {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose} // Android back button
      onDismiss={onDismiss} // iOS: fires after the close animation ends
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              paddingBottom: insets.bottom + spacing.md,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ThemedText variant="heading5" style={{ marginVertical: spacing.md }}>
            {title}
          </ThemedText>

          <View style={{ gap: spacing.xs }}>
            {options.map((option) => {
              const tint = option.destructive ? DANGER : colors.primary;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.6}
                  onPress={option.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  style={[
                    styles.row,
                    {
                      gap: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Ionicons name={option.icon} size={22} color={tint} />
                  </View>
                  <View style={styles.rowCopy}>
                    <ThemedText
                      variant="bodySmall"
                      style={option.destructive ? { color: DANGER } : undefined}
                    >
                      {option.label}
                    </ThemedText>
                    {option.hint ? (
                      <ThemedText variant="caption" semantic="muted">
                        {option.hint}
                      </ThemedText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={[
              styles.cancel,
              {
                backgroundColor: colors.secondary,
                borderRadius: radii.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <ThemedText variant="bodySmall">Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: { width: "100%" },
  handle: { alignSelf: "center", borderRadius: 2, height: 4, width: 40 },
  row: { alignItems: "center", flexDirection: "row", minHeight: 56 },
  iconCircle: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rowCopy: { flex: 1 },
  cancel: { alignItems: "center", justifyContent: "center", minHeight: 48 },
});

export default ImageSourceSheet;
