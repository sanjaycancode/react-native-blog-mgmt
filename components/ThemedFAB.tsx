import React from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/context/ThemeContext";

interface ThemedFABProps {
  label: string;
  onPress: () => void;
  isScrolled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  shimmerTranslateX?: Animated.AnimatedInterpolation<number>;
  initialExpanded?: boolean;
}

const ANIMATION_DURATION = 180;
const COMPACT_SIZE = 50;

export function ThemedFAB({
  label,
  onPress,
  isScrolled = false,
  iconName = "add",
  style,
  shimmerTranslateX,
  initialExpanded = true,
}: ThemedFABProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [labelWidth, setLabelWidth] = React.useState(0);
  const [hasAnimated, setHasAnimated] = React.useState(false);

  const horizontalPadding = theme.spacing.md;
  const labelGap = theme.spacing.sm;
  const minExpandedWidth = theme.spacing.xl * 4;
  const iconSize = theme.typography.heading5.fontSize;

  const expandedWidth = React.useMemo(
    () =>
      Math.max(
        minExpandedWidth,
        horizontalPadding * 2 + iconSize + labelGap + labelWidth,
      ),
    [horizontalPadding, iconSize, labelGap, labelWidth, minExpandedWidth],
  );

  const progress = React.useRef(new Animated.Value(initialExpanded ? 0 : isScrolled ? 1 : 0)).current;

  React.useEffect(() => {
    if (!hasAnimated && labelWidth > 0) {
      setHasAnimated(true);
      Animated.timing(progress, {
        toValue: isScrolled ? 1 : 0,
        duration: ANIMATION_DURATION * 2,
        useNativeDriver: false,
      }).start();
    }
  }, [labelWidth, isScrolled, hasAnimated, progress]);

  React.useEffect(() => {
    if (hasAnimated) {
      Animated.timing(progress, {
        toValue: isScrolled ? 1 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();
    }
  }, [isScrolled, progress, hasAnimated]);

  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [expandedWidth, COMPACT_SIZE],
  });

  const animatedBorderRadius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.borderRadius.xl, COMPACT_SIZE / 2],
  });

  const labelOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const labelSpacing = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [labelGap, 0],
  });

  const animatedLabelWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [labelWidth, 0],
  });

  const handleMeasureLabel = React.useCallback((event: LayoutChangeEvent) => {
    const measuredWidth = Math.ceil(event.nativeEvent.layout.width);
    setLabelWidth((prevWidth) =>
      prevWidth === measuredWidth ? prevWidth : measuredWidth,
    );
  }, []);

  return (
    <>
      <ThemedText
        numberOfLines={1}
        onLayout={handleMeasureLabel}
        style={styles.measureText}
      >
        {label}
      </ThemedText>

      <Animated.View
        style={[
          styles.container,
          {
            width: animatedWidth,
            height: COMPACT_SIZE,
            borderRadius: animatedBorderRadius,
            backgroundColor: theme.colors.primary,
          },
          style,
        ]}
      >
        {shimmerTranslateX != null ? (
          <Animated.View
            style={[
              styles.shimmerBar,
              {
                transform: [
                  { rotate: '45deg' },
                  { translateX: shimmerTranslateX },
                ],
              },
            ]}
            pointerEvents="none"
          />
        ) : null}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.pressable,
            {
              paddingHorizontal: horizontalPadding,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons
            name={iconName}
            size={iconSize}
            color={theme.colors.textOnPrimary}
          />

          <Animated.View
            style={{
              marginLeft: labelSpacing,
              opacity: labelOpacity,
              width: animatedLabelWidth,
              overflow: "hidden",
            }}
          >
            <ThemedText numberOfLines={1} style={styles.label}>
              {label}
            </ThemedText>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      overflow: "hidden",
      position: "absolute",
      right: theme.spacing.lg,
      bottom: theme.spacing.xl * 1.5,
    },
    pressable: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    measureText: {
      ...theme.typography.bodySmall,
      position: "absolute",
      opacity: 0,
      left: -9999,
      top: -9999,
    },
    label: {
      ...theme.typography.bodySmall,
      color: theme.colors.textOnPrimary,
    },
    shimmerBar: {
      position: "absolute",
      left: -150,
      top: -200,
      width: 8,
      height: 600,
      backgroundColor: "#ffffff",
      opacity: 0.4,
      transformOrigin: "center center",
      zIndex: 1,
    },
  });
