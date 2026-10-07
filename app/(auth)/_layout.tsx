import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
    </Stack>
  );
}
