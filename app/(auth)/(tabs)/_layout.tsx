import { Tabs } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarButton } from "@/components/TabBarButton";

import { useTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
      <Tabs
        initialRouteName="home/index"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            height: theme.spacing.xl * 2 + insets.bottom,
            paddingTop: theme.spacing.sm,
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
          },
          headerShown: false,
        }}
      >
        {/* The `index` route sets up the initial screen of the tab navigator. */}
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="home/index"
          options={{
            title: "Home",
            tabBarButton: (props) => (
              <TabBarButton {...props} iconName="home" label="Home" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings/index"
          options={{
            title: "Settings",
            tabBarButton: (props) => (
              <TabBarButton {...props} iconName="cog" label="Settings" />
            ),
          }}
        />
      </Tabs>
  );
}
