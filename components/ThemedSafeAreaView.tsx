import React from "react";
import { StyleSheet } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/context/ThemeContext";

type ThemedSafeAreaViewProps = {
  children: React.ReactNode;
} & React.ComponentProps<typeof SafeAreaView>;

export function ThemedSafeAreaView({
  children,
  style,
  ...safeAreaProps
}: ThemedSafeAreaViewProps) {
  const colors = useThemeColors();

  const styles = createStyle(colors);

  return (
    <SafeAreaView
      {...safeAreaProps}
      style={[styles.container, style]}
      edges={safeAreaProps.edges ?? ["top", "left", "right"]}
    >
      {children}
    </SafeAreaView>
  );
}

const createStyle = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
