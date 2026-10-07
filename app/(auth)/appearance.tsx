import { ScrollView, StyleSheet, View } from "react-native";

import { Stack, useRouter } from "expo-router";

import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { useTheme, useThemeMode } from "@/context/ThemeContext";

export default function AppearanceScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { mode, setTheme } = useThemeMode();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Appearance" }} />
      <ThemedSafeAreaView edges={["left", "right", "bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <ThemedText variant="heading2">Appearance</ThemedText>
            <ThemedText variant="body" semantic="muted">
              Current mode: {mode}
            </ThemedText>
          </View>

          <ThemedCard style={styles.card}>
            <ThemedButton
              title="Light"
              variant={mode === "light" ? "filled" : "outlined"}
              onPress={() => setTheme("light")}
            />
            <ThemedButton
              title="Dark"
              variant={mode === "dark" ? "filled" : "outlined"}
              onPress={() => setTheme("dark")}
            />
          </ThemedCard>
          <ThemedButton
            title="Back to settings"
            variant="outlined"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(auth)/(tabs)/settings")
            }
          />
        </ScrollView>
      </ThemedSafeAreaView>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    header: {
      gap: theme.spacing.sm,
    },
    card: {
      gap: theme.spacing.md,
    },
  });
