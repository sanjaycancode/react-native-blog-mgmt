import React, { useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

import Button from "./ThemedButton";

const BLOG_BASE_URL = "https://blog-ncc19.vercel.app";

export function Navbar() {
  const { colors, typography, spacing, isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const openWebsite = async (path: string) => {
    setIsOpen(false);

    try {
      await Linking.openURL(`${BLOG_BASE_URL}${path}`);
    } catch {
      Alert.alert(
        "Unable to open page",
        "Please check your connection and try again.",
      );
    }
  };

  const goToLogin = () => {
    setIsOpen(false);
    router.push("/login");
  };

  const goToHome = () => {
    setIsOpen(false);
    router.replace("/");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
        ]}
      >
        <Pressable onPress={goToHome} style={styles.brand} accessibilityRole="link">
          <View style={styles.logoIcon}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImage}
            />
          </View>
          <Text
            style={[
              styles.brandText,
              { color: colors.primary, fontSize: typography.sizes.lg },
            ]}
          >
            Nepal Can <Text style={{ color: colors.foreground }}>Blog</Text>
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={colors.foreground}
            />
          </Pressable>

          <Pressable
            onPress={() => setIsOpen((open) => !open)}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isOpen ? "Close navigation menu" : "Open navigation menu"}
            accessibilityState={{ expanded: isOpen }}
          >
            <Ionicons
              name={isOpen ? "close" : "menu"}
              size={20}
              color={colors.foreground}
            />
          </Pressable>
        </View>
      </View>

      {isOpen ? (
        <View
          style={[
            styles.menuDropdown,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              padding: spacing.lg,
            },
          ]}
        >
          <Pressable
            onPress={goToHome}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: pressed ? colors.muted : "transparent",
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: 8,
              },
            ]}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.base,
                fontWeight: typography.weights.bold,
              }}
            >
              Home
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void openWebsite("/blogs")}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: pressed ? colors.muted : "transparent",
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: 8,
              },
            ]}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes.base,
                fontWeight: typography.weights.medium,
              }}
            >
              Explore
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void openWebsite("/register")}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: pressed ? colors.muted : "transparent",
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: 8,
              },
            ]}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes.base,
                fontWeight: typography.weights.medium,
              }}
            >
              Write
            </Text>
          </Pressable>

          <View
            style={[
              styles.menuAuth,
              {
                borderTopColor: colors.border,
                paddingTop: spacing.md,
                marginTop: spacing.sm,
                gap: spacing.sm,
              },
            ]}
          >
            <Button title="Login" variant="outlined" onPress={goToLogin} />
            <Button
              title="Get Started"
              variant="filled"
              onPress={() => void openWebsite("/register")}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    zIndex: 100,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuDropdown: {
    borderTopWidth: 1,
  },
  menuItem: {
    marginBottom: 4,
  },
  menuAuth: {
    borderTopWidth: 1,
  },
  logoImage: {
    width: 24,
    height: 24,
  },
});

export default Navbar;
