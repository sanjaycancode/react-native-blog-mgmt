import { useEffect } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/constants/theme";
import type { Blog } from "@/types";
import { imgSrc } from "@/utils/getImgSrc";

import EmptyState from "./EmptyState";
import type { ProfileTab } from "./MinimalTabBar";

const GAP = 10;
const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

// Only populated objects are shown; a bare id string would just be noise.
function categoryTitle(blog: Blog): string | undefined {
  const c = blog.category as unknown;
  return typeof c === "object" && c
    ? (c as { title?: string }).title
    : undefined;
}

function authorName(blog: Blog): string | undefined {
  const a = (blog as unknown as { author?: unknown }).author;
  return typeof a === "object" && a ? (a as { name?: string }).name : undefined;
}

type Props = {
  items: Blog[];
  type: ProfileTab;
  busyId?: string | null;
  onPressItem: (blog: Blog) => void;
  onLongPressItem?: (blog: Blog) => void;
  onEmptyAction?: () => void;
  showAuthor?: boolean;
};

export function GridCard({
  blog,
  index,
  type,
  busy = false,
  showAuthor = false,
  width,
  onPress,
  onLongPress,
}: {
  blog: Blog;
  index: number;
  type: ProfileTab;
  busy?: boolean;
  showAuthor?: boolean;
  width?: DimensionValue;
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
      style={[styles.cardWrap, width !== undefined && { width }, animatedStyle]}
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
          {!!categoryTitle(blog) && (
            <Text numberOfLines={1} style={styles.captionMeta}>
              {categoryTitle(blog)}
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
          {showAuthor && !!authorName(blog) && (
            <Text
              numberOfLines={1}
              style={[styles.captionMeta, { marginTop: 3, marginBottom: 0 }]}
            >
              by {authorName(blog)}
            </Text>
          )}
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
  showAuthor,
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
          showAuthor={showAuthor}
          onPress={() => onPressItem(blog)}
          onLongPress={
            onLongPressItem ? () => onLongPressItem(blog) : undefined
          }
        />
      ))}
    </View>
  );
}

/** Pulsing placeholders shown while the feed loads. */
export function GridSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.cardWrap, style]}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          />
        </Animated.View>
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
