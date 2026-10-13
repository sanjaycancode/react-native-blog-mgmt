import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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

const THUMB = 96;
const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

// ---- Small helpers (defensive: the Blog type may differ slightly) ----------

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

function countOf(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.length;
  return undefined;
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

function formatDate(value: unknown): string {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days < 7) return `${days}d ago`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" as const }),
  });
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

function ListRow({
  blog,
  index,
  type,
  busy,
  showAuthor,
  isLast,
  onPress,
  onMore,
}: {
  blog: Blog;
  index: number;
  type: ProfileTab;
  busy: boolean;
  showAuthor: boolean;
  isLast: boolean;
  onPress: () => void;
  onMore?: () => void;
}) {
  const { colors, typography } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const category = categoryTitle(blog);
  const author = showAuthor ? authorName(blog) : undefined;
  const date = formatDate((blog as unknown as { createdAt?: unknown }).createdAt);
  const excerpt = (blog as unknown as { description?: string }).description;
  const views = countOf((blog as unknown as { views?: unknown }).views);
  const likes = countOf((blog as unknown as { likes?: unknown }).likes);
  const showStats =
    type !== "drafts" && ((views ?? 0) > 0 || (likes ?? 0) > 0);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(240)}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => (scale.value = withSpring(0.985, SPRING))}
          onPressOut={() => (scale.value = withSpring(1, SPRING))}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={blog.title}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed ? colors.secondary : "transparent",
              opacity: busy ? 0.5 : 1,
            },
          ]}
        >
          <View style={styles.textCol}>
            {/* Meta: category and date */}
            <View style={styles.metaRow}>
              {!!category && (
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.primary,
                    fontSize: typography.sizes.xs,
                    fontWeight: typography.weights.bold,
                    flexShrink: 1,
                  }}
                >
                  {category}
                </Text>
              )}
              {!!category && !!date && (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.xs,
                  }}
                >
                  ·
                </Text>
              )}
              {!!date && (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.xs,
                  }}
                >
                  {date}
                </Text>
              )}
            </View>

            <Text
              numberOfLines={2}
              style={{
                color: colors.foreground,
                fontSize: typography.sizes.lg,
                fontWeight: typography.weights.bold,
                lineHeight: 23,
                letterSpacing: -0.2,
                marginTop: 4,
              }}
            >
              {blog.title}
            </Text>

            {!!excerpt && (
              <Text
                numberOfLines={2}
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                  lineHeight: 20,
                  marginTop: 4,
                }}
              >
                {excerpt}
              </Text>
            )}

            {/* Footer: draft badge / author / stats / more */}
            <View style={styles.footer}>
              {type === "drafts" && (
                <View
                  style={[styles.draftPill, { backgroundColor: colors.secondary }]}
                >
                  <Ionicons name="lock-closed" size={10} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 11,
                      fontWeight: typography.weights.bold,
                    }}
                  >
                    Draft
                  </Text>
                </View>
              )}

              {!!author && (
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.xs,
                    flexShrink: 1,
                  }}
                >
                  by {author}
                </Text>
              )}

              <View style={{ flex: 1 }} />

              {showStats && (
                <View style={styles.stats}>
                  {views !== undefined && (
                    <>
                      <Ionicons
                        name="eye-outline"
                        size={14}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.sizes.xs,
                        }}
                      >
                        {compact(views)}
                      </Text>
                    </>
                  )}
                  {likes !== undefined && (
                    <>
                      <Ionicons
                        name="heart-outline"
                        size={14}
                        color={colors.mutedForeground}
                        style={{ marginLeft: 8 }}
                      />
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.sizes.xs,
                        }}
                      >
                        {compact(likes)}
                      </Text>
                    </>
                  )}
                </View>
              )}

              {!!onMore && (
                <Pressable
                  onPress={onMore}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                  style={styles.more}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Thumbnail */}
          <View
            style={[
              styles.thumb,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            {blog.image ? (
              <Image
                source={{ uri: imgSrc(blog.image as string) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name="document-text-outline"
                size={28}
                color={colors.mutedForeground}
              />
            )}
          </View>
        </Pressable>

        {!isLast && (
          <View
            style={[
              styles.separator,
              { backgroundColor: colors.border },
            ]}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

export default function ListFeed({
  items,
  type,
  busyId,
  onPressItem,
  onLongPressItem,
  onEmptyAction,
  showAuthor = false,
}: Props) {
  if (items.length === 0) {
    return <EmptyState type={type} onAction={onEmptyAction} />;
  }

  return (
    <View>
      {items.map((blog, index) => (
        <ListRow
          key={blog._id}
          blog={blog}
          index={index}
          type={type}
          busy={busyId === blog._id}
          showAuthor={showAuthor}
          isLast={index === items.length - 1}
          onPress={() => onPressItem(blog)}
          onMore={onLongPressItem ? () => onLongPressItem(blog) : undefined}
        />
      ))}
    </View>
  );
}

/** Pulsing placeholder rows shown while the feed loads. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const block = { backgroundColor: colors.secondary };

  return (
    <Animated.View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.textCol}>
            <View style={[styles.skelLine, block, { width: "30%" }]} />
            <View
              style={[styles.skelLine, block, { width: "92%", height: 16, marginTop: 10 }]}
            />
            <View
              style={[styles.skelLine, block, { width: "70%", height: 16, marginTop: 6 }]}
            />
            <View
              style={[styles.skelLine, block, { width: "45%", marginTop: 12 }]}
            />
          </View>
          <View style={[styles.thumb, block]} />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textCol: {
    flex: 1,
    minHeight: THUMB,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
    paddingTop: 10,
  },
  draftPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  more: {
    marginLeft: 4,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
  },
});