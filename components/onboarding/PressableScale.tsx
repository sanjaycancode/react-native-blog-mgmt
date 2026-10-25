import { type ReactNode, useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;

interface PressableScaleProps {
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly pressedScale?: number;
  readonly hitSlop?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/**
 * Button whose press feedback runs entirely on the UI thread through a
 * gesture-handler Tap, so it responds instantly even if JS is busy.
 */
export default function PressableScale({
  onPress,
  accessibilityLabel,
  disabled = false,
  pressedScale = 0.96,
  hitSlop = 0,
  style,
  children,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabled)
        .maxDuration(10_000) // a slow press is still a press
        .hitSlop(hitSlop)
        .onBegin(() => {
          scale.value = withSpring(pressedScale, SPRING);
        })
        .onFinalize(() => {
          scale.value = withSpring(1, SPRING);
        })
        .onEnd((_event, success) => {
          if (success) runOnJS(onPress)();
        }),
    [disabled, hitSlop, onPress, pressedScale, scale],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        onAccessibilityTap={onPress}
        style={[style, animatedStyle]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
