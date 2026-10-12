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
  Chip,
  Dialog,
  Divider,
  Portal,
  Text,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { blogApi } from "@/api/services";
import { adminApi } from "@/api/services/admin";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { Blog } from "@/types/blog";

import { getErrorMessage } from "@/utils/errorMessage";

import { env } from "@/lib/config/env";

type ModerationAction = "verify" | "reject";

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

function DetailSkeleton() {
  const { colors, radii, spacing } = useTheme();
  const blocks = [32, 22, 18, 220, 100, 18, 18];

  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={{
            width: index === 3 ? "100%" : `${70 + (index % 3) * 10}%`,
            height,
            backgroundColor: colors.muted,
            borderRadius: radii.md,
          }}
        />
      ))}
    </View>
  );
}

export default function AdminBlogDetailPage() {
  const router = useRouter();
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

  const contentWidth = Math.max(width - spacing.md * 2, 1);
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

  const statusColor =
    blog?.status === "published" || blog?.status === "featured"
      ? colors.primary
      : blog?.status === "rejected"
        ? colors.mutedForeground
        : colors.accent;
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            padding: spacing.md,
            paddingBottom: spacing["4xl"],
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
        <Button
          mode="text"
          icon={({ size, color }) => (
            <Ionicons name="arrow-back" size={size} color={color} />
          )}
          onPress={() => router.replace("/admin/blog")}
          style={styles.backButton}
        >
          Back to Blogs
        </Button>

        {loading ? (
          <DetailSkeleton />
        ) : error ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
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
                onPress={() => setReloadKey((current) => current + 1)}
              >
                Try again
              </Button>
            </Card.Content>
          </Card>
        ) : blog ? (
          <>
            <View style={{ gap: spacing.md }}>
              <Text
                variant="headlineMedium"
                style={{ color: colors.foreground, fontWeight: "700" }}
              >
                {blog.title}
              </Text>

              {blog.category?.title ? (
                <View style={styles.categoryRow}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.mutedForeground }}
                  >
                    Category:
                  </Text>
                  <Chip
                    compact
                    style={{
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    }}
                    textStyle={{
                      color: colors.secondaryForeground,
                      fontWeight: "600",
                    }}
                  >
                    {blog.category.title}
                  </Chip>
                </View>
              ) : null}

              <View style={[styles.meta, { gap: spacing.sm }]}>
                <View
                  style={[
                    styles.authorInitial,
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
                      fontWeight: "700",
                    }}
                  >
                    {blog.author?.name?.charAt(0).toUpperCase() ?? "?"}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: colors.foreground }}>
                  {blog.author?.name ?? "Unknown"}
                </Text>
                {formatDate(blog.createdAt) ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    · {formatDate(blog.createdAt)}
                  </Text>
                ) : null}
                <Chip
                  compact
                  style={{
                    backgroundColor: colors.muted,
                    borderColor: statusColor,
                    borderWidth: 1,
                  }}
                  textStyle={{ color: statusColor }}
                >
                  {blog.status}
                </Chip>
              </View>

              {blog.tags?.length ? (
                <View style={[styles.tags, { gap: spacing.xs }]}>
                  {blog.tags.map((tag) => (
                    <Chip
                      key={tag}
                      compact
                      style={{
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                      }}
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              ) : null}
            </View>

            {imageUri && !imageFailed ? (
              <Image
                source={{ uri: imageUri }}
                accessibilityLabel={`${blog.title} cover`}
                onError={() => setImageFailed(true)}
                resizeMode="cover"
                style={[
                  styles.coverImage,
                  {
                    height: Math.min(width * 0.72, 380),
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              />
            ) : null}

            <Card
              mode="outlined"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.md,
              }}
            >
              <Card.Content style={{ gap: spacing.lg }}>
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
                <Divider />
                <View style={[styles.dates, { gap: spacing.sm }]}>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    Created: {formatDate(blog.createdAt) ?? "Unknown"}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    Last updated: {formatDate(blog.updatedAt) ?? "Unknown"}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {blog.status === "submitted" ? (
              <View style={[styles.moderationActions, { gap: spacing.md }]}>
                <Button
                  mode="outlined"
                  icon={({ size, color }) => (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={size}
                      color={color}
                    />
                  )}
                  onPress={() => setAction("verify")}
                  textColor={colors.primary}
                >
                  Verify
                </Button>
                <Button
                  mode="outlined"
                  icon={({ size, color }) => (
                    <Ionicons
                      name="close-circle-outline"
                      size={size}
                      color={color}
                    />
                  )}
                  onPress={() => setAction("reject")}
                  textColor={colors.mutedForeground}
                >
                  Reject
                </Button>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Portal>
        <Dialog
          visible={action !== null}
          onDismiss={() => !processing && setAction(null)}
        >
          <Dialog.Title>
            {action === "verify" ? "Verify blog" : "Reject blog"}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to {action} this blog?
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
              textColor={action === "verify" ? colors.primary : colors.foreground}
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
  categoryRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  authorInitial: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  coverImage: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
  },
  articleBody: {
    width: "100%",
  },
  dates: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  moderationActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
});
