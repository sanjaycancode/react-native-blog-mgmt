import React from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

type InputTone =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "default";
type InputVariant = "outlined" | "accent";
type InputSize = "xs" | "sm" | "md" | "lg";

export interface ThemedTextInputProps extends TextInputProps {
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  label?: string;
  error?: boolean;
  variant?: InputVariant;
  color?: InputTone;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onEndIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  helperText?: string;
  fullWidth?: boolean;
  textInputComponent?: React.ComponentType<TextInputProps>;
  size?: InputSize;
}

const TONE_TO_COLOR_KEY: Record<
  InputTone,
  "primary" | "accent" | "mutedForeground"
> = {
  default: "mutedForeground",
  primary: "primary",
  success: "accent",
  error: "primary",
  warning: "accent",
  info: "primary",
};

function withAlpha(hexColor: string, alphaHex: string) {
  if (/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return `${hexColor}${alphaHex}`;
  }
  return hexColor;
}

export function ThemedTextInput({
  disabled = false,
  readOnly = false,
  required = false,
  label,
  value,
  defaultValue,
  placeholder,
  error = false,
  variant = "outlined",
  color = "primary",
  startIcon,
  endIcon,
  onEndIconPress,
  helperText,
  fullWidth = true,
  onFocus,
  onBlur,
  secureTextEntry,
  textInputComponent: TextInputComponent = TextInput,
  containerStyle,
  size = "md",
  editable,
  multiline,
  style,
  ...props
}: ThemedTextInputProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const isReadOnly = readOnly && !disabled;
  const canEdit = !disabled && !isReadOnly && editable !== false;
  const [isFocused, setIsFocused] = React.useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const textValue =
    typeof value === "string"
      ? value
      : typeof defaultValue === "string"
        ? defaultValue
        : "";
  const hasText = textValue.length > 0;

  const animatedValue = React.useRef(
    new Animated.Value(hasText ? 1 : 0),
  ).current;

  React.useEffect(() => {
    if (!canEdit) {
      setIsFocused(false);
    }

    Animated.timing(animatedValue, {
      toValue: isFocused || hasText ? 1 : 0,
      duration: 170,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, canEdit, hasText, isFocused]);

  const handleFocus = React.useCallback(
    (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      if (!canEdit) return;
      setIsFocused(true);
      onFocus?.(event);
    },
    [canEdit, onFocus],
  );

  const handleBlur = React.useCallback(
    (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setIsFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const activeColor = theme.colors[TONE_TO_COLOR_KEY[color]];
  const showPasswordToggle = !!secureTextEntry && !endIcon;

  const borderColor = error
    ? theme.colors.primary
    : !canEdit
      ? theme.colors.muted
      : isFocused
        ? activeColor
        : theme.colors.border;

  const backgroundColor = !canEdit
    ? withAlpha(theme.colors.muted, "1F")
    : variant === "accent"
      ? withAlpha(activeColor, "1A")
      : theme.colors.card;

  const labelColor = error
    ? theme.colors.primary
    : !canEdit
      ? theme.colors.mutedForeground
      : isFocused
        ? activeColor
        : theme.colors.mutedForeground;

  const labelAnimatedStyle = {
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [size === "xs" ? 10 : 14, -9],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [
        theme.typography.sizes.sm,
        theme.typography.sizes.xs,
      ],
    }),
  };

  const renderIcon = React.useCallback(
    (icon: React.ReactNode, position: "start" | "end") => {
      if (!icon || !React.isValidElement(icon)) {
        return null;
      }

      const iconColor = !canEdit
        ? theme.colors.muted
        : theme.colors.mutedForeground;
      const element = React.cloneElement(
        icon as React.ReactElement<{ color?: string }>,
        {
          color: iconColor,
        },
      );

      return (
        <View style={position === "start" ? styles.startIcon : styles.endIcon}>
          {element}
        </View>
      );
    },
    [
      canEdit,
      styles.endIcon,
      styles.startIcon,
      theme.colors.muted,
      theme.colors.mutedForeground,
    ],
  );

  const renderEndAdornment = () => {
    if (endIcon) {
      return (
        <TouchableOpacity
          style={styles.endAdornmentTouch}
          onPress={onEndIconPress}
          disabled={!canEdit || !onEndIconPress}
          activeOpacity={0.7}
        >
          {renderIcon(endIcon, "end")}
        </TouchableOpacity>
      );
    }

    if (showPasswordToggle) {
      return (
        <TouchableOpacity
          style={styles.endAdornmentTouch}
          onPress={() => setIsPasswordVisible((prev) => !prev)}
          disabled={!canEdit}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={
              !canEdit ? theme.colors.muted : theme.colors.mutedForeground
            }
          />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={[fullWidth && styles.fullWidth]}>
      <View
        style={[
          styles.container,
          styles[containerSizeStyleMap[size]],
          variant === "accent" && styles.containerAccent,
          { borderColor, backgroundColor },
          containerStyle,
        ]}
      >
        {label ? (
          <Animated.Text
            style={[
              styles.label,
              labelAnimatedStyle,
              {
                color: labelColor,
                backgroundColor:
                  variant === "accent"
                    ? "transparent"
                    : theme.colors.card,
              },
              !!startIcon && styles.labelWithStartIcon,
            ]}
            pointerEvents="none"
          >
            {label}
            {required ? (
              <ThemedText
                semantic={error ? "error" : "muted"}
                style={styles.requiredMark}
              >
                *
              </ThemedText>
            ) : null}
          </Animated.Text>
        ) : null}

        {renderIcon(startIcon, "start")}

        <TextInputComponent
          {...props}
          style={[
            styles.input,
            styles[inputSizeStyleMap[size]],
            multiline && styles.multilineInput,
            !canEdit && styles.disabledInput,
            style,
          ]}
          value={value}
          defaultValue={defaultValue}
          placeholder={
            isFocused ? placeholder : label ? undefined : placeholder
          }
          placeholderTextColor={theme.colors.mutedForeground}
          secureTextEntry={!!secureTextEntry && !isPasswordVisible}
          cursorColor={activeColor}
          selectionColor={withAlpha(activeColor, "99")}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={canEdit}
          multiline={multiline}
        />

        {renderEndAdornment()}
      </View>

      {helperText ? (
        <View style={styles.helperContainer}>
          <ThemedText variant="caption" semantic={error ? "error" : "muted"}>
            {helperText}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const containerSizeStyleMap: Record<
  InputSize,
  "containerXs" | "containerSm" | "containerMd" | "containerLg"
> = {
  xs: "containerXs",
  sm: "containerSm",
  md: "containerMd",
  lg: "containerLg",
};

const inputSizeStyleMap: Record<
  InputSize,
  "inputXs" | "inputSm" | "inputMd" | "inputLg"
> = {
  xs: "inputXs",
  sm: "inputSm",
  md: "inputMd",
  lg: "inputLg",
};

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fullWidth: {
      width: "100%",
    },
    container: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.card,
    },
    containerAccent: {
      borderWidth: 0,
    },
    containerXs: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.sm,
    },
    containerSm: {
      minHeight: 42,
      paddingHorizontal: theme.spacing.md - 1,
    },
    containerMd: {
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    containerLg: {
      minHeight: 54,
      paddingHorizontal: theme.spacing.lg - 2,
    },
    input: {
      flex: 1,
      height: "100%",
      color: theme.colors.foreground,
      paddingVertical: 0,
    },
    inputXs: {
      fontSize: theme.typography.sizes.xs,
    },
    inputSm: {
      fontSize: theme.typography.sizes.sm,
    },
    inputMd: {
      fontSize: theme.typography.sizes.base,
    },
    inputLg: {
      fontSize: theme.typography.sizes.base,
    },
    multilineInput: {
      minHeight: 88,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      textAlignVertical: "top",
    },
    label: {
      position: "absolute",
      left: theme.spacing.md,
      zIndex: 1,
      paddingHorizontal: 4,
    },
    labelWithStartIcon: {
      left: 34,
    },
    requiredMark: {
      fontSize: theme.typography.sizes.xs,
      lineHeight:
        theme.typography.sizes.xs * theme.typography.lineHeights.normal,
    },
    startIcon: {
      marginRight: theme.spacing.sm,
    },
    endIcon: {
      marginLeft: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    endAdornmentTouch: {
      alignItems: "center",
      justifyContent: "center",
    },
    disabledInput: {
      color: theme.colors.mutedForeground,
    },
    helperContainer: {
      marginTop: theme.spacing.sm,
      marginLeft: theme.spacing.md,
    },
  });
}

export default ThemedTextInput;
