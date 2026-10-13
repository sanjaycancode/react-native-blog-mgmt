import { useMemo } from "react";

import { useTheme } from "@/constants/theme";

import { type Status,STATUS_COLORS } from "./theme";

/** "#rrggbb" or "#rgb" + alpha (0 to 1). Other formats are returned unchanged. */
function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${a}`;
}

/**
 * Theme-aware replacement for the old static `C` palette.
 *
 * The key names are kept (bg, text, sub, mute, line, hot, red100 to red900)
 * so chart components can switch with a one-line change:
 *   const C = useAnalyticsColors();
 * The "red" keys are now all derived from your theme's primary color, so
 * they follow whatever accent and light/dark mode the user picked.
 */
export function useAnalyticsColors() {
  const { colors, isDark } = useTheme();

  return useMemo(
    () => {
      const statusColors: Record<Status, string> = {
        featured: STATUS_COLORS.featured,
        published: STATUS_COLORS.published,
        submitted: STATUS_COLORS.submitted,
        draft: STATUS_COLORS.draft,
        unpublished: STATUS_COLORS.unpublished,
        rejected: STATUS_COLORS.rejected,
      };

      return {
        isDark,
        bg: colors.background,
        text: colors.foreground,
        sub: colors.mutedForeground,
        mute: withAlpha(colors.mutedForeground, 0.7),
        line: colors.border,
        fill: colors.secondary,
        card: colors.card,
        hot: colors.primary,
        onPrimary: colors.primaryForeground,
        red100: colors.primaryForeground,
        red200: colors.primary,
        red300: withAlpha(colors.primary, 0.8),
        red400: colors.primary,
        red500: colors.primary,
        red600: colors.primary,
        red700: colors.primary,
        red800: withAlpha(colors.primary, 0.5),
        red900: colors.primary,
        statusColors,
      };
    },
    [colors, isDark],
  );
}

export type AnalyticsPalette = ReturnType<typeof useAnalyticsColors>;
