import { useEffect } from "react";
import {
  type DimensionValue,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
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

import { Blog } from "@/types";

import { imgSrc } from "@/utils/getImgSrc";

import EmptyState from "../profile/EmptyState";
import type { ProfileTab } from "../profile/MinimalTabBar";

const GAP = 10;
const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

// height / width. A mix of short, square and tall cards.
const RATIOS = [1, 1.3, 1.55, 1.15, 1.45, 1.25];
const SKELETON_RATIOS = [1.3, 1, 1.55, 1.15, 1.45, 1.25];

// Same id always gives the same ratio, so the layout is stable between renders.
function ratioFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return RATIOS[h % RATIOS.length];
}

type Placed = { blog: Blog; index: number; ratio: number };

// Put each card into whichever column is currently shorter.
function splitColumns(items: Blog[]): [Placed[], Placed[]] {
  const cols: [Placed[], Placed[]] = [[], []];
  const heights = [0, 0];
  items.forEach((blog, index) => {
    const ratio = ratioFor(blog._id);
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push({ blog, index, ratio });
    heights[c] += ratio;
  });
  return cols;
}

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
  onRemoveSaved?: (blog: Blog) => void;
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
  ratio = 4 / 3,
  onPress,
  onLongPress,
  onRemoveSaved,
}: {
  blog: Blog;
  index: number;
  type: ProfileTab;
  busy?: boolean;
  showAuthor?: boolean;
  width?: DimensionValue;
  ratio?: number;
  onPress: () => void;
  onLongPress?: () => void;
  onRemoveSaved?: () => void;
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
      style={[styles.cardWrap, width !== undefined && { width }]}
    >
      <Animated.View style={animatedStyle}>
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
              aspectRatio: 1 / ratio, // taller ratio = taller card
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

          <View style={styles.caption}>
            {!!categoryTitle(blog) && (
              <Text numberOfLines={1} style={styles.captionMeta}>
                {categoryTitle(blog)}
              </Text>
            )}
            <Text
              numberOfLines={ratio >= 1.4 ? 3 : 2}
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
        {type === "saved" && onRemoveSaved && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${blog.title} from saved blogs`}
            hitSlop={8}
            onPress={onRemoveSaved}
            disabled={busy}
            style={[
              styles.saveOverlay,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="bookmark" size={16} color={colors.primary} />
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

export default function GridFeed({
  items,
  type,
  busyId,
  onPressItem,
  onLongPressItem,
  onRemoveSaved,
  onEmptyAction,
  showAuthor,
}: Props) {
  if (items.length === 0) {
    return <EmptyState type={type} onAction={onEmptyAction} />;
  }

  const [left, right] = splitColumns(items);

  const renderColumn = (col: Placed[]) => (
    <View style={styles.column}>
      {col.map(({ blog, index, ratio }) => (
        <GridCard
          key={blog._id}
          blog={blog}
          index={index}
          ratio={ratio}
          width="100%"
          type={type}
          busy={busyId === blog._id}
          showAuthor={showAuthor}
          onPress={() => onPressItem(blog)}
          onLongPress={
            onLongPressItem ? () => onLongPressItem(blog) : undefined
          }
          onRemoveSaved={onRemoveSaved ? () => onRemoveSaved(blog) : undefined}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.grid}>
      {renderColumn(left)}
      {renderColumn(right)}
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

  // Alternate placeholders between two columns, same shape as the real feed.
  const cols: number[][] = [[], []];
  Array.from({ length: count }).forEach((_, i) =>
    cols[i % 2].push(SKELETON_RATIOS[i % SKELETON_RATIOS.length]),
  );

  return (
    <View style={styles.grid}>
      {cols.map((col, c) => (
        <View key={c} style={styles.column}>
          {col.map((ratio, i) => (
            <Animated.View key={i} style={[{ width: "100%" }, style]}>
              <View
                style={[
                  styles.card,
                  {
                    aspectRatio: 1 / ratio,
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              />
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    alignItems: "flex-start", // columns keep their own height
    gap: GAP,
    padding: GAP,
  },
  column: {
    flex: 1,
    rowGap: GAP,
  },
  cardWrap: {
    width: "100%",
    position: "relative",
  },
  card: {
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
  saveOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
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
