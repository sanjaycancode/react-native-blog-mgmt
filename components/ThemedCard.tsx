import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/constants/theme";

interface ThemedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "outlined";
}

export  function ThemedCard({
  children,
  style,
  variant = "outlined",
}: ThemedCardProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          borderWidth: variant === "outlined" ? StyleSheet.hairlineWidth : 0,
          elevation: variant === "elevated" ? 2 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
});

export default ThemedCard;
