import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { BackHandler, useWindowDimensions } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import type Animated from "react-native-reanimated";

import type {
  OnboardingStatus,
  UseOnboardingOptions,
  UseOnboardingResult,
} from "@/types/onboarding";

// ---------------------------------------------------------------------------
// Persistence: a tiny shared store, so the root layout (which decides whether
// to show onboarding) and the onboarding screen always agree.
// ---------------------------------------------------------------------------

export const ONBOARDING_STORAGE_KEY = "@app/hasSeenOnboarding";

let currentStatus: OnboardingStatus = "loading";
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setStatus(next: OnboardingStatus) {
  if (currentStatus === next) return;
  currentStatus = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reads the saved flag once. A storage error counts as "not seen yet". */
function loadStatus(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setStatus(value === "true" ? "seen" : "unseen"))
      .catch(() => setStatus("unseen"));
  }
  return loadPromise;
}

/** Saves the flag. The in-memory state flips first so the UI never waits on disk. */
export async function markOnboardingSeen(): Promise<void> {
  setStatus("seen");
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}

/** Clears the flag, e.g. for a "Replay intro" row in settings. */
export async function resetOnboarding(): Promise<void> {
  setStatus("unseen");
  await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

/** For the root layout: has the stored flag been read, and what did it say? */
export function useOnboardingStatus() {
  const status = useSyncExternalStore(
    subscribe,
    () => currentStatus,
    () => "loading" as const,
  );

  useEffect(() => {
    void loadStatus();
  }, []);

  return {
    status,
    isReady: status !== "loading",
    hasSeenOnboarding: status === "seen",
  };
}

// ---------------------------------------------------------------------------
// The screen's state and actions
// ---------------------------------------------------------------------------

export function useOnboarding({
  slides,
  onFinish,
}: UseOnboardingOptions): UseOnboardingResult {
  const { width: pageWidth } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const finishingRef = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const lastIndex = slides.length - 1;
  const isLastSlide = currentIndex >= lastIndex;

  // Scroll position stays on the UI thread; animations read it directly.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Updates React state the moment a swipe passes the halfway point, so the
  // button label and a11y state change as the page does, not after it settles.
  useAnimatedReaction(
    () => Math.round(scrollX.value / pageWidth),
    (index, previous) => {
      if (index !== previous) {
        runOnJS(setCurrentIndex)(Math.min(Math.max(index, 0), lastIndex));
      }
    },
    [pageWidth, lastIndex],
  );

  // Programmatic scrolling runs on the UI thread, so it never drops a frame.
  const goToIndex = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(index, 0), lastIndex) * pageWidth;
      runOnUI(() => {
        "worklet";
        scrollTo(scrollRef, target, 0, true);
      })();
    },
    [lastIndex, pageWidth, scrollRef],
  );

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinishing(true);
    try {
      await markOnboardingSeen();
    } catch (error) {
      // Never trap the user here because the disk write failed.
      console.warn("Could not save onboarding state:", error);
    }
    onFinish();
  }, [onFinish]);

  const next = useCallback(() => {
    if (isLastSlide) void finish();
    else goToIndex(currentIndex + 1);
  }, [currentIndex, finish, goToIndex, isLastSlide]);

  const skip = useCallback(() => {
    void finish();
  }, [finish]);

  // Android back steps to the previous slide instead of leaving the screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentIndex > 0) {
          goToIndex(currentIndex - 1);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [currentIndex, goToIndex]);

  return {
    scrollRef,
    scrollX,
    scrollHandler,
    pageWidth,
    currentIndex,
    isLastSlide,
    isFinishing,
    goToIndex,
    next,
    skip,
  };
}
