import { memo, type ReactNode, useEffect } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type {
  IconName,
  OnboardingPalette,
  OnboardingSlide,
} from "@/types/onboarding";

// ---------------------------------------------------------------------------
// Parallax building block
// ---------------------------------------------------------------------------

interface ParallaxLayerProps {
  readonly scrollX: SharedValue<number>;
  readonly index: number;
  readonly pageWidth: number;
  /**
   * Depth. Positive lags behind the page (feels far away), negative leads it
   * (feels close). 0 moves with the page.
   */
  readonly factor: number;
  readonly rotateDeg?: number;
  readonly scaleFrom?: number;
  /** Fade out as the slide leaves the screen. */
  readonly fade?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/** Offsets a child horizontally (and optionally scales/rotates/fades it) from the scroll position. */
function ParallaxLayer({
  scrollX,
  index,
  pageWidth,
  factor,
  rotateDeg = 0,
  scaleFrom = 1,
  fade = false,
  style,
  children,
}: ParallaxLayerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth,
    ];
    const shift = factor * pageWidth;

    return {
      opacity: fade
        ? interpolate(
            scrollX.value,
            [
              (index - 0.75) * pageWidth,
              index * pageWidth,
              (index + 0.75) * pageWidth,
            ],
            [0, 1, 0],
            Extrapolation.CLAMP,
          )
        : 1,
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [-shift, 0, shift],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            scrollX.value,
            input,
            [scaleFrom, 1, scaleFrom],
            Extrapolation.CLAMP,
          ),
        },
        {
          rotate: `${interpolate(
            scrollX.value,
            input,
            [-rotateDeg, 0, rotateDeg],
            Extrapolation.CLAMP,
          )}deg`,
        },
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Illustration: rings, a core tile and three floating chips, all at different depths
// ---------------------------------------------------------------------------

const CHIP_SIZE = 48;

/** Chip positions are fractions of the illustration size, measured from its center. */
const CHIP_SLOTS = [
  { x: -0.4, y: -0.3, factor: -0.3, range: 7, delay: 0, tilt: 8 },
  { x: 0.42, y: -0.08, factor: -0.45, range: 9, delay: 500, tilt: -8 },
  { x: -0.1, y: 0.42, factor: -0.22, range: 6, delay: 900, tilt: 6 },
] as const;

interface DepthProps {
  readonly scrollX: SharedValue<number>;
  readonly index: number;
  readonly pageWidth: number;
  readonly palette: OnboardingPalette;
}

interface FloatingChipProps extends DepthProps {
  readonly icon: IconName;
  readonly slot: (typeof CHIP_SLOTS)[number];
  readonly size: number;
}

function FloatingChip({
  icon,
  slot,
  size,
  scrollX,
  index,
  pageWidth,
  palette,
}: FloatingChipProps) {
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);
  const { range, delay } = slot;

  // A slow ambient bob keeps the screen alive without drawing attention.
  useEffect(() => {
    if (reduceMotion) return;
    float.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [delay, float, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * range * 2 }],
  }));

  return (
    <ParallaxLayer
      scrollX={scrollX}
      index={index}
      pageWidth={pageWidth}
      factor={slot.factor}
      rotateDeg={slot.tilt}
      scaleFrom={0.7}
      style={{
        position: "absolute",
        left: size / 2 + slot.x * size - CHIP_SIZE / 2,
        top: size / 2 + slot.y * size - CHIP_SIZE / 2,
      }}
    >
      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: palette.surface, borderColor: palette.border },
          floatStyle,
        ]}
      >
        <Ionicons name={icon} size={22} color={palette.primary} />
      </Animated.View>
    </ParallaxLayer>
  );
}

interface IllustrationProps extends DepthProps {
  readonly slide: OnboardingSlide;
  readonly size: number;
}

