import { ScrollView, StyleSheet, View } from "react-native";

import { useRouter } from "expo-router";

import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <ThemedText variant="heading2">Settings</ThemedText>
          <ThemedText variant="body" semantic="muted">
            Manage your preferences and session.
          </ThemedText>
        </View>

        <ThemedCard style={styles.card}>
          <ThemedText variant="heading6">Appearance</ThemedText>
          <ThemedText variant="bodySmall" semantic="muted">
            Current mode: {theme.mode}
          </ThemedText>
          <ThemedButton
            title="Choose appearance"
            variant="outlined"
            onPress={() => router.push("/(auth)/appearance")}
          />
        </ThemedCard>

        <ThemedButton
          title="Log out"
          variant="filled"
          onPress={() => void logout()}
        />
      </ScrollView>
    </ThemedSafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
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
