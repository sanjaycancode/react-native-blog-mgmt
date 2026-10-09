import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  Linking,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RenderHTML from "@native-html/render";

import { Navbar } from "@/components/NavBar";
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
import { profileApi } from "@/api/services/profile";
import { useSearchParams } from "expo-router/build/hooks";

const MAX_CONTENT_WIDTH = 720;

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

function getWordCount(html: string) {
  return getPlainText(html).split(/\s+/).filter(Boolean).length;
}

function getReadingTime(wordCount: number) {
  if (wordCount === 0) return "No content yet";
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
            width:
              index === 1 || index === 3 ? "100%" : `${65 + (index % 3) * 10}%`,
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

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.checkRow, { paddingVertical: spacing.xs }]}>
      <Ionicons
        name={done ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={done ? colors.primary : colors.mutedForeground}
      />
      <ThemedText
        variant="bodySmall"
        semantic={done ? undefined : "muted"}
        style={{ flex: 1 }}
      >
        {label}
      </ThemedText>
    </View>
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

export default function DraftDetailPage() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = getParam(idParam);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, spacing, radii, typography } = useTheme();
  const { isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { slug } = useLocalSearchParams();

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/profile/drafts");
  }, [router]);

  const loadBlog = useCallback(async () => {
    try {
      // myBlogs only returns the logged-in user's blogs, so drafts stay private.
      const response = await profileApi.getDraftBySlug(slug);
      console.log(response);
      const found = response?.data?.result;
      setBlog(found ?? null);
      setImageFailed(false);
      setAvatarFailed(false);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [id]);

  // Wait for the saved session, then load. Logged-out users go to login.
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    void loadBlog().finally(() => setLoading(false));
  }, [isInitializing, isAuthenticated, loadBlog, router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBlog();
    setRefreshing(false);
  }, [loadBlog]);

  const handleDelete = useCallback(async () => {
    if (!blog || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await blogApi.delete(blog._id);
      setDeleteModalOpen(false);
      showToast("Draft deleted.");
      goBack();
    } catch (deleteError) {
      setDeleteModalOpen(false);
      showToast(getErrorMessage(deleteError), "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [blog, deleteLoading, goBack, showToast]);

  const handleEdit = useCallback(() => {
    if (!blog) return;
    // Needs an edit screen at app/blog/[slug]/edit.tsx.
    router.push(`/profile/drafts/edit/${blog.slug}`);
  }, [blog, router]);

  const handleHtmlLinkPress = useCallback(
    (_event: unknown, href: string) => {
      void Linking.openURL(href).catch((linkError: unknown) => {
        showToast(getErrorMessage(linkError), "error");
      });
    },
    [showToast],
  );

  const contentWidth = Math.max(
    Math.min(width, MAX_CONTENT_WIDTH) - spacing.md * 2,
    1,
  );
  const imageUri = useMemo(() => getAssetUri(blog?.image), [blog?.image]);
  const avatarUri = useMemo(
    () => getAssetUri(blog?.author?.profile?.avatar, "profiles"),
    [blog?.author?.profile?.avatar],
  );
  const wordCount = useMemo(
    () => getWordCount(blog?.description ?? ""),
    [blog?.description],
  );

  const checklist = useMemo(
    () => [
      { label: "Title added", done: Boolean(blog?.title?.trim()) },
      {
        label:
          wordCount > 0
            ? `Story written (${wordCount} words)`
            : "Write your story",
        done: wordCount > 0,
      },
      { label: "Cover image added", done: Boolean(imageUri) },
      { label: "Category chosen", done: Boolean(blog?.category?.title) },
      { label: "Tags added", done: Boolean(blog?.tags?.length) },
    ],
    [blog, imageUri, wordCount],
  );
  const doneCount = checklist.filter((item) => item.done).length;

  const htmlTagsStyles = useMemo(
    () => ({
      body: {
        color: colors.foreground,
        fontSize: typography.sizes.base,
        lineHeight: Math.round(
          typography.sizes.base * typography.lineHeights.relaxed,
        ),
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

  if (isInitializing || loading) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <DetailSkeleton />
      </ThemedSafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

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
            {error ?? "Draft not found."}
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            style={styles.centerText}
          >
            It may have been deleted or published, or there may be a connection
            problem.
          </ThemedText>
          {error ? (
            <ThemedButton
              title="Try again"
              onPress={() => {
                setLoading(true);
                void loadBlog().finally(() => setLoading(false));
              }}
            />
          ) : null}
          <ThemedButton
            title="Back to drafts"
            variant="outlined"
            onPress={goBack}
          />
        </View>
      </ThemedSafeAreaView>
    );
  }

  const authorName = blog.author?.name ?? "You";

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <Navbar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["4xl"] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: "center",
            paddingHorizontal: spacing.md,
            paddingTop: spacing.lg,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            style={[styles.backLink, { marginBottom: spacing.lg }]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <ThemedText variant="bodySmall" semantic="primary">
              Back to drafts
            </ThemedText>
          </Pressable>

          {/* Badges */}
          <View
            style={[
              styles.badgeRow,
              { gap: spacing.xs, marginBottom: spacing.sm },
            ]}
          >
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.badgePrimaryBg,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={12}
                color={colors.badgePrimaryText}
              />
              <ThemedText
                variant="caption"
                style={{ color: colors.badgePrimaryText }}
              >
                Draft · only you can see this
              </ThemedText>
            </View>

            {blog.category?.title ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.muted,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <ThemedText variant="caption" semantic="muted">
                  {blog.category.title}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <ThemedText variant="heading2" style={styles.title}>
            {blog.title || "Untitled draft"}
          </ThemedText>

          <View style={[styles.metadata, { marginTop: spacing.md }]}>
            <View style={styles.authorInline}>
              <AuthorAvatar
                uri={avatarUri}
                failed={avatarFailed}
                onError={() => setAvatarFailed(true)}
                name={authorName}
                size={28}
              />
              <ThemedText variant="bodySmall" style={styles.authorName}>
                {authorName}
              </ThemedText>
            </View>
            {formatRelative(blog.updatedAt) ? (
              <ThemedText variant="caption" semantic="muted">
                Edited {formatRelative(blog.updatedAt)}
              </ThemedText>
            ) : null}
            <ThemedText variant="caption" semantic="muted">
              {getReadingTime(wordCount)}
            </ThemedText>
          </View>

          {blog.tags?.length ? (
            <View
              style={[styles.tags, { gap: spacing.xs, marginTop: spacing.md }]}
            >
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

          {/* Owner actions */}
          <View
            style={[
              styles.ownerActions,
              { gap: spacing.sm, marginTop: spacing.md },
            ]}
          >
            <ThemedButton
              title="Continue writing"
              startIcon={<Ionicons name="create-outline" />}
              onPress={handleEdit}
            />
            <ThemedButton
              title="Delete"
              variant="outlined"
              color="danger"
              startIcon={<Ionicons name="trash-outline" />}
              onPress={() => setDeleteModalOpen(true)}
            />
          </View>

          {/* Cover image */}
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
                No cover image yet
              </ThemedText>
            </View>
          )}

          {/* Ready to publish */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.md,
                marginTop: spacing.lg,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <ThemedText variant="heading6">Before you publish</ThemedText>
              <ThemedText variant="caption" semantic="muted">
                {doneCount} of {checklist.length} done
              </ThemedText>
            </View>
            <View
              style={[
                styles.progressTrack,
                {
                  backgroundColor: colors.muted,
                  borderRadius: radii.full,
                  marginVertical: spacing.sm,
                },
              ]}
            >
              <View
                style={{
                  width: `${(doneCount / checklist.length) * 100}%`,
                  height: "100%",
                  backgroundColor: colors.primary,
                  borderRadius: radii.full,
                }}
              />
            </View>
            {checklist.map((item) => (
              <ChecklistRow
                key={item.label}
                done={item.done}
                label={item.label}
              />
            ))}
          </View>

          {/* Details */}
          <View
            style={[
              styles.card,
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
              Draft details
            </ThemedText>
            <MetaRow label="Status" value="Draft" />
            {formatDate(blog.createdAt) ? (
              <MetaRow label="Started" value={formatDate(blog.createdAt)!} />
            ) : null}
            {formatRelative(blog.updatedAt) ? (
              <MetaRow
                label="Last edited"
                value={formatRelative(blog.updatedAt)!}
              />
            ) : null}
            <MetaRow label="Length" value={`${wordCount} words`} />
            <MetaRow label="Reading time" value={getReadingTime(wordCount)} />
          </View>

          {/* Body */}
          <View style={[styles.articleBody, { marginTop: spacing.xl }]}>
            {wordCount > 0 || blog.description ? (
              <RenderHTML
                contentWidth={contentWidth}
                source={{ html: blog.description ?? "" }}
                tagsStyles={htmlTagsStyles}
                renderersProps={{
                  a: { onPress: handleHtmlLinkPress },
                }}
              />
            ) : (
              <View
                style={[
                  styles.emptyBody,
                  {
                    backgroundColor: colors.muted,
                    borderRadius: radii.md,
                    padding: spacing.lg,
                  },
                ]}
              >
                <ThemedText
                  variant="bodySmall"
                  semantic="muted"
                  style={styles.centerText}
                >
                  This draft has no content yet. Continue writing to add some.
                </ThemedText>
              </View>
            )}
          </View>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                marginTop: spacing.xl,
                paddingTop: spacing.md,
              },
            ]}
          >
            <ThemedText variant="caption" semantic="muted">
              Last edited: {formatDate(blog.updatedAt) ?? "Unknown"}
            </ThemedText>
            <ThemedButton
              title="Continue writing"
              size="small"
              onPress={handleEdit}
            />
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
            <ThemedText variant="heading5">Delete draft?</ThemedText>
            <ThemedText
              variant="bodySmall"
              semantic="muted"
              style={{ marginTop: spacing.sm }}
            >
              Are you sure you want to delete “{blog.title || "Untitled draft"}
              ”? This action cannot be undone.
            </ThemedText>
            <View
              style={[
                styles.dialogActions,
                { gap: spacing.sm, marginTop: spacing.lg },
              ]}
            >
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
  },
  checkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
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
  emptyBody: {
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
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
