import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/constants/theme";

import { imgSrc } from "@/utils/getImgSrc";

import type { Blog } from "@/types";

import EmptyState from "./EmptyState";
import type { ProfileTab } from "./MinimalTabBar";

const GAP = 10;
const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

type Props = {
  items: Blog[];
  type: ProfileTab;
  busyId?: string | null;
  onPressItem: (blog: Blog) => void;
  onLongPressItem?: (blog: Blog) => void;
  onEmptyAction?: () => void;
};

function GridCard({
  blog,
  index,
  type,
  busy,
  onPress,
  onLongPress,
}: {
  blog: Blog;
  index: number;
  type: ProfileTab;
  busy: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { colors, typography } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const hasImage = !!blog.image;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(240)}
      style={[styles.cardWrap, animatedStyle]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        onPressIn={() => (scale.value = withSpring(0.95, SPRING))}
        onPressOut={() => (scale.value = withSpring(1, SPRING))}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={blog.title}
        style={[
          styles.card,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            opacity: busy ? 0.5 : 1,
          },
        ]}
      >
        {hasImage ? (
          <Image
            source={{ uri: imgSrc(blog.image as string) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Ionicons
              name="document-text-outline"
              size={36}
              color={colors.mutedForeground}
            />
          </View>
        )}

        {type === "drafts" && (
          <View style={styles.pill}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
            <Text style={styles.pillText}>Draft</Text>
          </View>
        )}

        {/* Translucent caption plate */}
        <View style={styles.caption}>
          {!!blog.category && (
            <Text numberOfLines={1} style={styles.captionMeta}>
              {String(blog.category)}
            </Text>
          )}
          <Text
            numberOfLines={2}
            style={{
              color: "#fff",
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.bold,
              lineHeight: 18,
            }}
          >
            {blog.title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function GridFeed({
  items,
  type,
  busyId,
  onPressItem,
  onLongPressItem,
  onEmptyAction,
}: Props) {
  if (items.length === 0) {
    return <EmptyState type={type} onAction={onEmptyAction} />;
  }

  return (
    <View style={styles.grid}>
      {items.map((blog, index) => (
        <GridCard
          key={blog._id}
          blog={blog}
          index={index}
          type={type}
          busy={busyId === blog._id}
          onPress={() => onPressItem(blog)}
          onLongPress={
            onLongPressItem ? () => onLongPressItem(blog) : undefined
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: GAP,
    padding: GAP,
  },
  cardWrap: {
    width: "48.8%",
  },
  card: {
    aspectRatio: 3 / 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  caption: {
    margin: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  captionMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
});
