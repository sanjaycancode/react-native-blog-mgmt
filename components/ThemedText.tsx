import { Text as NativeText, TextProps, TextStyle } from "react-native";

import { useTheme } from "@/constants/theme";

const variantSizes = {
  heading1: "4xl",
  heading2: "3xl",
  heading3: "2xl",
  heading4: "xl",
  heading5: "lg",
  heading6: "base",
  body: "base",
  bodySmall: "sm",
  caption: "xs",
  xs: "xs",
  mono: "base",
} as const;

const semanticColors = {
  default: "foreground",
  muted: "mutedForeground",
  primary: "primary",
  success: "primary",
  warning: "accent",
  error: "primary",
  info: "primary",
  disabled: "mutedForeground",
} as const;

export type ThemedTextSemantic = keyof typeof semanticColors;
export type ThemedTextVariant = keyof typeof variantSizes;

type ThemedTextProps = TextProps & {
  variant?: ThemedTextVariant;
  semantic?: ThemedTextSemantic;
  lightColor?: string;
  darkColor?: string;
};

function getFontWeight(
  theme: ReturnType<typeof useTheme>,
  variant: ThemedTextVariant,
) {
  const { weights } = theme.typography;
  if (variant === "heading1" || variant === "heading2") return weights.heavy;
  if (variant.startsWith("heading")) return weights.bold;
  return weights.regular;
}

export function ThemedText({
  style,
  variant = "body",
  semantic = "default",
  lightColor,
  darkColor,
  ...textProps
}: ThemedTextProps) {
  const theme = useTheme();
  const colorOverride = theme.isDark ? darkColor : lightColor;
  const fontSize = theme.typography.sizes[variantSizes[variant]];
  const lineHeight = Math.round(
    fontSize *
      (variant.startsWith("heading")
        ? theme.typography.lineHeights.tight
        : theme.typography.lineHeights.normal),
  );
  const fontFamily = variant === "mono" ? "monospace" : undefined;
  const textStyle: TextStyle = {
    color: colorOverride ?? theme.colors[semanticColors[semantic]],
    fontSize,
    fontWeight: getFontWeight(theme, variant),
    lineHeight,
    fontFamily,
  };

  return <NativeText style={[textStyle, style]} {...textProps} />;
}

export default ThemedText;
