import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

export interface ParallaxLayerProps {
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

/** Offsets a child horizontally (and optionally scales, rotates, fades it) from the scroll position. */
export default function ParallaxLayer({
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
