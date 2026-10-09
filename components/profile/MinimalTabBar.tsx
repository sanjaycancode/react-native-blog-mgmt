import { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/constants/theme";

export type ProfileTab = "posts" | "saved" | "drafts";

type IconName = keyof typeof Ionicons.glyphMap;

export const TABS: {
  key: ProfileTab;
  label: string;
  icon: IconName;
  iconActive: IconName;
}[] = [
  { key: "posts", label: "Posts", icon: "grid-outline", iconActive: "grid" },
  {
    key: "saved",
    label: "Saved",
    icon: "bookmark-outline",
    iconActive: "bookmark",
  },
  {
    key: "drafts",
    label: "Drafts",
    icon: "create-outline",
    iconActive: "create",
  },
];

const INDICATOR_WIDTH = 28;
const SPRING = { damping: 18, stiffness: 240, mass: 0.8 };

type Props = {
  activeTab: ProfileTab;
  setTab: (tab: ProfileTab) => void;
  draftsCount?: number;
};

function TabButton({
  icon,
  label,
  active,
  badge,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.9, SPRING))}
      onPressOut={() => (scale.value = withSpring(1, SPRING))}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabInner, animatedStyle]}>
        <Ionicons
          name={icon}
          size={24}
          color={active ? colors.foreground : colors.mutedForeground}
        />
        {!!badge && badge > 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.primary,
                borderColor: colors.background,
              },
            ]}
          >
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: 10,
                fontWeight: typography.weights.bold,
              }}
            >
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function MinimalTabBar({
  activeTab,
  setTab,
  draftsCount = 0,
}: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const tabWidth = width / TABS.length;

  useEffect(() => {
    if (!width) return;
    x.value = withSpring(
      activeIndex * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2,
      SPRING,
    );
  }, [activeIndex, tabWidth, width, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.key}
          icon={activeTab === tab.key ? tab.iconActive : tab.icon}
          label={tab.label}
          active={activeTab === tab.key}
          badge={tab.key === "drafts" ? draftsCount : undefined}
          onPress={() => setTab(tab.key)}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          { backgroundColor: colors.foreground },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -14,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
