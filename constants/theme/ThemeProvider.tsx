import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, ThemeColors } from './colors';
import { Radii,radii, Spacing, spacing } from './spacing';
import { Typography,typography } from './typography';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  radii: Radii;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [manualMode, setManualMode] = useState<ThemeMode>('light');

  const resolvedMode = manualMode === 'system' ? (systemColorScheme ?? 'light') : manualMode;
  const isDark = resolvedMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setManualMode((prev) => {
      const current = prev === 'system' ? (systemColorScheme ?? 'light') : prev;
      return current === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        colors,
        typography,
        spacing,
        radii,
        isDark,
        mode: manualMode,
        toggleTheme,
        setMode: setManualMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
