import { useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ONBOARDING_SLIDES } from "@/constants/onboardingData";

import { useTheme } from "@/constants/theme";

import { useOnboarding } from "@/hooks/useOnboarding";

import type { OnboardingPalette, OnboardingSlide } from "@/types/onboarding";

import ActionButton from "./ActionButton";
import OnboardingItem from "./OnboardingItem";
import Pagination from "./Pagination";
import SkipButton from "./SkipButton";

export interface OnboardingScreenProps {
  /** Defaults to the sample slides. */
  readonly slides?: readonly OnboardingSlide[];
  /** Called after the completed flag is saved. Navigate away here. */
  readonly onFinish: () => void;
  /** Override any color; everything else follows the app theme. */
  readonly palette?: Partial<OnboardingPalette>;
}

/** Two soft blobs that drift slower than the slides, adding depth behind everything. */
function BackdropGlow({
  scrollX,
  color,
}: {
  scrollX: SharedValue<number>;
  color: string;
}) {
  const farStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -scrollX.value * 0.25 }],
  }));
  const nearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -scrollX.value * 0.4 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.glow,
          styles.glowTop,
          { backgroundColor: color },
          farStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.glow,
          styles.glowBottom,
          { backgroundColor: color },
          nearStyle,
        ]}
      />
    </View>
  );
}

export default function OnboardingScreen({
  slides = ONBOARDING_SLIDES,
  onFinish,
  palette: paletteOverride,
}: OnboardingScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: pageHeight } = useWindowDimensions();
  const [controlsHeight, setControlsHeight] = useState(180);

  // The one place the app theme is read. Everything below is theme-agnostic.
  const palette = useMemo<OnboardingPalette>(
    () => ({
      background: colors.background,
      foreground: colors.foreground,
      muted: colors.mutedForeground,
      primary: colors.primary,
      onPrimary: colors.primaryForeground,
      surface: colors.card,
      border: colors.border,
      ...paletteOverride,
    }),
    [colors, paletteOverride],
  );

  const {
    scrollRef,
    scrollX,
    scrollHandler,
    pageWidth,
    isLastSlide,
    isFinishing,
    goToIndex,
    next,
    skip,
  } = useOnboarding({ slides, onFinish });

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <BackdropGlow scrollX={scrollX} color={palette.primary} />

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
      >
        {slides.map((slide, index) => (
          <OnboardingItem
            key={slide.id}
            slide={slide}
            index={index}
            scrollX={scrollX}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            insetTop={insets.top + 56}
            insetBottom={controlsHeight}
            palette={palette}
          />
        ))}
      </Animated.ScrollView>

      <View style={[styles.skip, { top: insets.top + 8 }]}>
        <SkipButton
          scrollX={scrollX}
          pageWidth={pageWidth}
          count={slides.length}
          color={palette.muted}
          disabled={isLastSlide || isFinishing}
          onPress={skip}
        />
      </View>

      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
        onLayout={(event) => setControlsHeight(event.nativeEvent.layout.height)}
      >
        <Pagination
          count={slides.length}
          scrollX={scrollX}
          pageWidth={pageWidth}
          activeColor={palette.primary}
          inactiveColor={palette.border}
          onDotPress={goToIndex}
        />
        <ActionButton
          scrollX={scrollX}
          pageWidth={pageWidth}
          count={slides.length}
          isLast={isLastSlide}
          disabled={isFinishing}
          palette={palette}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.1,
  },
  glowTop: {
    width: 420,
    height: 420,
    top: -160,
    right: -140,
  },
  glowBottom: {
    width: 320,
    height: 320,
    bottom: -120,
    left: -120,
    opacity: 0.07,
  },
  skip: {
    position: "absolute",
    right: 12,
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    gap: 28,
  },
});
