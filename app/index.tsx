import { Redirect } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function IndexScreen() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return null;

  return (
    <Redirect href={isAuthenticated ? "/(auth)/(tabs)/home" : "/login"} />
  );
}
