import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

/** Slim brand bar for the home screen. Navigation lives in BottomNav. */
export default function HomeHeader() {
  const { colors, typography, spacing, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
      ]}
    >
      <View style={styles.brand}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text
          style={{
            color: colors.primary,
            fontSize: typography.sizes.lg,
            fontWeight: "700",
            letterSpacing: -0.5,
          }}
        >
          Nepal Can <Text style={{ color: colors.foreground }}>Blog</Text>
        </Text>
      </View>

      <Pressable
        onPress={toggleTheme}
        accessibilityRole="button"
        accessibilityLabel="Toggle theme"
        hitSlop={8}
        style={({ pressed }) => [
          styles.iconBtn,
          { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={19}
          color={colors.foreground}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
