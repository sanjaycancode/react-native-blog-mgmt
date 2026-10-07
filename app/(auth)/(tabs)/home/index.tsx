import { ScrollView, StyleSheet, View } from "react-native";

import { useRouter } from "expo-router";

import ThemedButton from "@/components/ThemedButton";
import ThemedCard from "@/components/ThemedCard";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

export default function HomeScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <ThemedText variant="heading2">Home</ThemedText>
          <ThemedText variant="body" semantic="muted">
            Your app is ready. Add your first feature here.
          </ThemedText>
        </View>

        <ThemedCard style={styles.card}>
          <ThemedText variant="heading6">Get started</ThemedText>
          <ThemedText variant="bodySmall" semantic="muted">
            Explore the starter navigation and appearance settings.
          </ThemedText>
          <ThemedButton
            title="Settings"
            variant="outlined"
            onPress={() => router.navigate("/(auth)/(tabs)/settings")}
          />
          <ThemedButton
            title="Appearance"
            variant="outlined"
            onPress={() => router.push("/(auth)/appearance")}
          />
        </ThemedCard>
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
