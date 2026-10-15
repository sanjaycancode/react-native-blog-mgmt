import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import RenderHTML from "@native-html/render";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Portal,
  Text,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminShell } from "@/app/admin/AdminShell";

import { blogApi } from "@/api/services";
import { adminApi } from "@/api/services/admin";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { Blog } from "@/types/blog";

import { getErrorMessage } from "@/utils/errorMessage";

import { env } from "@/lib/config/env";
import { HeaderBackButton } from "@/components/HeaderBackButton";

type ModerationAction = "verify" | "reject";

// Same palette as the admin list and the feed card
const STATUS_PALETTE: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#dcfce7", fg: "#15803d" },
  featured: { bg: "#ede9fe", fg: "#6d28d9" },
  submitted: { bg: "#fef9c3", fg: "#a16207" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  unpublished: { bg: "#f3f4f6", fg: "#374151" },
  draft: { bg: "#fef3c7", fg: "#b45309" },
};

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getBlogImageUri(image?: Blog["image"]) {
  if (!image) return undefined;
  if (typeof image !== "string" && image.url) return image.url;

  const path = typeof image === "string" ? image : image.key;
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;

  return `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/blogs/${path.replace(/^\/+/, "")}`;
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

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readingTime(html: string) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function DetailSkeleton() {
  const { colors, radii, spacing } = useTheme();
  const blocks = [
    { width: "30%", height: 22 },
    { width: "90%", height: 32 },
    { width: "60%", height: 20 },
    { width: "100%", height: 200 },
    { width: "100%", height: 14 },
    { width: "85%", height: 14 },
    { width: "70%", height: 14 },
  ] as const;

  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((block, index) => (
        <View
          key={index}
          style={{
            width: block.width,
            height: block.height,
            backgroundColor: colors.muted,
            borderRadius: radii.md,
          }}
        />
      ))}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: colors.foreground, fontWeight: "600" }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function AdminBlogDetailPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug: slugParam } = useLocalSearchParams<{
    slug?: string | string[];
  }>();
  const slug = getParam(slugParam);
  const { width } = useWindowDimensions();
  const { colors, spacing, radii, typography } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [processing, setProcessing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Card.Content adds 16px padding on each side
  const contentWidth = Math.max(width - spacing.md * 4, 1);
  const imageUri = useMemo(() => getBlogImageUri(blog?.image), [blog?.image]);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isAdmin, isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (!slug || !isAdmin || isInitializing) return;

    let active = true;
    setLoading(true);
    setError("");
    setBlog(null);
    setImageFailed(false);

    void blogApi
      .getBySlug(slug)
      .then((response) => {
        if (active) setBlog(response.data.result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getErrorMessage(requestError).toLowerCase().includes("not found")
              ? "Blog not found."
              : "Unable to load this blog. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin, isInitializing, reloadKey, slug]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      showToast(getErrorMessage(logoutError), "error");
    }
  }, [logout, router, showToast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((current) => current + 1);
  }, []);

  const handleAction = useCallback(async () => {
    if (!blog || !action) return;
    setProcessing(true);

    try {
      if (action === "verify") {
        await adminApi.verifyBlog(blog._id);
        setBlog((current) =>
          current ? { ...current, status: "published" } : current,
        );
        showToast("Blog verified and published.");
      } else {
        await adminApi.rejectBlog(blog._id);
        setBlog((current) =>
          current ? { ...current, status: "rejected" } : current,
        );
        showToast("Blog rejected.");
      }
      setAction(null);
    } catch (actionError) {
      showToast(getErrorMessage(actionError), "error");
    } finally {
      setProcessing(false);
    }
  }, [action, blog, showToast]);

  if (isInitializing || !isAuthenticated || !isAdmin) {
    return (
      <View
        style={[
          styles.accessLoading,
          { backgroundColor: colors.background, gap: spacing.md },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text variant="bodyMedium" style={{ color: colors.foreground }}>
          Checking administrator access...
        </Text>
      </View>
    );
  }

  const status = STATUS_PALETTE[blog?.status ?? ""] ?? {
    bg: colors.badgeBg,
    fg: colors.badgeText,
  };
  const needsReview = blog?.status === "submitted";

  const blogTagsStyles = {
    body: {
      color: colors.foreground,
      fontSize: typography.sizes.base,
      lineHeight: typography.sizes.base * 1.7,
    },
    p: { marginTop: spacing.sm, marginBottom: spacing.sm },
    h1: {
      color: colors.foreground,
      fontSize: typography.sizes["2xl"],
      fontWeight: "700" as const,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    h2: {
      color: colors.foreground,
      fontSize: typography.sizes.xl,
      fontWeight: "700" as const,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    h3: {
      color: colors.foreground,
      fontSize: typography.sizes.lg,
      fontWeight: "600" as const,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    a: { color: colors.primary },
    blockquote: {
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      backgroundColor: colors.muted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    pre: {
      backgroundColor: colors.muted,
      color: colors.foreground,
      padding: spacing.md,
    },
    img: { borderRadius: radii.md },
  };

  return (
    <AdminShell userName={user?.name} onLogout={() => void handleLogout()}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              padding: spacing.md,
              // leave room for the sticky action bar
              paddingBottom: needsReview ? 140 : spacing["4xl"],
              gap: spacing.lg,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >

          {loading ? (
            <DetailSkeleton />
          ) : error ? (
            <Card
              mode="outlined"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.lg,
              }}
            >
              <Card.Content style={[styles.errorState, { gap: spacing.md }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={36}
                  color={colors.primary}
                />
                <Text
                  variant="titleMedium"
                  style={{ color: colors.primary, textAlign: "center" }}
                >
                  {error}
                </Text>
                <Button
                  mode="outlined"
                  icon="refresh"
                  onPress={() => setReloadKey((current) => current + 1)}
                >
                  Try again
                </Button>
              </Card.Content>
            </Card>
          ) : blog ? (
            <>
              {needsReview ? (
                <View
                  style={[
                    styles.banner,
                    {
                      backgroundColor: STATUS_PALETTE.submitted.bg,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      gap: spacing.sm,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={STATUS_PALETTE.submitted.fg}
                  />
                  <View style={styles.bannerText}>
                    <Text
                      variant="labelLarge"
                      style={{ color: STATUS_PALETTE.submitted.fg }}
                    >
                      Awaiting your review
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: STATUS_PALETTE.submitted.fg }}
                    >
                      Verify to publish this blog, or reject it.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Header */}
              <View style={{ gap: spacing.md }}>
              

                <Text
                  variant="headlineMedium"
                  style={{
                    color: colors.foreground,
                    fontWeight: "700",
                    lineHeight: 38,
                  }}
                >
                  {blog.title}
                </Text>
                    <View style={[styles.pillRow, { gap: spacing.sm }]}>
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: status.bg,
                        borderRadius: radii.full,
                      },
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{
                        color: status.fg,
                        fontWeight: "700",
                        textTransform: "capitalize",
                      }}
                    >
                      {blog.status}
                    </Text>
                  </View>
                  {blog.category?.title ? (
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor: colors.secondary,
                          borderRadius: radii.full,
                        },
                      ]}
                    >
                      <Text
                        variant="labelMedium"
                        style={{
                          color: colors.secondaryForeground,
                          fontWeight: "600",
                        }}
                      >
                        {blog.category.title}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.authorRow, { gap: spacing.sm }]}>
                  <View
                    style={[
                      styles.authorInitial,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radii.full,
                      },
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={{
                        color: colors.primaryForeground,
                        fontWeight: "700",
                      }}
                    >
                      {blog.author?.name?.charAt(0).toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <View style={styles.authorText}>
                    <Text
                      variant="titleSmall"
                      style={{ color: colors.foreground, fontWeight: "600" }}
                    >
                      {blog.author?.name ?? "Unknown author"}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.mutedForeground }}
                    >
                      {[
                        formatDate(blog.createdAt),
                        blog.description ? readingTime(blog.description) : null,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>
                  </View>
                </View>

                {blog.tags?.length ? (
                  <View style={[styles.pillRow, { gap: spacing.xs }]}>
                    {blog.tags.map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: colors.badgePrimaryBg,
                            borderRadius: radii.full,
                          },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: colors.badgePrimaryText }}
                        >
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* COVER IMAGE: delete this block to hide it */}
              {imageUri && !imageFailed ? (
                <Image
                  source={{ uri: imageUri }}
                  accessibilityLabel={`${blog.title} cover`}
                  onError={() => setImageFailed(true)}
                  resizeMode="cover"
                  style={[
                    styles.coverImage,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                    },
                  ]}
                />
              ) : null}

              {/* Article */}
              <Card
                mode="outlined"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                }}
              >
                <Card.Content style={{ gap: spacing.md }}>
                  {blog.description ? (
                    <View style={styles.articleBody}>
                      <RenderHTML
                        contentWidth={contentWidth}
                        source={{ html: blog.description }}
                        tagsStyles={blogTagsStyles}
                        renderersProps={{
                          a: {
                            onPress: (_event, href) => {
                              void Linking.openURL(href).catch(() =>
                                showToast("Unable to open this link.", "error"),
                              );
                            },
                          },
                        }}
                      />
                    </View>
                  ) : (
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.mutedForeground }}
                    >
                      This blog has no content.
                    </Text>
                  )}
                </Card.Content>
              </Card>

              {/* Details */}
              <Card
                mode="outlined"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                }}
              >
                <Card.Content style={{ gap: spacing.sm }}>
                  <Text
                    variant="titleSmall"
                    style={{ color: colors.foreground, fontWeight: "600" }}
                  >
                    Details
                  </Text>
                  <Divider />
                  <InfoRow
                    label="Author"
                    value={blog.author?.name ?? "Unknown"}
                  />
                  <InfoRow
                    label="Category"
                    value={blog.category?.title ?? "Uncategorized"}
                  />
                  <InfoRow
                    label="Created"
                    value={formatDate(blog.createdAt) ?? "Unknown"}
                  />
                  <InfoRow
                    label="Last updated"
                    value={formatDate(blog.updatedAt) ?? "Unknown"}
                  />
                </Card.Content>
              </Card>
            </>
          ) : null}
        </ScrollView>

        {/* Sticky moderation bar */}
        {blog && needsReview ? (
          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: Math.max(insets.bottom, spacing.md),
                gap: spacing.md,
              },
            ]}
          >
            <Button
              buttonColor={colors.primary}
              style={styles.actionButton}
              textColor={colors.primaryForeground}
              
              contentStyle={styles.actionButtonContent}
              icon={({ size, color }) => (
                <Ionicons
                  name="close-circle-outline"
                  size={size}
                  color={color}
                />
              )}
              onPress={() => setAction("reject")}
            >
              Reject
            </Button>
            <Button
              mode="contained"
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              buttonColor={'#049634'}

              textColor={colors.primaryForeground}
              icon={({ size, color }) => (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={size}
                  color={color}
                />
              )}
              onPress={() => setAction("verify")}
            >
              Verify
            </Button>
          </View>
        ) : null}
      </View>

      <Portal>
        <Dialog
          visible={action !== null}
          onDismiss={() => !processing && setAction(null)}
          style={{backgroundColor:colors.background}}
        >
          <Dialog.Title>
            {action === "verify" ? "Verify blog" : "Reject blog"}
          </Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            {blog ? (
              <Text
                variant="titleSmall"
                numberOfLines={2}
                style={{ color: colors.foreground }}
              >
                {blog.title}
              </Text>
            ) : null}
            <Text variant="bodyMedium">
              {action === "verify"
                ? "This will publish the blog and make it visible to everyone."
                : "This blog will be marked as rejected and will not be published."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAction(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onPress={() => void handleAction()}
              loading={processing}
              disabled={processing}
              textColor={
                action === "verify" ? colors.primary : colors.foreground
              }
            >
              {processing
                ? "Processing..."
                : action === "verify"
                  ? "Yes, verify"
                  : "Yes, reject"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  accessLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexGrow: 1,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  errorState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    justifyContent: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorInitial: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  authorText: {
    flex: 1,
    gap: 2,
  },
  coverImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  articleBody: {
    width: "100%",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    height: 46,
  },
});
