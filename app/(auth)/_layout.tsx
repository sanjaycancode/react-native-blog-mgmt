import { Redirect, Stack, usePathname } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import iconSet from "@expo/vector-icons/build/Fontisto";

export default function AuthLayout() {
  const { isAuthenticated, isInitializing } = useAuth();
  const pathname = usePathname();

  if (isInitializing) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
    </Stack>
  );
}
