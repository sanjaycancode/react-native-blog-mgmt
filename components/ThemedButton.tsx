/**
 * Theme-aware button component
 */

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

import { useTheme, useThemeColors } from "@/context/ThemeContext";

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
  const { theme } = useTheme();
  const colors = useThemeColors();
  const isDisabled = Boolean(disabled);
  const styles = createStyles(theme, colors, variant, color, size, isDisabled);
  const labelVariant = getLabelVariant(size);
  const iconColor = styles.text.color;

  const renderLabel = () => {
    if (loading && !loadingText) return null;
    const _label = loading ? loadingText : title;
    return (
      <ThemedText variant={labelVariant} style={[styles.text, textStyle]}>
        {_label}
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
      disabled={isDisabled || loading}
      accessibilityState={{
        busy: loading,
        disabled: isDisabled || loading,
        selected: pressableProps.accessibilityState?.selected,
        checked: pressableProps.accessibilityState?.checked,
        expanded: pressableProps.accessibilityState?.expanded,
      }}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        styles.button,
        { opacity: pressed && !isDisabled && !loading ? 0.8 : 1 },
        style,
      ]}
      {...pressableProps}
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
  switch (size) {
    case "small":
      return "bodySmall";
    case "large":
      return "heading6";
    case "medium":
    default:
      return "body";
  }
}

function getIconSize(size: NonNullable<ThemedButtonProps["size"]>) {
  switch (size) {
    case "small":
      return 14;
    case "large":
      return 18;
    case "medium":
    default:
      return 16;
  }
}

function getColorValue(
  colors: ReturnType<typeof useThemeColors>,
  color: ThemedButtonColor,
) {
  switch (color) {
    case "success":
      return colors.success;
    case "danger":
      return colors.error;
    case "default":
      return colors.text;
    case "primary":
    default:
      return colors.primary;
  }
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
  theme: ReturnType<typeof useTheme>["theme"],
  colors: ReturnType<typeof useThemeColors>,
  variant: ThemedButtonVariant,
  color: ThemedButtonColor,
  size: NonNullable<ThemedButtonProps["size"]>,
  disabled: boolean,
) => {
  const resolvedColor = getColorValue(colors, color);

  const getBackgroundColor = () => {
    if (disabled) return colors.disabled;

    switch (variant) {
      case "outlined":
      case "text":
        return "transparent";
      case "accent":
        return hexToRgba(resolvedColor, theme.mode === "dark" ? 0.24 : 0.14);
      case "filled":
      default:
        return resolvedColor;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.disabled;
    if (variant === "outlined") return resolvedColor;
    return "transparent";
  };

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;

    switch (variant) {
      case "filled":
        return colors.textOnPrimary;
      case "outlined":
      case "accent":
      case "text":
      default:
        return resolvedColor;
    }
  };

  const getPadding = () => {
    switch (size) {
      case "small":
        return {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        };
      case "large":
        return {
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xl,
        };
      case "medium":
      default:
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        };
    }
  };

  return StyleSheet.create({
    button: {
      flexDirection: "row",
      borderRadius: theme.borderRadius.medium,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: getBackgroundColor(),
      borderWidth: variant === "outlined" ? 1 : 0,
      borderColor: getBorderColor(),
      gap: theme.spacing.sm,
      ...getPadding(),
    },
    fullWidth: {
      alignSelf: "stretch",
    },
    text: {
      color: getTextColor(),
    },
  });
};
