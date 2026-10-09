import { type ReactNode,useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  Appbar,
  Divider,
  Surface,
  Text,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useTheme } from "@/constants/theme";

type AdminShellProps = {
  children: ReactNode;
  userName?: string;
  onLogout: () => void;
};

const navigationItems = [
  { label: "Overview", icon: "grid-outline", available: true },
  { label: "Blogs", icon: "document-text-outline", available: false },
  { label: "Categories", icon: "pricetags-outline", available: false },
  { label: "Users", icon: "people-outline", available: false },
  { label: "Profile", icon: "person-circle-outline", available: false },
] as const;

export function AdminShell({
  children,
  userName,
  onLogout,
}: AdminShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const closeDrawer = () => setDrawerVisible(false);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Appbar.Header
        mode="small"
        elevated
        style={{ backgroundColor: colors.card }}
      >
        <Appbar.Action
          accessibilityLabel="Open admin navigation"
          icon={({ color, size }) => (
            <Ionicons name="menu-outline" color={color} size={size} />
          )}
          onPress={() => setDrawerVisible(true)}
        />
        <Appbar.Content
          title="Admin"
          subtitle={userName ? `Welcome, ${userName}` : "Administration"}
        />
        <Appbar.Action
          accessibilityLabel="Log out"
          icon={({ color, size }) => (
            <Ionicons name="log-out-outline" color={color} size={size} />
          )}
          onPress={onLogout}
        />
      </Appbar.Header>

      <View style={styles.content}>{children}</View>

      <Modal
        animationType="fade"
        onRequestClose={closeDrawer}
        transparent
        visible={drawerVisible}
      >
        <View style={styles.drawerOverlay}>
          <Pressable
            accessibilityLabel="Close admin navigation"
            accessibilityRole="button"
            onPress={closeDrawer}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.foreground, opacity: 0.4 },
            ]}
          />
          <Surface
            elevation={4}
            style={[
              styles.drawer,
              {
                backgroundColor: colors.card,
                borderTopRightRadius: radii.lg,
                borderBottomRightRadius: radii.lg,
                paddingTop: insets.top + spacing.md,
                paddingBottom: insets.bottom + spacing.md,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <View style={[styles.drawerHeading, { paddingBottom: spacing.md }]}>
              <View>
                <Text variant="titleLarge">Admin menu</Text>
                {userName ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    {userName}
                  </Text>
                ) : null}
              </View>
              <Appbar.Action
                accessibilityLabel="Close admin navigation"
                icon="close"
                onPress={closeDrawer}
              />
            </View>
            <Divider />

            <View style={{ paddingTop: spacing.sm }}>
              {navigationItems.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole={item.available ? "button" : undefined}
                  accessibilityState={{ disabled: !item.available }}
                  disabled={!item.available}
                  onPress={() => {
                    closeDrawer();
                  }}
                  style={({ pressed }) => [
                    styles.navigationItem,
                    {
                      borderRadius: radii.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      backgroundColor: pressed
                        ? colors.muted
                        : item.available
                          ? colors.secondary
                          : "transparent",
                      opacity: item.available ? 1 : 0.55,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.available ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.navigationLabel,
                      {
                        color: item.available
                          ? colors.foreground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {!item.available ? (
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.mutedForeground }}
                    >
                      Soon
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>

            <View style={styles.drawerFooter}>
              <Divider />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeDrawer();
                  router.replace("/");
                }}
                style={[
                  styles.footerAction,
                  { paddingVertical: spacing.md },
                ]}
              >
                <Ionicons
                  name="home-outline"
                  size={20}
                  color={colors.foreground}
                />
                <Text variant="bodyMedium">Back to app</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  closeDrawer();
                  onLogout();
                }}
                style={[
                  styles.footerAction,
                  { paddingVertical: spacing.md },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text variant="bodyMedium" style={{ color: colors.primary }}>
                  Log out
                </Text>
              </Pressable>
            </View>
          </Surface>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  drawer: {
    width: "82%",
    maxWidth: 320,
    height: "100%",
  },
  drawerHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navigationItem: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 48,
    marginBottom: 4,
  },
  navigationLabel: {
    flex: 1,
    marginLeft: 16,
  },
  drawerFooter: {
    marginTop: "auto",
  },
  footerAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
  },
});

export default AdminShell;
