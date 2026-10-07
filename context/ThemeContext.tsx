/**
 * Theme context and provider for managing app-wide theme
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { ThemeProvider as NavigationThemeProvider } from "expo-router";

import {
  BorderRadius,
  Colors,
  getNavigationTheme,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/Themes";

export type ThemeMode = "light" | "dark";

interface Theme {
  mode: ThemeMode;
  colors: typeof Colors.light | typeof Colors.dark;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  shadows: typeof Shadows;
  navigationTheme: ReturnType<typeof getNavigationTheme>;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (systemColorScheme as ThemeMode) || "light",
  );

  useEffect(() => {
    if (systemColorScheme) {
      setThemeMode(systemColorScheme as ThemeMode);
    }
  }, [systemColorScheme]);

  const theme: Theme = {
    mode: themeMode,
    colors: Colors[themeMode],
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
    navigationTheme: getNavigationTheme(themeMode),
  };

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <NavigationThemeProvider value={theme.navigationTheme}>
      <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    </NavigationThemeProvider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Convenience hook for accessing only colors
 */
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

/**
 * Convenience hook for accessing theme mode
 */
export function useThemeMode() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return { mode: theme.mode, toggleTheme, setTheme };
}
