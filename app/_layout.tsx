import "react-native-reanimated";

import { type ReactNode, useEffect } from "react";
import { View } from "react-native";

import {
  Stack,
  usePathname,
  useRootNavigationState,
  useRouter,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useState } from "react";
import { Image, StyleSheet } from "react-native";

import Navbar from "@/components/NavBar";

import { ThemeProvider, useTheme } from "@/constants/theme";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

import { markOnboardingSeen, useOnboardingStatus } from "@/hooks/useOnboarding";

import { ReactQueryProvider } from "@/lib/react-query/ReactQueryProvider";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
  usePathname,
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

const MIN_SPLASH_MS = 1200; // minimum time the full-screen image stays visible

function RootNavigator() {
  const { isDark } = useTheme();
  const { isInitializing, session } = useAuth();
  const { isReady: onboardingReady, hasSeenOnboarding } = useOnboardingStatus();
  const pathname = usePathname();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  const onOnboarding = pathname === "/onboarding";

  const ready = !isInitializing && onboardingReady && !!navigationState?.key;
  const needsOnboarding = ready && !hasSeenOnboarding && !session;

  useEffect(() => {
    if (!ready) return;
    if (needsOnboarding && !onOnboarding) router.replace("/onboarding");
    else if (!needsOnboarding && onOnboarding) router.replace("/");
  }, [ready, needsOnboarding, onOnboarding, router]);

  useEffect(() => {
    if (ready && session && !hasSeenOnboarding) {
      void markOnboardingSeen().catch(() => undefined);
    }
  }, [ready, session, hasSeenOnboarding]);

  const settled = ready && (needsOnboarding ? onOnboarding : !onOnboarding);

  // The overlay stays until the right screen is ready AND the minimum time passed.
  const showSplashOverlay = !(settled && minTimePassed);

  // NOTE: the old `useEffect(() => { if (settled) SplashScreen.hideAsync() })`
  // is removed. The native splash now hides when the overlay image loads.

  const hideNavbar =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/blog/");

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="onboarding"
            options={{ gestureEnabled: false, animation: "fade" }}
          />
        </Stack>
        {!hideNavbar && <Navbar />}

        {showSplashOverlay && (
          <View style={[StyleSheet.absoluteFill, styles.splashOverlay]}>
            <Image
              source={require("../assets/images/ncbsplash.png")}
              style={styles.splashImage}
              resizeMode="cover"
              onLoadEnd={() =>
                void SplashScreen.hideAsync().catch(() => undefined)
              }
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    zIndex: 999,
    elevation: 999, // Android needs elevation to stay above other views
    backgroundColor: "#F9F9FF", // same as your native splash color
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
});
