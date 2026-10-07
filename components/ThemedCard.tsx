/**
 * Theme-aware card component for displaying content
 */

import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme, useThemeColors } from "@/context/ThemeContext";

interface ThemedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "outlined";
}

export function ThemedCard({
  children,
  style,
  variant = "outlined",
}: ThemedCardProps) {
  const { theme } = useTheme();

  const colors = useThemeColors();

  const styles = createStyles(theme, colors);

  return (
    <View
      style={[
        styles.card,
        styles.container,
        variant === "elevated" && styles.elevated,
        variant === "outlined" && styles.outlined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const createStyles = (
  theme: ReturnType<typeof useTheme>["theme"],
  colors: ReturnType<typeof useThemeColors>,
) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.md,
      borderWidth: 0,
    },
    container: {
      backgroundColor: colors.backgroundAlt,
      borderColor: colors.border,
    },
    elevated: {
      ...theme.shadows.medium,
    },
    outlined: {
      borderWidth: 1,
    },
  });