function Illustration({ slide, size, ...depth }: IllustrationProps) {
  const { palette } = depth;
  const outer = size;
  const inner = size * 0.68;
  const core = size * 0.38;

  return (
    <View style={{ width: size, height: size }}>
      <ParallaxLayer
        {...depth}
        factor={0.35}
        scaleFrom={0.85}
        style={[
          styles.centered,
          {
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            borderColor: palette.primary,
          },
          styles.ring,
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: outer / 2,
              backgroundColor: palette.primary,
              opacity: 0.05,
            },
          ]}
        />
      </ParallaxLayer>

      <ParallaxLayer
        {...depth}
        factor={0.2}
        scaleFrom={0.88}
        style={{
          position: "absolute",
          left: (size - inner) / 2,
          top: (size - inner) / 2,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: palette.primary,
          opacity: 1,
        }}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: inner / 2,
              backgroundColor: palette.background,
              opacity: 0.88,
            },
          ]}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: inner / 2,
              backgroundColor: palette.primary,
              opacity: 0.14,
            },
          ]}
        />
      </ParallaxLayer>

      <ParallaxLayer
        {...depth}
        factor={0.06}
        rotateDeg={10}
        scaleFrom={0.8}
        style={{
          position: "absolute",
          left: (size - core) / 2,
          top: (size - core) / 2,
          width: core,
          height: core,
        }}
      >
        {slide.image ? (
          <Image
            source={slide.image}
            resizeMode="contain"
            style={{ width: core, height: core }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[
              styles.core,
              {
                width: core,
                height: core,
                borderRadius: core * 0.3,
                backgroundColor: palette.primary,
                shadowColor: palette.primary,
              },
            ]}
          >
            <Ionicons
              name={slide.icon}
              size={core * 0.48}
              color={palette.onPrimary}
            />
          </View>
        )}
      </ParallaxLayer>

      {slide.floatingIcons.map((icon, i) => (
        <FloatingChip
          key={`${icon}-${i}`}
          icon={icon}
          slot={CHIP_SLOTS[i]}
          size={size}
          {...depth}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// The slide itself
// ---------------------------------------------------------------------------

export interface OnboardingItemProps {
  readonly slide: OnboardingSlide;
  readonly index: number;
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
  readonly pageHeight: number;
  /** Space reserved for the skip button. */
  readonly insetTop: number;
  /** Space reserved for the pagination and action button. */
  readonly insetBottom: number;
  readonly palette: OnboardingPalette;
}

function OnboardingItem({
  slide,
  index,
  scrollX,
  pageWidth,
  pageHeight,
  insetTop,
  insetBottom,
  palette,
}: OnboardingItemProps) {
  const depth = { scrollX, index, pageWidth };
  // Shrinks on short phones so the text never gets squeezed.
  const artSize = Math.min(
    pageWidth - 64,
    320,
    Math.max(180, pageHeight - insetTop - insetBottom - 240),
  );

  return (
    <View
      style={{ width: pageWidth, height: pageHeight }}
      accessible
      accessibilityLabel={`${slide.title} ${slide.accent}. ${slide.description}`}
    >
      <View style={[styles.art, { paddingTop: insetTop }]}>
        <Illustration
          slide={slide}
          size={artSize}
          palette={palette}
          {...depth}
        />
      </View>

      <View style={[styles.text, { paddingBottom: insetBottom + 28 }]}>
        <ParallaxLayer {...depth} factor={-0.1} fade style={styles.pillWrap}>
          <View style={styles.pill}>
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: palette.primary, opacity: 0.12 },
              ]}
            />
            <Text style={[styles.pillText, { color: palette.primary }]}>
              {slide.tag}
            </Text>
          </View>
        </ParallaxLayer>

        <ParallaxLayer {...depth} factor={-0.16} fade style={{ marginTop: 16 }}>
          <Text style={[styles.title, { color: palette.foreground }]}>
            {slide.title}
            {"\n"}
            <Text style={{ color: palette.primary }}>{slide.accent}</Text>
          </Text>
        </ParallaxLayer>

        <ParallaxLayer {...depth} factor={-0.24} fade style={{ marginTop: 12 }}>
          <Text style={[styles.body, { color: palette.muted }]}>
            {slide.description}
          </Text>
        </ParallaxLayer>
      </View>
    </View>
  );
}

export default memo(OnboardingItem);

const styles = StyleSheet.create({
  art: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  ring: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 10,
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  text: {
    paddingHorizontal: 28,
  },
  pillWrap: {
    alignSelf: "flex-start",
  },
  pill: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 360,
  },
});
