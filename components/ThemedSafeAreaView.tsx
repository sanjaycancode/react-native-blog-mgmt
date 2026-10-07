import React from "react";
import { StyleSheet } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/constants/theme";

type ThemedSafeAreaViewProps = {
  children: React.ReactNode;
} & React.ComponentProps<typeof SafeAreaView>;

export function ThemedSafeAreaView({
  children,
  style,
  ...safeAreaProps
}: ThemedSafeAreaViewProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      {...safeAreaProps}
      style={[styles.container, { backgroundColor: colors.background }, style]}
      edges={safeAreaProps.edges ?? ["top", "left", "right"]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
