import { type ComponentType, memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import type { SharedValue } from "react-native-reanimated";

import type {
  OnboardingPalette,
  OnboardingSlide,
  OnboardingVisual,
} from "@/types/onboarding";

import ParallaxLayer from "./ParallaxLayer";
import EditorScene from "./scenes/EditorScene";
import InsightsScene from "./scenes/InsightsScene";
import StoriesScene from "./scenes/StoriesScene";
import type { SceneProps } from "./scenes/shared";

/** Each slide's `visual` picks one of these mini app screens. */
const SCENES: Record<OnboardingVisual, ComponentType<SceneProps>> = {
  stories: StoriesScene,
  editor: EditorScene,
  insights: InsightsScene,
};

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
  const Scene = SCENES[slide.visual];
  // Shrinks on short phones so the text never gets squeezed.
  const artSize = Math.min(
    pageWidth - 48,
    340,
    Math.max(200, pageHeight - insetTop - insetBottom - 250),
  );

  return (
    <View
      style={{ width: pageWidth, height: pageHeight }}
      accessible
      accessibilityLabel={`${slide.title} ${slide.accent}. ${slide.description}`}
    >
      <View style={[styles.art, { paddingTop: insetTop }]}>
        {slide.image ? (
          <ParallaxLayer {...depth} factor={0.1} scaleFrom={0.9}>
            <Image
              source={slide.image}
              resizeMode="contain"
              style={{ width: artSize, height: artSize }}
              accessibilityIgnoresInvertColors
            />
          </ParallaxLayer>
        ) : (
          <Scene size={artSize} palette={palette} {...depth} />
        )}
      </View>

      <View style={[styles.text, { paddingBottom: insetBottom + 28 }]}>
        {/* Editorial step marker: "01 ── Read" */}
        <ParallaxLayer {...depth} factor={-0.1} fade>
          <View style={styles.marker}>
            <Text style={[styles.markerNumber, { color: palette.primary }]}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <View
              style={[styles.markerLine, { backgroundColor: palette.primary }]}
            />
            <Text style={[styles.markerTag, { color: palette.muted }]}>
              {slide.tag}
            </Text>
          </View>
        </ParallaxLayer>

        <ParallaxLayer {...depth} factor={-0.16} fade style={{ marginTop: 14 }}>
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
  text: {
    paddingHorizontal: 28,
  },
  marker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markerNumber: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  markerLine: {
    width: 24,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.5,
  },
  markerTag: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 360,
  },
});
