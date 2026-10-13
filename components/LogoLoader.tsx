import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import logoImg from "@/assets/images/logo.png";

type Props = {
  size?: number;
};

export default function LogoLoader({ size = 48 }: Props) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.82);

  useEffect(() => {
    const slowmo = Easing.bezier(0.77, 0, 0.175, 1);
    const settle = Easing.bezier(0.22, 1, 0.36, 1);

    rotation.value = withRepeat(
      withSequence(
        withTiming(34, { duration: 1250, easing: slowmo }),
        withTiming(394, { duration: 260, easing: Easing.in(Easing.cubic) }),
        withTiming(430, { duration: 1200, easing: settle }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1250, easing: slowmo }),
        withTiming(1.05, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1200, easing: settle }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1250, easing: slowmo }),
        withTiming(0.76, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(0.82, { duration: 1200, easing: settle }),
      ),
      -1,
      false,
    );

    return () => {
      rotation.value = 0;
      scale.value = 1;
      opacity.value = 0.82;
    };
  }, [opacity, rotation, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  const motionBlurStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.12,
    transform: [{ rotate: `${rotation.value - 10}deg` }, { scale: scale.value * 1.04 }],
  }));
  const motionBlurFarStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.06,
    transform: [{ rotate: `${rotation.value - 20}deg` }, { scale: scale.value * 1.08 }],
  }));

  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.container, { width: size, height: size }]}
    >
      <Animated.Image
        source={logoImg}
        resizeMode="contain"
        style={[styles.logo, { width: size, height: size }, motionBlurFarStyle]}
      />
      <Animated.Image
        source={logoImg}
        resizeMode="contain"
        style={[styles.logo, { width: size, height: size }, motionBlurStyle]}
      />
      <Animated.Image
        source={logoImg}
        resizeMode="contain"
        style={[styles.logo, { width: size, height: size }, logoStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logo: {
    position: "absolute",
    alignSelf: "center",
  },
});
