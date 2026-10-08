// Design tokens. Everything is a shade of red on warm ink.
export const C = {
  bg: "#100B0C",
  surface: "#181112",
  line: "#2A1E20",
  text: "#F6EEEC",
  sub: "#A8999A",
  mute: "#6B5B5D",

  red100: "#FEE2E2",
  red200: "#FECACA",
  red300: "#FCA5A5",
  red400: "#F87171",
  red500: "#EF4444",
  red600: "#DC2626",
  red700: "#B91C1C",
  red800: "#991B1B",
  red900: "#7F1D1D",
  hot: "#FF3B3B",
} as const;

export type Status =
  | "featured"
  | "published"
  | "submitted"
  | "draft"
  | "unpublished"
  | "rejected";

export const STATUS_COLORS: Record<Status, string> = {
  featured: "#FF3B3B",
  published: "#DC2626",
  submitted: "#F87171",
  draft: "#FCA5A5",
  unpublished: "#8B3A3A",
  rejected: "#991B1B",
};

export const STATUS_LABELS: Record<Status, string> = {
  featured: "Featured",
  published: "Published",
  submitted: "Submitted",
  draft: "Draft",
  unpublished: "Unpublished",
  rejected: "Rejected",
};
