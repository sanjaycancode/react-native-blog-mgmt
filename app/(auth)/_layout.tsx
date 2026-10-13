import { Stack } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { isInitializing } = useAuth();

  if (isInitializing) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
    </Stack>
  );
}
