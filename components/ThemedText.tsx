import { Text as DefaultText, TextStyle } from "react-native";

import { Colors } from "@/constants/Themes";

import { useTheme } from "@/context/ThemeContext";

type ThemeMode = keyof typeof Colors;
type ThemeColorName = keyof (typeof Colors)[ThemeMode];
type TypographyVariant = keyof ReturnType<
  typeof useTheme
>["theme"]["typography"];

const semanticColorMap = {
  default: "text",
  muted: "textSecondary",
  primary: "primary",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  disabled: "disabled",
} as const satisfies Record<string, ThemeColorName>;

export type ThemedTextSemantic = keyof typeof semanticColorMap;

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedTextProps = ThemeProps &
  DefaultText["props"] & {
    variant?: TypographyVariant;
    semantic?: ThemedTextSemantic;
  };

function resolveColor(
  mode: ThemeMode,
  semantic: ThemedTextSemantic,
  lightColor?: string,
  darkColor?: string,
) {
  const colorFromProps = mode === "light" ? lightColor : darkColor;

  if (colorFromProps) {
    return colorFromProps;
  }

  const colorKey = semanticColorMap[semantic];
  return Colors[mode][colorKey];
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  variant = "body",
  semantic = "default",
  ...otherProps
}: ThemedTextProps) {
  const { theme } = useTheme();
  const color = resolveColor(theme.mode, semantic, lightColor, darkColor);
  const typography = theme.typography[variant] as TextStyle;

  return <DefaultText style={[typography, { color }, style]} {...otherProps} />;
}
