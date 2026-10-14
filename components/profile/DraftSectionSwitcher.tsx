import { useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/constants/theme";

export type DraftSection = "drafts" | "submitted" | "rejected";

type Props = {
  value: DraftSection;
  onChange: (value: DraftSection) => void;
};

export default function DraftSectionSwitcher({ value, onChange }: Props) {
  const { colors, typography, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const sectionWidth = width / 3;
  const indicatorX = useSharedValue(
    (["drafts", "submitted", "rejected"] as const).indexOf(value),
  );
  indicatorX.value = withSpring(
    (["drafts", "submitted", "rejected"] as const).indexOf(value),
    {
    damping: 18,
    stiffness: 240,
    },
  );
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * sectionWidth }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          marginTop: spacing.xs,
          marginBottom: spacing.xs,
        },
      ]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {(["drafts", "submitted", "rejected"] as const).map((section) => {
        const active = value === section;
        const label =
          section.charAt(0).toUpperCase() + section.slice(1);

        return (
          <TouchableOpacity
            activeOpacity={0.78}
            key={section}
            onPress={() => onChange(section)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            style={styles.button}
          >
            <Text
              style={{
                color: active ? colors.foreground : colors.mutedForeground,
                fontSize: typography.sizes.sm,
                fontWeight: active
                  ? typography.weights.bold
                  : typography.weights.medium,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            backgroundColor: colors.foreground,
            left: Math.max(0, (sectionWidth - 28) / 2),
            opacity: width > 0 ? 1 : 0,
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    flexDirection: "row",
    justifyContent:"space-around",
    width: "100%",
    height: 30,
    position: "relative",
  },
  button: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 108,
    width: 28,
    height: 2.5,
    borderRadius: 2,
  },
});
