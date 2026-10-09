import { StyleSheet, View } from "react-native";

import type { ReactNode } from "react";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
}

export function FormField({
  label,
  children,
  required = false,
  hint,
  error,
}: FormFieldProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="bodySmall" style={styles.label}>
        {label}
        {required ? (
          <ThemedText semantic="error"> *</ThemedText>
        ) : null}
      </ThemedText>
      {children}
      {error ? (
        <ThemedText variant="caption" semantic="error">
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText variant="caption" semantic="muted">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: "600",
  },
});

export default FormField;
