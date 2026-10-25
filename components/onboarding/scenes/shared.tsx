import { type ReactNode, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { OnboardingPalette } from "@/types/onboarding";

import ParallaxLayer from "../ParallaxLayer";

type IconName = keyof typeof Ionicons.glyphMap;

export interface SceneProps {
  readonly size: number;
  readonly scrollX: SharedValue<number>;
  readonly index: number;
  readonly pageWidth: number;
  readonly palette: OnboardingPalette;
}

export type Depth = Pick<SceneProps, "scrollX" | "index" | "pageWidth">;

/** Scales fonts and spacing so scenes still fit on short phones. */
export function unitFor(size: number) {
  return Math.max(0.78, Math.min(1.05, size / 320));
}

// ---------------------------------------------------------------------------
// Cover artwork: drawn with plain views so no image files are needed
// ---------------------------------------------------------------------------

export type CoverVariant = "mountain" | "code" | "bowl";

function Triangle({
  w,
  h,
  color,
  opacity,
  style,
}: {
  w: number;
  h: number;
  color: string;
  opacity: number;
  style: object;
}) {
  return (
    <View
      style={[
        {
          position: "absolute",
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderBottomWidth: h,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function Cover({
  variant,
  width,
  height,
  palette,
}: {
  variant: CoverVariant;
  width: number;
  height: number;
  palette: OnboardingPalette;
}) {
  const base = { width, height, overflow: "hidden" as const };

  if (variant === "code") {
    return (
      <View style={[base, styles.center, { backgroundColor: palette.primary }]}>
        <Text
          style={{
            color: palette.onPrimary,
            fontSize: height * 0.26,
            fontWeight: "800",
            letterSpacing: -1,
          }}
        >
          {"</>"}
        </Text>
      </View>
    );
  }

  if (variant === "bowl") {
    return (
      <View style={[base, styles.center, { backgroundColor: palette.background }]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: palette.primary, opacity: 0.22 },
          ]}
        />
        <Ionicons name="restaurant" size={height * 0.3} color={palette.primary} />
      </View>
    );
  }

  // mountain
  return (
    <View style={[base, { backgroundColor: palette.background }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.primary, opacity: 0.16 },
        ]}
      />
      <View
        style={{
          position: "absolute",
          width: height * 0.2,
          height: height * 0.2,
          borderRadius: height * 0.1,
          right: width * 0.14,
          top: height * 0.16,
          backgroundColor: palette.primary,
          opacity: 0.85,
        }}
      />
      <Triangle
        w={width * 0.72}
        h={height * 0.6}
        color={palette.primary}
        opacity={0.5}
        style={{ left: -width * 0.1, bottom: 0 }}
      />
      <Triangle
        w={width * 0.62}
        h={height * 0.44}
        color={palette.primary}
        opacity={0.9}
        style={{ right: -width * 0.08, bottom: 0 }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// A story card that mirrors the real grid card (cover, caption plate, author)
// ---------------------------------------------------------------------------

export function StoryCard({
  width,
  variant,
  category,
  title,
  author,
  palette,
  u,
  elevated = false,
}: {
  width: number;
  variant: CoverVariant;
  category: string;
  title: string;
  author: string;
  palette: OnboardingPalette;
  u: number;
  elevated?: boolean;
}) {
  const height = (width * 4) / 3;

  return (
    <View
      style={[
        styles.storyCard,
        {
          width,
          height,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
        elevated && styles.elevated,
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Cover variant={variant} width={width} height={height} palette={palette} />
      </View>
      <View style={styles.plate}>
        <Text
          numberOfLines={1}
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 10 * u,
            fontWeight: "700",
            marginBottom: 2,
          }}
        >
          {category}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: "#fff",
            fontSize: 12.5 * u,
            fontWeight: "800",
            lineHeight: 16 * u,
          }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 10 * u,
            fontWeight: "600",
            marginTop: 3,
          }}
        >
          by {author}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Floating badges that sit closer to the viewer than the main card
// ---------------------------------------------------------------------------

interface FloatBoxProps extends Depth {
  readonly left: number;
  readonly top: number;
  readonly factor: number;
  /** Resting rotation in degrees. */
  readonly tilt?: number;
  readonly range?: number;
  readonly delay?: number;
  readonly children: ReactNode;
}

export function FloatBox({
  left,
  top,
  factor,
  tilt = 0,
  range = 6,
  delay = 0,
  children,
  ...depth
}: FloatBoxProps) {
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);

  // A slow bob keeps the screen alive without pulling attention.
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
      {...depth}
      factor={factor}
      rotateDeg={8}
      scaleFrom={0.75}
      style={{ position: "absolute", left, top }}
    >
      <Animated.View style={floatStyle}>
        <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>{children}</View>
      </Animated.View>
    </ParallaxLayer>
  );
}

export function FloatPill({
  icon,
  label,
  palette,
  u,
  ...box
}: Omit<FloatBoxProps, "children"> & {
  icon: IconName;
  label: string;
  palette: OnboardingPalette;
  u: number;
}) {
  return (
    <FloatBox {...box}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            paddingHorizontal: 10 * u,
            paddingVertical: 7 * u,
            gap: 6 * u,
          },
        ]}
      >
        <Ionicons name={icon} size={14 * u} color={palette.primary} />
        <Text
          style={{
            color: palette.foreground,
            fontSize: 12 * u,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </View>
    </FloatBox>
  );
}

export const sceneStyles = StyleSheet.create({
  card: {
    position: "absolute",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
});

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  storyCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  plate: {
    margin: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
});