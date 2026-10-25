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

function RootNavigator() {
  const { isDark } = useTheme();
  const { isInitializing, session } = useAuth();
  const { isReady: onboardingReady, hasSeenOnboarding } = useOnboardingStatus();
  const pathname = usePathname();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const onOnboarding = pathname === "/onboarding";

  // Wait until we know the auth state, the saved flag, and that the navigator
  // exists. Signed-in users never see onboarding, even on a fresh install.
  const ready = !isInitializing && onboardingReady && !!navigationState?.key;
  const needsOnboarding = ready && !hasSeenOnboarding && !session;

  useEffect(() => {
    if (!ready) return;
    if (needsOnboarding && !onOnboarding) router.replace("/onboarding");
    else if (!needsOnboarding && onOnboarding) router.replace("/");
  }, [ready, needsOnboarding, onOnboarding, router]);

  // A signed-in user counts as having seen it, so logging out later doesn't
  // suddenly drop them into onboarding.
  useEffect(() => {
    if (ready && session && !hasSeenOnboarding) {
      void markOnboardingSeen().catch(() => undefined);
    }
  }, [ready, session, hasSeenOnboarding]);

  // Keep the splash up until we're on the right screen, so a first-time user
  // never sees a flash of the home screen before onboarding appears.
  const settled = ready && (needsOnboarding ? onOnboarding : !onOnboarding);

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

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
      </View>
    </>
  );
}
