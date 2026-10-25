import { StyleSheet, Text } from "react-native";

import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import PressableScale from "./PressableScale";

interface SkipButtonProps {
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
  readonly count: number;
  readonly color: string;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly label?: string;
}

/** Top-right "Skip". Fades out as the last slide arrives, since it has no job there. */
export default function SkipButton({
  scrollX,
  pageWidth,
  count,
  color,
  disabled = false,
  onPress,
  label = "Skip",
}: SkipButtonProps) {
  const fadeStyle = useAnimatedStyle(() => {
    if (count < 2) return { opacity: 0 };
    return {
      opacity: interpolate(
        scrollX.value,
        [(count - 2) * pageWidth, (count - 1) * pageWidth],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View style={fadeStyle}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel="Skip onboarding"
        pressedScale={0.92}
        hitSlop={12}
        style={styles.button}
      >
        <Text style={[styles.label, { color }]}>{label}</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});