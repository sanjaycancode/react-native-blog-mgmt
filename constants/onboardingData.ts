import type { OnboardingSlide } from "@/types/onboarding";

/** Sample slides. Edit the copy and icons, or add `image` for custom artwork. */
export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "discover",
    tag: "Discover",
    title: "Stories worth",
    accent: "your time.",
    description:
      "Read thoughtful writing from Nepali creators, thinkers and builders, all in one place.",
    icon: "book-outline",
    floatingIcons: ["bookmark-outline", "heart-outline", "search-outline"],
  },
  {
    id: "create",
    tag: "Create",
    title: "Write in",
    accent: "your own voice.",
    description:
      "A clean editor, drafts that stay private, and one tap to publish when you're ready.",
    icon: "create-outline",
    floatingIcons: ["image-outline", "text-outline", "sparkles-outline"],
  },
  {
    id: "grow",
    tag: "Grow",
    title: "Find your",
    accent: "audience.",
    description:
      "See what resonates with built-in insights, and build a profile readers want to follow.",
    icon: "people-outline",
    floatingIcons: [
      "stats-chart-outline",
      "chatbubble-ellipses-outline",
      "trending-up-outline",
    ],
  },
];