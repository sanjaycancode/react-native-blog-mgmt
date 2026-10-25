import { StyleSheet, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

import type { OnboardingPalette } from "@/types/onboarding";

import PressableScale from "./PressableScale";

interface ActionButtonProps {
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
  readonly count: number;
  readonly isLast: boolean;
  readonly disabled?: boolean;
  readonly palette: OnboardingPalette;
  readonly onPress: () => void;
  readonly nextLabel?: string;
  readonly finishLabel?: string;
}

/**
 * Primary button. Its label crossfades from "Next" to "Get started" while the
 * final swipe is in progress, instead of snapping after it ends.
 */
export default function ActionButton({
  scrollX,
  pageWidth,
  count,
  isLast,
  disabled = false,
  palette,
  onPress,
  nextLabel = "Next",
  finishLabel = "Get started",
}: ActionButtonProps) {
  // 0 on every slide before the last, easing to 1 as the last one arrives.
  const progress = useDerivedValue(() => {
    if (count < 2) return 1;
    return interpolate(
      scrollX.value,
      [(count - 2) * pageWidth, (count - 1) * pageWidth],
      [0, 1],
      Extrapolation.CLAMP,
    );
  });

  const nextStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -12 * progress.value }],
  }));

  const finishStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 12 * (1 - progress.value) }],
  }));

  const textStyle = [styles.label, { color: palette.onPrimary }];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={isLast ? finishLabel : nextLabel}
      pressedScale={0.97}
      style={[
        styles.button,
        { backgroundColor: palette.primary, shadowColor: palette.primary },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.layer, nextStyle]}>
        <Text style={textStyle}>{nextLabel}</Text>
        <Ionicons name="arrow-forward" size={20} color={palette.onPrimary} />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.layer, finishStyle]}
      >
        <Text style={textStyle}>{finishLabel}</Text>
        <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: 29,
    alignSelf: "stretch",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  layer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
