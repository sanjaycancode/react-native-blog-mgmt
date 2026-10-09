import "react-native-reanimated";

import { type ReactNode, useEffect } from "react";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/constants/theme";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

import { ReactQueryProvider } from "@/lib/react-query/ReactQueryProvider";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <ReactQueryProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <PaperThemeProvider>
              <ToastProvider>
                <AuthProvider>
                  <RootNavigator />
                </AuthProvider>
              </ToastProvider>
            </PaperThemeProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ReactQueryProvider>
  );
}

function PaperThemeProvider({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  const theme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      onPrimary: colors.primaryForeground,
      primaryContainer: colors.secondary,
      onPrimaryContainer: colors.secondaryForeground,
      secondary: colors.accent,
      onSecondary: colors.foreground,
      background: colors.background,
      onBackground: colors.foreground,
      surface: colors.card,
      onSurface: colors.foreground,
      surfaceVariant: colors.muted,
      onSurfaceVariant: colors.mutedForeground,
      outline: colors.border,
      outlineVariant: colors.divider,
    },
  };

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

function RootNavigator() {
  const { isDark } = useTheme();
  const { isInitializing } = useAuth();

  useEffect(() => {
    if (!isInitializing) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isInitializing]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
