import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../constants/theme";

import Button from "./ThemedButton";

interface NavbarProps {
  onNavigate?: (route: string) => void;
  activeRoute?: string;
}

export function Navbar({ onNavigate, activeRoute = "home" }: NavbarProps) {
  const { colors, typography, spacing, isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "explore", label: "Explore" },
    { id: "write", label: "Write" },
  ];

  const handleNav = (id: string) => {
    setIsOpen(false);
    onNavigate?.(id);
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
        <Pressable onPress={() => handleNav("home")} style={styles.brand}>
          <View style={[styles.logoIcon]}>
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
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={colors.foreground}
            />
          </Pressable>

          <Pressable
            onPress={() => setIsOpen(!isOpen)}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Toggle Navigation Menu"
          >
            <Ionicons
              name={isOpen ? "close" : "menu"}
              size={20}
              color={colors.foreground}
            />
          </Pressable>
        </View>
      </View>

      {isOpen && (
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
          {navItems.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleNav(item.id)}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: isActive
                      ? colors.muted
                      : pressed
                        ? colors.muted
                        : "transparent",
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    borderRadius: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? colors.primary : colors.foreground,
                    fontSize: typography.sizes.base,
                    fontWeight: isActive
                      ? typography.weights.bold
                      : typography.weights.medium,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

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
            <Button title="Login" variant="outlined" onPress={() => handleNav("login")} />
            <Button title="Get Started" variant="filled" onPress={() => handleNav("register")} />
          </View>
        </View>
      )}
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
    width: 20,
    height: 20,
  },
});

export default Navbar;
