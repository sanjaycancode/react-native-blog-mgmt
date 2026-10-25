import type { ImageSourcePropType } from "react-native";
import type Animated from "react-native-reanimated";
import type {
  AnimatedRef,
  SharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

/** Which mini app screen a slide shows. Scenes live in components/Onboarding/scenes. */
export type OnboardingVisual = "stories" | "editor" | "insights";

/** One page of the carousel. Pure data, no UI concerns. */
export interface OnboardingSlide {
  readonly id: string;
  /** Small pill above the headline, e.g. "Discover". */
  readonly tag: string;
  /** First part of the headline, in the foreground color. */
  readonly title: string;
  /** Second part of the headline, highlighted with the primary color. */
  readonly accent: string;
  readonly description: string;
  /** The in-app preview drawn above the text. */
  readonly visual: OnboardingVisual;
  /** Optional artwork, e.g. a real screenshot. When set it replaces the scene. */
  readonly image?: ImageSourcePropType;
}

/**
 * Colors the onboarding components need. Components never read the app theme
 * directly: the screen builds this from `useTheme()`, so any theme (or a
 * one-off override) can be passed in.
 */
export interface OnboardingPalette {
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly primary: string;
  /** Text and icons drawn on top of `primary`. */
  readonly onPrimary: string;
  readonly surface: string;
  readonly border: string;
}

/** Where we are in reading the persisted "has seen onboarding" flag. */
export type OnboardingStatus = "loading" | "seen" | "unseen";

export interface UseOnboardingOptions {
  readonly slides: readonly OnboardingSlide[];
  /** Called after the completed flag is saved. Do your navigation here. */
  readonly onFinish: () => void;
}

export interface UseOnboardingResult {
  readonly scrollRef: AnimatedRef<Animated.ScrollView>;
  /** Horizontal scroll offset, driven on the UI thread. Feed it to animations. */
  readonly scrollX: SharedValue<number>;
  readonly scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  readonly pageWidth: number;
  readonly currentIndex: number;
  readonly isLastSlide: boolean;
  readonly isFinishing: boolean;
  readonly goToIndex: (index: number) => void;
  /** Advances one slide, or finishes when already on the last one. */
  readonly next: () => void;
  /** Marks onboarding as done right away. */
  readonly skip: () => void;
}
