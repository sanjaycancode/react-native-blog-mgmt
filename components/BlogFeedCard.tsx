import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

import type { Blog } from "@/types/blog";

interface BlogFeedCardProps {
  blog: Blog;
  isProfile?: boolean;
  onPress?: () => void;
  onLike?: (blogId: string) => Promise<{ likesCount: number; liked: boolean }>;
  onDelete?: (blogId: string) => void;
  onUnpublish?: (blogId: string) => void;
  onEdit?: (blog: Blog) => void;
  commentsContent?: ReactNode;
  commentCount?: number;
  shareUrl?: string;
}

const statusColors: Record<Blog["status"], "accent" | "primary" | "muted"> = {
  published: "accent",
  featured: "accent",
  submitted: "accent",
  rejected: "primary",
  unpublished: "muted",
  draft: "accent",
};

function formatRelative(value?: string) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getImageUri(image: Blog["image"]): string | undefined {
  if (typeof image === "string") return image;
  return image?.url;
}

function getAvatarUri(avatar: Blog["author"]["profile"]) {
  const avatarSource = avatar?.avatar;
  if (typeof avatarSource === "string") return avatarSource;
  return avatarSource?.url;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function BlogFeedCard({
  blog,
  isProfile = false,
  onPress,
  onLike,
  onDelete,
  onUnpublish,
  onEdit,
  commentsContent,
  commentCount,
  shareUrl,
}: BlogFeedCardProps) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;
  const authorName = blog.author?.name ?? "Unknown Author";
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "?";
  const avatarUri = getAvatarUri(blog.author?.profile);
  const imageUri = getImageUri(blog.image);
  const [likesCount, setLikesCount] = useState(blog.likes?.length ?? 0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const toggleLike = async () => {
    if (!onLike || isLiking) return;

    setIsLiking(true);
    try {
      const result = await onLike(blog._id);
      setLikesCount(result.likesCount);
      setLiked(result.liked);
    } catch (error) {
      Alert.alert(
        "Unable to update like",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsLiking(false);
    }
  };

  const shareBlog = async () => {
    try {
      const message = shareUrl
        ? `${blog.title}\n${shareUrl}`
        : `${blog.title}\n/blogs/${blog.slug}`;
      await Share.share({ message });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  const openAuthorProfile = () => {
    if (blog.author?._id) {
      void Linking.openURL(`https://blog-ncc19.vercel.app/authors/${blog.author._id}`).catch(
        () => Alert.alert("Unable to open author profile", "Please try again."),
      );
    }
  };

  const statusStyle =
    statusColors[blog.status] === "primary"
      ? { backgroundColor: colors.badgePrimaryBg, color: colors.badgePrimaryText }
      : statusColors[blog.status] === "muted"
        ? { backgroundColor: colors.badgeBg, color: colors.badgeText }
        : { backgroundColor: colors.secondary, color: colors.secondaryForeground };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          marginBottom: spacing.lg,
        },
      ]}
    >
      <View style={[styles.header, { padding: spacing.md, paddingBottom: spacing.sm }]}>
        <Pressable
          accessibilityRole={blog.author?._id ? "link" : undefined}
          accessibilityLabel={`Author: ${authorName}`}
          disabled={!blog.author?._id}
          onPress={openAuthorProfile}
          style={styles.author}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.primary,
                borderColor: colors.background,
                borderRadius: radii.full,
              },
            ]}
          >
            {avatarUri && !avatarFailed ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <ThemedText style={{ color: colors.primaryForeground }}>
                {authorInitial}
              </ThemedText>
            )}
          </View>
          <View style={styles.authorDetails}>
            <ThemedText
              variant="bodySmall"
              numberOfLines={1}
              style={{ color: colors.foreground, fontWeight: typography.weights.semibold }}
            >
              {authorName}
            </ThemedText>
            <ThemedText variant="caption" semantic="muted">
              {formatRelative(blog.createdAt)}
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          {blog.tags?.slice(0, 2).map((tag) => (
            <View
              key={tag}
              style={[
                styles.tag,
                {
                  backgroundColor: colors.badgePrimaryBg,
                  borderColor: colors.border,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                numberOfLines={1}
                style={{ color: colors.badgePrimaryText }}
              >
                {tag}
              </ThemedText>
            </View>
          ))}

          {isProfile ? (
            <View style={styles.menuContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Blog actions"
                accessibilityState={{ expanded: menuOpen }}
                onPress={() => setMenuOpen((open) => !open)}
                hitSlop={8}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
              {menuOpen ? (
                <View
                  style={[
                    styles.menu,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  {onEdit ? (
                    <MenuAction
                      label="Edit"
                      icon="create-outline"
                      onPress={() => {
                        setMenuOpen(false);
                        onEdit(blog);
                      }}
                    />
                  ) : null}
                  {blog.status === "published" && onUnpublish ? (
                    <MenuAction
                      label="Unpublish"
                      icon="eye-off-outline"
                      onPress={() => {
                        setMenuOpen(false);
                        onUnpublish(blog._id);
                      }}
                    />
                  ) : null}
                  {onDelete ? (
                    <MenuAction
                      label="Delete"
                      icon="trash-outline"
                      onPress={() => {
                        setMenuOpen(false);
                        onDelete(blog._id);
                      }}
                      destructive
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {isProfile ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
          <View
            style={[
              styles.status,
              {
                backgroundColor: statusStyle.backgroundColor,
                borderRadius: radii.full,
              },
            ]}
          >
            <ThemedText
              variant="caption"
              style={{ color: statusStyle.color, fontWeight: typography.weights.semibold }}
            >
              {blog.status}
            </ThemedText>
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        <Pressable
          accessibilityRole={onPress ? "button" : undefined}
          disabled={!onPress}
          onPress={onPress}
        >
          <ThemedText variant="heading5" style={styles.title}>
            {blog.title}
          </ThemedText>
        </Pressable>

        {blog.description ? (
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            numberOfLines={3}
            style={{ marginTop: spacing.xs }}
          >
            {stripHtml(blog.description)}
            {"  "}
            {onPress ? (
              <ThemedText
                variant="bodySmall"
                semantic="primary"
                onPress={onPress}
              >
                Read more
              </ThemedText>
            ) : null}
          </ThemedText>
        ) : null}

        {imageUri && !imageFailed ? (
          <Pressable
            accessibilityRole={onPress ? "button" : undefined}
            disabled={!onPress}
            onPress={onPress}
            style={[
              styles.imageFrame,
              {
                backgroundColor: colors.muted,
                borderRadius: radii.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              accessibilityLabel={blog.title}
              resizeMode="cover"
              style={styles.image}
              onError={() => setImageFailed(true)}
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.stats,
          {
            borderTopColor: colors.divider,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <View style={styles.statItem}>
          <Ionicons name="thumbs-up" size={14} color={colors.primary} />
          <ThemedText variant="caption" semantic="muted">
            {likesCount} {likesCount === 1 ? "like" : "likes"}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCommentsOpen((open) => !open)}
        >
          <ThemedText variant="caption" semantic="muted">
            {commentCount === undefined
              ? "Comments"
              : `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
          </ThemedText>
        </Pressable>
      </View>

      <View
        style={[
          styles.actionBar,
          {
            borderTopColor: colors.border,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.xs,
          },
        ]}
      >
        <ActionButton
          label={liked ? "Liked" : "Like"}
          icon={liked ? "thumbs-up" : "thumbs-up-outline"}
          active={liked}
          disabled={!onLike || isLiking}
          onPress={() => void toggleLike()}
        />
        <ActionButton
          label="Comment"
          icon="chatbubble-outline"
          active={commentsOpen}
          onPress={() => setCommentsOpen((open) => !open)}
        />
        <ActionButton
          label="Share"
          icon="share-social-outline"
          onPress={() => void shareBlog()}
        />
      </View>

      {commentsOpen ? (
        <View
          style={[
            styles.comments,
            {
              backgroundColor: colors.muted,
              borderTopColor: colors.border,
              padding: spacing.md,
            },
          ]}
        >
          {commentsContent ?? (
            <ThemedText variant="bodySmall" semantic="muted">
              Comments are not available in this view yet.
            </ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  icon,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const color = disabled
    ? colors.mutedForeground
    : active
      ? colors.primary
      : colors.mutedForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          borderRadius: 8,
          gap: spacing.xs,
          opacity: pressed ? 0.7 : disabled ? 0.55 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <ThemedText
        variant="bodySmall"
        style={{ color, fontWeight: active ? typography.weights.semibold : typography.weights.medium }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MenuAction({
  label,
  icon,
  destructive = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuAction,
        { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
        pressed && { backgroundColor: colors.muted },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={destructive ? colors.primary : colors.foreground}
      />
      <ThemedText
        variant="bodySmall"
        style={{ color: destructive ? colors.primary : colors.foreground }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "visible",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  author: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  authorDetails: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 100,
  },
  menuContainer: {
    position: "relative",
    zIndex: 1,
    paddingHorizontal: 4,
  },
  menu: {
    position: "absolute",
    top: 28,
    right: 0,
    width: 140,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 2,
    elevation: 4,
  },
  menuAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  status: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  title: {
    lineHeight: 26,
  },
  imageFrame: {
    overflow: "hidden",
    aspectRatio: 16 / 9,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  comments: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default BlogFeedCard;
