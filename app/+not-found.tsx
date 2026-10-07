import { StyleSheet, View } from "react-native";

import { Link, Stack, usePathname } from "expo-router";

import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

export default function NotFoundScreen() {
  const pathname = usePathname();
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />

      <ThemedSafeAreaView edges={["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
          <ThemedText variant="mono">{pathname}</ThemedText>
          <ThemedText variant="heading3" semantic="error" style={styles.title}>
            This screen doesn't exist.
          </ThemedText>
          <Link href="/" style={styles.link}>
            <ThemedText variant="bodySmall" semantic="primary">
              Go to home screen!
            </ThemedText>
          </Link>
        </View>
      </ThemedSafeAreaView>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    title: {
      textAlign: "center",
    },
    link: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
  });
