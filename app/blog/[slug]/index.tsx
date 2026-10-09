import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import RenderHTML from "@native-html/render";

import { Navbar } from "@/components/NavBar";
import SaveBlogButton from "@/components/SaveBlogButton";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { blogApi } from "@/api/services";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { Blog } from "@/types/blog";

import { getErrorMessage } from "@/utils/errorMessage";

import { env } from "@/lib/config/env";

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getAssetUri(
  asset?: string | { key?: string; url?: string },
  folder = "blogs",
) {
  if (!asset) return undefined;
  if (typeof asset !== "string" && asset.url) return asset.url;

  const path = typeof asset === "string" ? asset : asset.key;
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;

  return `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/${folder}/${path.replace(/^\/+/, "")}`;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

function formatRelative(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function getPlainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getReadingTime(html: string) {
  const wordCount = getPlainText(html).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
}

function DetailSkeleton() {
  const { colors, radii, spacing } = useTheme();

  return (
    <View style={{ padding: spacing.md, gap: spacing.md }}>
      {[24, 40, 18, 220, 120, 18, 18, 18, 18].map((height, index) => (
        <View
          key={index}
          style={{
            width: index === 1 || index === 3 ? "100%" : `${65 + (index % 3) * 10}%`,
            height,
            backgroundColor: colors.muted,
            borderRadius: radii.md,
          }}
        />
      ))}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.metaRow, { paddingVertical: spacing.xs }]}>
      <ThemedText variant="bodySmall" semantic="muted">
        {label}
      </ThemedText>
      <ThemedText
        variant="bodySmall"
        style={{ color: colors.foreground, fontWeight: "600", flexShrink: 1 }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

export default function BlogDetailPage() {
  const { slug: slugParam } = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = getParam(slugParam);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, spacing, radii, typography } = useTheme();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlog(null);
    setImageFailed(false);
    setAvatarFailed(false);

    blogApi
      .getBySlug(slug)
      .then((response) => {
        if (cancelled) return;
        const result = response.data.result;
        setBlog(result);
        setLikesCount(result.likes?.length ?? 0);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  useEffect(() => {
    setLiked(
      Boolean(
        session?.user.id && blog?.likes?.includes(session.user.id),
      ),
    );
  }, [blog, session?.user.id]);

  const contentWidth = Math.max(width - spacing.md * 2, 1);
  const imageUri = useMemo(() => getAssetUri(blog?.image), [blog?.image]);
  const avatarUri = useMemo(
    () => getAssetUri(blog?.author?.profile?.avatar, "profiles"),
    [blog?.author?.profile?.avatar],
  );
  const isAuthor = Boolean(
    session?.user.id && blog?.author?._id === session.user.id,
  );
  const htmlTagsStyles = useMemo(
    () => ({
      body: {
        color: colors.foreground,
        fontSize: typography.sizes.base,
        lineHeight: Math.round(typography.sizes.base * typography.lineHeights.relaxed),
      },
      p: { marginTop: 0, marginBottom: spacing.md },
      h1: {
        color: colors.foreground,
        fontSize: typography.sizes["2xl"],
        fontWeight: typography.weights.bold,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
      },
      h2: {
        color: colors.foreground,
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      },
      h3: {
        color: colors.foreground,
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.semibold,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
      },
      li: { marginBottom: spacing.xs },
      blockquote: {
        color: colors.mutedForeground,
        backgroundColor: colors.muted,
        borderLeftColor: colors.primary,
        borderLeftWidth: 3,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      },
      a: { color: colors.primary, textDecorationLine: "underline" as const },
      code: {
        color: colors.foreground,
        backgroundColor: colors.muted,
        fontFamily: "monospace",
      },
      pre: {
        color: colors.background,
        backgroundColor: colors.foreground,
        padding: spacing.md,
      },
      img: { borderRadius: radii.md },
    }),
    [colors, radii.md, spacing, typography],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  const handleLike = useCallback(async () => {
    if (!blog || isLiking) return;
    setIsLiking(true);
    try {
      const result = (await blogApi.toggleLike(blog._id)).data.result;
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (requestError) {
      showToast(getErrorMessage(requestError), "error");
    } finally {
      setIsLiking(false);
    }
  }, [blog, isLiking, showToast]);

  const handleShare = useCallback(async () => {
    if (!blog) return;
    try {
      await Share.share({
        message: `${blog.title}\nhttps://blog-ncc19.vercel.app/blogs/${blog.slug}`,
      });
    } catch (shareError) {
      showToast(getErrorMessage(shareError), "error");
    }
  }, [blog, showToast]);

  const handleDelete = useCallback(async () => {
    if (!blog || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await blogApi.delete(blog._id);
      setDeleteModalOpen(false);
      showToast("Blog deleted.");
      router.replace("/blog");
    } catch (deleteError) {
      setDeleteModalOpen(false);
      showToast(getErrorMessage(deleteError), "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [blog, deleteLoading, router, showToast]);

  const handleHtmlLinkPress = useCallback(
    (_event: unknown, href: string) => {
      void Linking.openURL(href).catch((linkError: unknown) => {
        showToast(getErrorMessage(linkError), "error");
      });
    },
    [showToast],
  );

  if (loading) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <DetailSkeleton />
      </ThemedSafeAreaView>
    );
  }

  if (!blog) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <View style={[styles.state, { padding: spacing.xl }]}>
          <Ionicons
            name="alert-circle-outline"
            size={44}
            color={colors.mutedForeground}
          />
          <ThemedText variant="heading5" style={styles.centerText}>
            {error ?? "Blog not found."}
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            style={styles.centerText}
          >
            This story may have been removed, or there may be a connection
            problem.
          </ThemedText>
          {error ? (
            <ThemedButton
              title="Try again"
              onPress={() => setReloadKey((key) => key + 1)}
            />
          ) : null}
          <ThemedButton
            title="Back to blogs"
            variant="outlined"
            onPress={() => router.replace("/blog")}
          />
        </View>
      </ThemedSafeAreaView>
    );
  }

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <Navbar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["4xl"] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/blog")}
            style={[styles.backLink, { marginBottom: spacing.lg }]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <ThemedText variant="bodySmall" semantic="primary">
              Back to blogs
            </ThemedText>
          </Pressable>

          {blog.category?.title ? (
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: colors.badgePrimaryBg,
                  borderRadius: radii.full,
                  marginBottom: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{ color: colors.badgePrimaryText }}
              >
                {blog.category.title}
              </ThemedText>
            </View>
          ) : null}

          <ThemedText variant="heading2" style={styles.title}>
            {blog.title}
          </ThemedText>

          <View style={[styles.metadata, { marginTop: spacing.md }]}>
            <View style={styles.authorInline}>
              <AuthorAvatar
                uri={avatarUri}
                failed={avatarFailed}
                onError={() => setAvatarFailed(true)}
                name={blog.author?.name}
                size={28}
              />
              <ThemedText variant="bodySmall" style={styles.authorName}>
                {blog.author?.name ?? "Unknown author"}
              </ThemedText>
            </View>
            {formatDate(blog.createdAt) ? (
              <ThemedText variant="caption" semantic="muted">
                {formatDate(blog.createdAt)}
              </ThemedText>
            ) : null}
            <ThemedText variant="caption" semantic="muted">
              {getReadingTime(blog.description)}
            </ThemedText>
          </View>

          {blog.tags?.length ? (
            <View style={[styles.tags, { gap: spacing.xs, marginTop: spacing.md }]}>
              {blog.tags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                      borderRadius: radii.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                    },
                  ]}
                >
                  <ThemedText variant="caption" semantic="muted">
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {isAuthor ? (
            <View style={[styles.ownerActions, { gap: spacing.sm, marginTop: spacing.md }]}>
              <ThemedButton
                title="Edit"
                variant="outlined"
                startIcon={<Ionicons name="create-outline" />}
                onPress={() =>
                  router.push({
                    pathname: "/blog/[slug]/edit",
                    params: { slug: blog.slug },
                  })
                }
              />
              <ThemedButton
                title="Delete"
                variant="outlined"
                color="danger"
                startIcon={<Ionicons name="trash-outline" />}
                onPress={() => setDeleteModalOpen(true)}
              />
            </View>
          ) : null}

          {imageUri && !imageFailed ? (
            <Image
              source={{ uri: imageUri }}
              accessibilityLabel={`${blog.title} cover image`}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
              style={[
                styles.heroImage,
                {
                  backgroundColor: colors.muted,
                  borderRadius: radii.lg,
                  marginTop: spacing.lg,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                {
                  backgroundColor: colors.muted,
                  borderRadius: radii.lg,
                  marginTop: spacing.lg,
                  minHeight: 180,
                },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={36}
                color={colors.mutedForeground}
              />
              <ThemedText variant="caption" semantic="muted">
                No cover image
              </ThemedText>
            </View>
          )}

          <View
            style={[
              styles.authorCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.md,
                marginTop: spacing.lg,
                padding: spacing.md,
              },
            ]}
          >
            <ThemedText variant="caption" semantic="muted">
              Written by
            </ThemedText>
            <View style={[styles.authorCardRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
              <AuthorAvatar
                uri={avatarUri}
                failed={avatarFailed}
                onError={() => setAvatarFailed(true)}
                name={blog.author?.name}
                size={44}
              />
              <View style={styles.authorCardDetails}>
                <ThemedText variant="bodySmall" style={{ fontWeight: "600" }}>
                  {blog.author?.name ?? "Unknown author"}
                </ThemedText>
                {blog.author?.email ? (
                  <ThemedText variant="caption" semantic="muted">
                    {blog.author.email}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.metaCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.md,
                marginTop: spacing.md,
                padding: spacing.md,
              },
            ]}
          >
            <ThemedText variant="heading6" style={{ marginBottom: spacing.sm }}>
              Story details
            </ThemedText>
            {blog.category?.title ? (
              <MetaRow label="Category" value={blog.category.title} />
            ) : null}
            <MetaRow label="Status" value={blog.status} />
            {formatDate(blog.createdAt) ? (
              <MetaRow label="Published" value={formatDate(blog.createdAt)!} />
            ) : null}
            {formatRelative(blog.updatedAt) ? (
              <MetaRow label="Updated" value={formatRelative(blog.updatedAt)!} />
            ) : null}
            <MetaRow label="Reading time" value={getReadingTime(blog.description)} />
            {typeof blog.views === "number" ? (
              <MetaRow label="Views" value={String(blog.views)} />
            ) : null}
          </View>

          <View style={[styles.articleBody, { marginTop: spacing.xl }]}>
            <RenderHTML
              contentWidth={contentWidth}
              source={{ html: blog.description ?? "" }}
              tagsStyles={htmlTagsStyles}
              renderersProps={{
                a: { onPress: handleHtmlLinkPress },
              }}
            />
          </View>

          <View
            style={[
              styles.updatedFooter,
              {
                borderTopColor: colors.border,
                marginTop: spacing.xl,
                paddingTop: spacing.md,
              },
            ]}
          >
            <ThemedText variant="caption" semantic="muted">
              Last updated: {formatDate(blog.updatedAt) ?? "Unknown"}
            </ThemedText>
            <ThemedButton
              title="More blogs"
              variant="outlined"
              size="small"
              onPress={() => router.replace("/blog")}
            />
          </View>

          <View
            style={[
              styles.engagement,
              {
                borderTopColor: colors.border,
                marginTop: spacing.xl,
                paddingTop: spacing.lg,
              },
            ]}
          >
            <ThemedText variant="heading4">Join the conversation</ThemedText>
            <View style={[styles.engagementActions, { gap: spacing.sm, marginTop: spacing.md }]}>
              <ThemedButton
                title={`${liked ? "Liked" : "Like"} · ${likesCount}`}
                variant={liked ? "filled" : "outlined"}
                loading={isLiking}
                startIcon={
                  <Ionicons name={liked ? "heart" : "heart-outline"} />
                }
                onPress={() => void handleLike()}
                style={styles.engagementButton}
              />
                <ThemedButton
                title="Share story"
                variant="outlined"
                startIcon={<Ionicons name="share-social-outline" />}
                onPress={() => void handleShare()}
                style={styles.engagementButton}
              />
              {blog.status === "published" ? (
                <View
                  style={[
                    styles.saveButtonWrap,
                    {
                      borderColor: colors.border,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <SaveBlogButton blogId={blog._id} />
                </View>
              ) : null}

            </View>
            <View
              style={[
                styles.commentsNotice,
                {
                  backgroundColor: colors.muted,
                  borderRadius: radii.md,
                  marginTop: spacing.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <ThemedText variant="heading5" style={{ marginBottom: spacing.xs }}>
                Comments
              </ThemedText>
              <ThemedText variant="bodySmall" semantic="muted">
                Comments are not connected in the mobile app yet.
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={deleteModalOpen}
        onRequestClose={() => setDeleteModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close delete confirmation"
            onPress={() => setDeleteModalOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.foreground, opacity: 0.35 },
            ]}
          />
          <View
            style={[
              styles.deleteDialog,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.lg,
                margin: spacing.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <ThemedText variant="heading5">Delete blog?</ThemedText>
            <ThemedText
              variant="bodySmall"
              semantic="muted"
              style={{ marginTop: spacing.sm }}
            >
              Are you sure you want to delete “{blog.title}”? This action
              cannot be undone.
            </ThemedText>
            <View style={[styles.dialogActions, { gap: spacing.sm, marginTop: spacing.lg }]}>
              <ThemedButton
                title="Cancel"
                variant="outlined"
                disabled={deleteLoading}
                onPress={() => setDeleteModalOpen(false)}
                style={styles.dialogButton}
              />
              <ThemedButton
                title="Delete"
                color="danger"
                loading={deleteLoading}
                onPress={() => void handleDelete()}
                style={styles.dialogButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedSafeAreaView>
  );
}

function AuthorAvatar({
  uri,
  failed,
  onError,
  name,
  size,
}: {
  uri?: string;
  failed: boolean;
  onError: () => void;
  name?: string;
  size: number;
}) {
  const { colors, radii, typography } = useTheme();

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`${name ?? "Author"} avatar`}
        onError={onError}
        style={{ width: size, height: size, borderRadius: radii.full }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: radii.full,
          backgroundColor: colors.secondary,
        },
      ]}
    >
      <ThemedText
        style={{
          color: colors.secondaryForeground,
          fontSize: Math.max(typography.sizes.xs, size * 0.42),
          fontWeight: typography.weights.bold,
        }}
      >
        {name?.trim().charAt(0).toUpperCase() || "?"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  backLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    alignSelf: "flex-start",
  },
  title: {
    lineHeight: 36,
  },
  metadata: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  authorInline: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  authorName: {
    fontWeight: "600",
  },
  tags: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  ownerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  heroImage: {
    aspectRatio: 16 / 9,
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  authorCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  authorCardRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  authorCardDetails: {
    flex: 1,
    gap: 2,
  },
  metaCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  articleBody: {
    width: "100%",
  },
  updatedFooter: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  engagement: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  engagementActions: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  engagementButton: {
    flexGrow: 1,
  },
  saveButtonWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    justifyContent: "center",
  },
  commentsNotice: {},
  modalRoot: {
    flex: 1,
    justifyContent: "center",
  },
  deleteDialog: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dialogButton: {
    flex: 1,
  },
});
