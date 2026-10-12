import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  children?: ReactNode;
};

/** Inline confirmation card. Used instead of Alert, which does nothing on web. */
export default function AuthSuccess({ icon, title, body, children }: Props) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.wrap, { paddingVertical: spacing.xl }]}>
      <View style={styles.iconStack}>
        <View
          style={[
            styles.ring,
            {
              width: 112,
              height: 112,
              borderRadius: 56,
              backgroundColor: colors.primary,
              opacity: 0.06,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.primary,
              opacity: 0.12,
            },
          ]}
        />
        <View
          style={[
            styles.core,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name={icon} size={26} color={colors.primary} />
        </View>
      </View>

      <Text
        style={{
          color: colors.foreground,
          fontSize: typography.sizes["2xl"],
          fontWeight: typography.weights.heavy,
          letterSpacing: -0.5,
          marginTop: spacing.lg,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: typography.sizes.base,
          lineHeight: 24,
          marginTop: spacing.sm,
          textAlign: "center",
        }}
      >
        {body}
      </Text>

      {!!children && <View style={{ marginTop: spacing.xl, width: "100%" }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  iconStack: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
  core: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});