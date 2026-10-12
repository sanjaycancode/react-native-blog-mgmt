import { Redirect, Stack, usePathname } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { isAuthenticated, isInitializing } = useAuth();
  const pathname = usePathname();

  if (isInitializing) return null;
  if (!isAuthenticated && pathname !== "/register") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
    </Stack>
  );
}
