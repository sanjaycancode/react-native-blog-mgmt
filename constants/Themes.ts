/**
 * Comprehensive theme configuration for the application
 */

import { Platform } from "react-native";

import { DarkTheme, DefaultTheme } from "expo-router";

export const Colors = {
  light: {
    // Primary (Crimson)
    primary: "#DC143C",
    primaryLight: "#FFB3C1",
    primaryDark: "#A50E2C",

    // Background & Surfaces
    background: "#F9F9FF",
    surface: "#FFFFFF",
    backgroundAlt: "#FFFFFF",
    border: "#E5E7EB",
    overlay: "rgba(15, 23, 42, 0.05)",

    // Typography
    text: "#1F2937",
    textSecondary: "#6B7280",
    textTertiary: "#9CA3AF",
    textOnPrimary: "#FFFFFF",

    // Accent (Single Choice)
    accent: "#60A5FA",

    // Semantic Colors
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",

    // UI States
    disabled: "#D1D5DB",
    focusRing: "#DC143C",

    // Tab/Tint (for compatibility)
    tint: "#DC143C",
    tabIconDefault: "#D1D5DB",
    tabIconSelected: "#DC143C",
  },
  dark: {
    // Primary (Crimson adjusted for dark surfaces)
    primary: "#FF5C75",
    primaryLight: "#FF9EB0",
    primaryDark: "#DC143C",

    // Background & Surfaces
    background: "#0F172A",
    surface: "#1E293B",
    surfaceElevated: "#273449",
    backgroundAlt: "#1E293B",
    border: "#334155",
    overlay: "rgba(0, 0, 0, 0.4)",

    // Typography
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    textTertiary: "#64748B",
    textOnPrimary: "#0F172A",

    // Accent (Same Strategy)
    accent: "#60A5FA",

    // Semantic Colors (Dark Adjusted)
    success: "#4ADE80",
    warning: "#FBBF24",
    error: "#F87171",
    info: "#60A5FA",

    // UI States
    disabled: "#475569",
    focusRing: "#FF5C75",

    // Tab/Tint (for compatibility)
    tint: "#FF5C75",
    tabIconDefault: "#64748B",
    tabIconSelected: "#FF5C75",
  },
} as const;

/**
 * Generate React Navigation theme from custom theme colors
 */
export function getNavigationTheme(mode: "light" | "dark") {
  const colors = Colors[mode];
  const baseTheme = mode === "light" ? DefaultTheme : DarkTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.backgroundAlt,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };
}

export const Typography = {
  heading1: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  heading2: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
  },
  heading3: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
  },
  heading4: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  heading5: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
  },
  heading6: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  xs: {
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 14,
  },
  mono: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    fontFamily: Platform.select({ ios: "Courier", default: "monospace" }),
  },
} as const;

export const Spacing = {
  xs: 3,
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
} as const;

export const BorderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  light: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  heavy: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
export const AvatarSizes = {
  xs: 32,
  sm: 44,
  md: 54,
  lg: 72,
} as const;

export type AvatarSize = keyof typeof AvatarSizes;
export type Theme = typeof Colors.light;
export type ColorName = keyof Theme;
