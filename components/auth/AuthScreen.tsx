import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/constants/theme";

type Props = {
  onBack: () => void;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  badge: string;
  title: string;
  accent: string;
  subtitle: string;
  children: ReactNode;
};

/** Shared frame for the auth pages: back button, glow header, keyboard handling. */
export default function AuthScreen({
  onBack,
  badgeIcon,
  badge,
  title,
  accent,
  subtitle,
  children,
}: Props) {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, { padding: spacing.xl }]}>
            <View
              pointerEvents="none"
              style={[styles.glowLarge, { backgroundColor: colors.primary }]}
            />
            <View
              pointerEvents="none"
              style={[styles.glowSmall, { backgroundColor: colors.primary }]}
            />

            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              style={({ pressed }) => [
                styles.back,
                {
                  backgroundColor: colors.secondary,
                  opacity: pressed ? 0.6 : 1,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.foreground}
              />
            </Pressable>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Ionicons name={badgeIcon} size={14} color={colors.primary} />
              <Text
                style={{
                  color: colors.secondaryForeground,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.semibold,
                }}
              >
                {badge}
              </Text>
            </View>

            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes["3xl"],
                fontWeight: typography.weights.heavy,
                lineHeight: 38,
                letterSpacing: -0.5,
              }}
            >
              {title}
              {"\n"}
              <Text style={{ color: colors.primary }}>{accent}</Text>
            </Text>

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.base,
                lineHeight: 24,
                marginTop: spacing.md,
              }}
            >
              {subtitle}
            </Text>
          </View>

          <View style={{ paddingHorizontal: spacing.xl }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "relative",
    overflow: "hidden",
  },
  glowLarge: {
    position: "absolute",
    right: -50,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.12,
  },
  glowSmall: {
    position: "absolute",
    right: 60,
    top: 70,
    width: 54,
    height: 54,
    borderRadius: 27,
    opacity: 0.1,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
  },
});