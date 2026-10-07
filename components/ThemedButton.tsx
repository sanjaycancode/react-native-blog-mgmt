import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

type ThemedButtonVariant = "filled" | "outlined" | "accent" | "text";
type ThemedButtonColor = "primary" | "success" | "danger" | "default";
type ThemedButtonIcon =
  | React.ReactElement<{ size?: number; color?: string }>
  | React.ComponentType<{ size?: number; color?: string }>;

interface ThemedButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: ThemedButtonVariant;
  color?: ThemedButtonColor;
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  startIcon?: ThemedButtonIcon;
  endIcon?: ThemedButtonIcon;
  loading?: boolean;
  loadingText?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function ThemedButton({
  title,
  variant = "filled",
  color = "primary",
  size = "medium",
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  loading = false,
  loadingText,
  style,
  textStyle,
  ...pressableProps
}: ThemedButtonProps) {
  const theme = useTheme();
  const isDisabled = Boolean(disabled);
  const styles = createStyles(theme, variant, color, size, isDisabled);
  const labelVariant = getLabelVariant(size);
  const iconColor = styles.text.color;

  const renderLabel = () => {
    if (loading && !loadingText) return null;
    return (
      <ThemedText
        variant={labelVariant}
        style={[styles.text, textStyle]}
        semantic="default"
      >
        {loading ? loadingText : title}
      </ThemedText>
    );
  };

  const renderIcon = (icon?: ThemedButtonIcon) => {
    if (!icon || loading) return null;

    const iconSize = getIconSize(size);

    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, {
        ...icon.props,
        size: icon.props.size ?? iconSize,
        color: icon.props.color ?? iconColor,
      });
    }

    const IconComponent = icon;
    return <IconComponent size={iconSize} color={iconColor} />;
  };

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled || loading}
      accessibilityState={{
        ...pressableProps.accessibilityState,
        busy: loading,
        disabled: isDisabled || loading,
      }}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        styles.button,
        { opacity: pressed && !isDisabled && !loading ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <>
          <ActivityIndicator color={iconColor} size="small" />
          {renderLabel()}
        </>
      ) : (
        <>
          {renderIcon(startIcon)}
          {renderLabel()}
          {renderIcon(endIcon)}
        </>
      )}
    </Pressable>
  );
}

function getLabelVariant(size: NonNullable<ThemedButtonProps["size"]>) {
  if (size === "small") return "bodySmall";
  if (size === "large") return "heading6";
  return "body";
}

function getIconSize(size: NonNullable<ThemedButtonProps["size"]>) {
  if (size === "small") return 14;
  if (size === "large") return 18;
  return 16;
}

function hexToRgba(hex: string, alpha: number) {
  const normalizedHex = hex.replace("#", "");
  const expandedHex =
    normalizedHex.length === 3
      ? normalizedHex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalizedHex;
  const red = Number.parseInt(expandedHex.slice(0, 2), 16);
  const green = Number.parseInt(expandedHex.slice(2, 4), 16);
  const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const createStyles = (
  theme: ReturnType<typeof useTheme>,
  variant: ThemedButtonVariant,
  color: ThemedButtonColor,
  size: NonNullable<ThemedButtonProps["size"]>,
  disabled: boolean,
) => {
  const resolvedColor =
    color === "danger"
      ? theme.colors.primary
      : color === "success"
        ? theme.colors.primary
        : color === "default"
          ? theme.colors.foreground
          : theme.colors.primary;
  const backgroundColor = disabled
    ? theme.colors.muted
    : variant === "filled"
      ? resolvedColor
      : variant === "accent"
        ? hexToRgba(resolvedColor, theme.isDark ? 0.24 : 0.14)
        : "transparent";
  const textColor = disabled
    ? theme.colors.mutedForeground
    : variant === "filled"
      ? theme.colors.primaryForeground
      : resolvedColor;
  const padding =
    size === "small"
      ? { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md }
      : size === "large"
        ? {
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing["2xl"],
          }
        : {
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
          };

  return StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: variant === "outlined" ? 1 : 0,
      borderColor: disabled ? theme.colors.border : resolvedColor,
      backgroundColor,
      ...padding,
    },
    fullWidth: {
      alignSelf: "stretch",
    },
    text: {
      color: textColor,
    },
  });
};

export default ThemedButton;
