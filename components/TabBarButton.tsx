import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ComponentProps } from "react";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/context/ThemeContext";

type IconName = ComponentProps<typeof FontAwesome>["name"];

type BaseTabBarButtonProps = Omit<
  ComponentProps<typeof Pressable>,
  "children" | "ref"
>;

type TabBarButtonProps = BaseTabBarButtonProps & {
  iconName: IconName;
  label: string;
};

export function TabBarButton({
  iconName,
  label,
  ...buttonProps
}: TabBarButtonProps) {
  const pressableProps: BaseTabBarButtonProps = buttonProps;

  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const focused =
    pressableProps.accessibilityState?.selected === true ||
    pressableProps["aria-selected"] === true;
  const color = focused ? theme.colors.primary : theme.colors.tabIconDefault;

  return (
    <Pressable
      {...pressableProps}
      style={[styles.button, isPressed && styles.buttonPressed]}
      android_ripple={null}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <FontAwesome size={24} color={color} name={iconName} />
        </View>
        <ThemedText variant="xs" semantic={focused ? "primary" : "muted"}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    button: {
      flex: 1,
    },
    buttonPressed: {
      backgroundColor: theme.colors.primaryLight + "20",
      borderRadius: theme.borderRadius.medium,
    },
    content: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.xs,
    },
    iconBox: {
      alignItems: "center",
      justifyContent: "center",
      width: theme.spacing.xl + theme.spacing.md,
      height: theme.spacing.xl + theme.spacing.md,
      borderRadius: theme.borderRadius.small,
    },
  });
