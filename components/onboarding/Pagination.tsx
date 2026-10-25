import { Pressable, StyleSheet, View } from "react-native";

import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

interface PaginationProps {
  readonly count: number;
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
  readonly activeColor: string;
  readonly inactiveColor: string;
  /** Tapping a dot jumps to that slide. */
  readonly onDotPress?: (index: number) => void;
  readonly dotSize?: number;
  readonly activeDotWidth?: number;
}

interface DotProps extends Omit<PaginationProps, "count"> {
  readonly index: number;
  readonly dotSize: number;
  readonly activeDotWidth: number;
}

function Dot({
  index,
  scrollX,
  pageWidth,
  activeColor,
  inactiveColor,
  onDotPress,
  dotSize,
  activeDotWidth,
}: DotProps) {
  // Width and color are both functions of the scroll offset, so the active dot
  // stretches out and the next one grows in while your finger is still moving.
  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth,
    ];
    return {
      width: interpolate(
        scrollX.value,
        input,
        [dotSize, activeDotWidth, dotSize],
        Extrapolation.CLAMP,
      ),
      backgroundColor: interpolateColor(scrollX.value, input, [
        inactiveColor,
        activeColor,
        inactiveColor,
      ]),
    };
  });

  return (
    <Pressable
      onPress={() => onDotPress?.(index)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Go to slide ${index + 1}`}
      disabled={!onDotPress}
    >
      <Animated.View
        style={[{ height: dotSize, borderRadius: dotSize / 2 }, animatedStyle]}
      />
    </Pressable>
  );
}

export default function Pagination({
  count,
  dotSize = 8,
  activeDotWidth = 28,
  ...rest
}: PaginationProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, index) => (
        <Dot
          key={index}
          index={index}
          dotSize={dotSize}
          activeDotWidth={activeDotWidth}
          {...rest}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
