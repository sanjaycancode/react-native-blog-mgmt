import { Fragment, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";

import SaveBlogButton from "@/components/SaveBlogButton";
import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

import type { Blog } from "@/types/blog";

interface BlogFeedCardProps {
  blog: Blog;
  isProfile?: boolean;
  search?: string;
  currentUserId?: string;
  onPress?: () => void;
  onAuthorPress?: (authorId: string) => void;
  onLike?: (blogId: string) => Promise<{ likesCount: number; liked: boolean }>;
  onDelete?: (blogId: string) => void;
  onUnpublish?: (blogId: string) => void;
  onEdit?: (blog: Blog) => void;
  saveButton?: ReactNode;
  commentsContent?: ReactNode;
  renderComments?: (api: {
    onCommentCountChange: (count: number) => void;
  }) => ReactNode;
  commentCount?: number;
  shareUrl?: string;
}

// Same palette as the web card's statusBadgeStyles
const statusPalette: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#dcfce7", fg: "#15803d" },
  featured: { bg: "#ede9fe", fg: "#6d28d9" },
  submitted: { bg: "#fef9c3", fg: "#a16207" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  unpublished: { bg: "#f3f4f6", fg: "#374151" },
  draft: { bg: "#fef3c7", fg: "#b45309" },
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

function getAvatarUri(profile: Blog["author"]["profile"]) {
  const source = profile?.avatar;
  if (typeof source === "string") return source;
  return source?.url;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// React Native version of the web <Highlight /> util
function Highlight({
  text,
  query,
  backgroundColor,
  color,
}: {
  text: string;
  query?: string;
  backgroundColor: string;
  color: string;
}) {
  const term = query?.trim();
  if (!term) return <>{text}</>;

  // The capture group puts every match at an odd index
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Text key={index} style={{ backgroundColor, color }}>
            {part}
          </Text>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function BlogFeedCard({
  blog,
  isProfile = false,
  search,
  currentUserId,
  onPress,
  onAuthorPress,
  onLike,
  onDelete,
  onUnpublish,
  onEdit,
  saveButton,
  commentsContent,
  renderComments,
  commentCount,
  shareUrl,
}: BlogFeedCardProps) {
  const { colors, spacing, radii, typography } = useTheme();

  const authorName = blog.author?.name ?? "Unknown Author";
  const authorInitial = authorName.trim().charAt(0).toUpperCase() || "?";
  const avatarUri = getAvatarUri(blog.author?.profile);
  const imageUri = getImageUri(blog.image);
  const excerpt = blog.description ? stripHtml(blog.description) : "";

  const [likesCount, setLikesCount] = useState(blog.likes?.length ?? 0);
  const [liked, setLiked] = useState(
    Boolean(currentUserId && blog.likes?.includes(currentUserId)),
  );
  const [isLiking, setIsLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCountState, setCommentCountState] = useState<number | null>(
    commentCount ?? null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const status = statusPalette[blog.status] ?? {
    bg: colors.badgeBg,
    fg: colors.badgeText,
  };
  const hasChips = (isProfile && Boolean(blog.status)) || Boolean(blog.tags?.length);

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
      await Share.share({
        message: shareUrl ? `${blog.title}\n${shareUrl}` : blog.title,
      });
    } catch {
      Alert.alert("Unable to share", "Please try again.");
    }
  };

  const openAuthorProfile = () => {
    const authorId = blog.author?._id;
    if (!authorId) return;

    if (onAuthorPress) {
      onAuthorPress(authorId);
      return;
    }

    void Linking.openURL(
      `authors/${authorId}`,
    ).catch(() =>
      Alert.alert("Unable to open author profile", "Please try again."),
    );
  };

  const closeMenuThen = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

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
      {/* a. Header: author row */}
      <View
        style={[
          styles.header,
          {
            padding: spacing.md,
            paddingBottom: hasChips ? spacing.sm : spacing.md,
          },
        ]}
      >
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
              style={{
                color: colors.foreground,
                fontWeight: typography.weights.semibold,
              }}
            >
              <Highlight
                text={authorName}
                query={search}
                backgroundColor={colors.badgePrimaryBg}
                color={colors.badgePrimaryText}
              />
            </ThemedText>
            <ThemedText variant="caption" semantic="muted">
              {formatRelative(blog.createdAt)}
            </ThemedText>
          </View>
        </Pressable>

        {isProfile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Blog actions"
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            style={styles.menuButton}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Status + tags row (wraps, shows ALL tags like the web card) */}
      {hasChips ? (
        <View
          style={[
            styles.chips,
            {
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.sm,
              gap: spacing.xs,
            },
          ]}
        >
          {isProfile && blog.status ? (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: status.bg,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{
                  color: status.fg,
                  fontWeight: typography.weights.semibold,
                  textTransform: "capitalize",
                }}
              >
                {blog.status}
              </ThemedText>
            </View>
          ) : null}

          {blog.tags?.map((tag) => (
            <View
              key={tag}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.badgePrimaryBg,
                  borderColor: colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{ color: colors.badgePrimaryText }}
              >
                <Highlight
                  text={tag}
                  query={search}
                  backgroundColor={colors.primary}
                  color={colors.primaryForeground}
                />
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {/* b. Body */}
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        <Pressable
          accessibilityRole={onPress ? "button" : undefined}
          disabled={!onPress}
          onPress={onPress}
        >
          <ThemedText variant="heading5" style={styles.title}>
            <Highlight
              text={blog.title}
              query={search}
              backgroundColor={colors.badgePrimaryBg}
              color={colors.badgePrimaryText}
            />
          </ThemedText>
        </Pressable>

        {excerpt ? (
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            numberOfLines={3}
            style={{ marginTop: spacing.xs }}
          >
            <Highlight
              text={excerpt}
              query={search}
              backgroundColor={colors.badgePrimaryBg}
              color={colors.badgePrimaryText}
            />
            {"  "}
            {onPress ? (
              <ThemedText variant="bodySmall" semantic="primary" onPress={onPress}>
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

      {/* c. Stats row (no top border, same as web) */}
      <View
        style={[
          styles.stats,
          { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
        ]}
      >
        <View style={styles.statItem}>
          <View style={[styles.likeBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="thumbs-up" size={9} color="#ffffff" />
          </View>
          <ThemedText variant="caption" semantic="muted">
            {likesCount} {likesCount === 1 ? "like" : "likes"}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCommentsOpen((open) => !open)}
        >
          <ThemedText variant="caption" semantic="muted">
            {commentCountState !== null
              ? `${commentCountState} ${commentCountState === 1 ? "comment" : "comments"}`
              : "Comments"}
          </ThemedText>
        </Pressable>
      </View>

      {/* d. Action bar */}
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
        {blog.status === "published" && !isProfile
          ? (saveButton ?? <SaveBlogButton blogId={blog._id} />)
          : null}
      </View>

      {/* e. Expandable comments */}
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
          {renderComments ? (
            renderComments({ onCommentCountChange: setCommentCountState })
          ) : (
            (commentsContent ?? (
              <ThemedText variant="bodySmall" semantic="muted">
                Comments are not available in this view yet.
              </ThemedText>
            ))
          )}
        </View>
      ) : null}

      {/* Profile actions menu (bottom sheet, works the same on iOS/Android/web) */}
      {isProfile ? (
        <Modal
          animationType="fade"
          transparent
          visible={menuOpen}
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.sheetRoot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={() => setMenuOpen(false)}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.foreground, opacity: 0.35 },
              ]}
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderTopLeftRadius: radii.lg,
                  borderTopRightRadius: radii.lg,
                  padding: spacing.sm,
                },
              ]}
            >
              {onEdit ? (
                <MenuAction
                  label="Edit"
                  icon="create-outline"
                  onPress={closeMenuThen(() => onEdit(blog))}
                />
              ) : null}
              {blog.status === "published" && onUnpublish ? (
                <MenuAction
                  label="Unpublish"
                  icon="eye-off-outline"
                  onPress={closeMenuThen(() => onUnpublish(blog._id))}
                />
              ) : null}
              {onDelete ? (
                <MenuAction
                  label="Delete"
                  icon="trash-outline"
                  destructive
                  onPress={closeMenuThen(() => onDelete(blog._id))}
                />
              ) : null}
            </View>
          </View>
        </Modal>
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
        style={{
          color,
          fontWeight: active
            ? typography.weights.semibold
            : typography.weights.medium,
        }}
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
        { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
        pressed && { backgroundColor: colors.muted },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
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
    overflow: "hidden",
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
    width: 44,
    height: 44,
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
  menuButton: {
    padding: 4,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  chip: {
    alignSelf: "flex-start",
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
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
  menuAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default BlogFeedCard;