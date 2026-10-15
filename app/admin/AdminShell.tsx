import { type ReactNode, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { type Href, usePathname, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { Appbar, Divider, Surface, Text } from "react-native-paper";
import {
  SafeAreaProvider,
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
  { label: "Overview", icon: "grid-outline", href: "/admin", available: true },
  {
    label: "Blogs",
    icon: "document-text-outline",
    href: "/admin/blog",
    available: true,
  },
  {
    label: "Categories",
    icon: "pricetags-outline",
    href: "/admin/category",
    available: true,
  },
  {
    label: "Users",
    icon: "people-outline",
    href: "/admin/users",
    available: true,
  },
  {
    label: "Profile",
    icon: "person-circle-outline",
    href: "/admin/profile",
    available: true,
  },
] as const;



function AdminDrawer({
  userName,
  onClose,
  onLogout,
}: {
  userName?: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();

  return (
    <View style={styles.drawerOverlay}>
      <Pressable
        accessibilityLabel="Close admin navigation"
        accessibilityRole="button"
        onPress={onClose}
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
            paddingBottom: insets.bottom + spacing.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <View style={[styles.drawerHeading, { paddingBottom: spacing.md }]}>
          <View>
            <Text variant="titleLarge">Admin Menu</Text>
            {userName ? (
              <Text
                variant="bodyMedium"
                style={{ color: colors.mutedForeground }}
              >
                {userName}
              </Text>
            ) : null}
          </View>
          <Appbar.Action
            accessibilityLabel="Close admin navigation"
            icon="close"
            onPress={onClose}
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
                onClose();
                if (item.available) {
                  router.replace(item.href as Href);
                }
              }}
              style={({ pressed }) => [
                styles.navigationItem,
                {
                  borderRadius: radii.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  backgroundColor:
                    pathname === item.href || pressed
                      ? colors.muted
                      : colors.background,
                },
              ]}
            >
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text
                variant="bodyMedium"
                style={[
                  styles.navigationLabel,
                  {
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.foreground,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.drawerFooter}>
          <Divider />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              router.replace("/");
            }}
            style={[styles.footerAction, { paddingVertical: spacing.md }]}
          >
            <Ionicons name="home-outline" size={20} color={colors.foreground} />
            <Text variant="bodyMedium">Back to app</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onLogout();
            }}
            style={[styles.footerAction, { paddingVertical: spacing.md }]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.primary }}>
              Log out
            </Text>
          </Pressable>
        </View>
      </Surface>
    </View>
  );
}


export function AdminShell({ children, userName, onLogout }: AdminShellProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const closeDrawer = () => setDrawerVisible(false);

  return (
 
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.card }]}
    >

      <Appbar.Header
        mode="small"
        elevated
        statusBarHeight={0}
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
          titleStyle={{ fontSize: 16, fontWeight: "700" }}
          title={userName ? `Welcome, ${userName}` : "Administration"}
        />
        <Pressable
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={19}
            color={colors.foreground}
          />
        </Pressable>
        <Appbar.Action
          accessibilityLabel="Log out"
          icon={({ color, size }) => (
            <Ionicons name="log-out-outline" color={color} size={size} />
          )}
          onPress={onLogout}
        />
      </Appbar.Header>

      {/* Page content keeps the normal background color */}
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {children}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeDrawer}
        transparent
  
        visible={drawerVisible}
      >
        <SafeAreaProvider>
          <AdminDrawer
            userName={userName}
            onClose={closeDrawer}
            onLogout={onLogout}
          />
        </SafeAreaProvider>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AdminShell;