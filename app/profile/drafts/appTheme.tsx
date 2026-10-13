import type { ThemeColors } from "@/constants/theme/colors";

// Main-app tokens (cream background, #e63946 primary), shared by the profile-related screens.
// If your RN project already has a theme file, replace this object with an import from it.
export type DraftTheme = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  sub: string;
  mute: string;
  primary: string;
  primaryDark: string;
  primaryTint: string;
  errorBg: string;
  errorBorder: string;
};

export function getDraftTheme(colors: ThemeColors): DraftTheme {
  return {
    bg: colors.background,
    surface: colors.card,
    border: colors.border,
    text: colors.foreground,
    sub: colors.mutedForeground,
    mute: colors.mutedForeground,
    primary: colors.primary,
    primaryDark: colors.primaryHover,
    primaryTint: colors.badgePrimaryBg,
    errorBg: colors.badgePrimaryBg,
    errorBorder: colors.border,
  };
}
