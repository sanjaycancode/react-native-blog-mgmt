import type { OnboardingSlide } from "@/types/onboarding";

/**
 * Onboarding copy. Each slide's `visual` picks the mini app preview shown
 * above the text. Sample stories and names inside the previews live in
 * components/Onboarding/scenes.
 */
export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "read",
    tag: "Read",
    title: "Nepal, told by",
    accent: "Nepalis.",
    description:
      "Treks, tech, food and everyday life, written by people who live it. Save the ones you love and read them later.",
    visual: "stories",
  },
  {
    id: "write",
    tag: "Write",
    title: "Write now,",
    accent: "publish later.",
    description:
      "Drafts stay private until you tap publish, so nothing goes out half-finished. Add a cover, pick a topic, and you're live.",
    visual: "editor",
  },
  {
    id: "grow",
    tag: "Grow",
    title: "See what",
    accent: "readers love.",
    description:
      "Insights shows your views, likes and best posts. Add a bio and your links so readers can find you elsewhere.",
    visual: "insights",
  },
];