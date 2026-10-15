import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { type Href, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Portal,
  Text,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import SearchBox from "@/components/SearchBox";

import { adminApi } from "@/api/services/admin";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { AdminBlog } from "@/types/admin";

import { getErrorMessage } from "@/utils/errorMessage";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Submitted", value: "submitted" },
  { label: "Published", value: "published" },
  { label: "Featured", value: "featured" },
  { label: "Unpublished", value: "unpublished" },
  { label: "Rejected", value: "rejected" },
] as const;

// Same palette as the web admin and feed card
const STATUS_PALETTE: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#dcfce7", fg: "#15803d" },
  featured: { bg: "#ede9fe", fg: "#6d28d9" },
  submitted: { bg: "#fef9c3", fg: "#a16207" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  unpublished: { bg: "#f3f4f6", fg: "#374151" },
  draft: { bg: "#fef3c7", fg: "#b45309" },
};

type BlogFilters = {
  search: string;
  status: string;
};

type Confirmation = {
  action: "feature" | "unpublish";
  blog: AdminBlog;
};



export default function AdminBlogsPage() {
  const router = useRouter();
  const { colors, spacing, radii, typography } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [filters, setFilters] = useState<BlogFilters>({
    search: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const updateFilters = useCallback((update: Partial<BlogFilters>) => {
    setFilters((current) => ({ ...current, ...update }));
    setPage(1);
    setBlogs([]);
    setError("");
    setLoading(true);
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (!isAdmin || isInitializing) return;

    let active = true;
    setLoading(true);
    setError("");

    void adminApi
      .listAllBlogs({
        page,
        limit: PAGE_SIZE,
        search: filters.search || undefined,
        status: filters.status || undefined,
      })
      .then((response) => {
        if (!active) return;
        const result = response.data.result;
        if (!Array.isArray(result)) {
          throw new Error("The blog list response has an unexpected format.");
        }
        setBlogs(result);
        setTotalBlogs(response.data.meta.totalBlogs);
        setTotalPages(response.data.meta.totalPages);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [filters, isAdmin, isInitializing, page, reloadKey]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setReloadKey((current) => current + 1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    setError("");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      showToast(getErrorMessage(logoutError), "error");
    }
  }, [logout, router, showToast]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmation) return;
    setActionLoading(true);

    try {
      if (confirmation.action === "unpublish") {
        await adminApi.unpublishBlog(confirmation.blog._id);
        setBlogs((current) =>
          current.map((blog) =>
            blog._id === confirmation.blog._id
              ? { ...blog, status: "unpublished" }
              : blog,
          ),
        );
        showToast("Blog unpublished.");
      } else {
        await adminApi.featureBlog(confirmation.blog._id);
        setBlogs((current) =>
          current.map((blog) =>
            blog._id === confirmation.blog._id
              ? { ...blog, status: "featured" }
              : blog.status === "featured"
                ? { ...blog, status: "published" }
                : blog,
          ),
        );
        showToast("Blog featured.");
      }
      setConfirmation(null);
    } catch (actionError) {
      showToast(getErrorMessage(actionError), "error");
    } finally {
      setActionLoading(false);
    }
  }, [confirmation, showToast]);

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

  const selectedStatusLabel =
    STATUS_FILTERS.find((filter) => filter.value === filters.status)?.label ??
    "All";

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      
        <View style={{ gap: spacing.md }}>
          <SearchBox
            initialValue={filters.search}
            onSearch={(search) => updateFilters({ search })}
            placeholder="Search by title, author, or tag"
          />
          <StatusTabs
            value={filters.status}
            onChange={(status) => updateFilters({ status })}
          />
        </View>

        <View style={styles.resultHeading}>
          <Text variant="titleSmall" style={{ color: colors.foreground }}>
            {selectedStatusLabel} blogs
          </Text>
          <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
            {totalBlogs} {totalBlogs === 1 ? "result" : "results"}
          </Text>
        </View>

        {error ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.primary,
              borderRadius: radii.md,
            }}
          >
            <Card.Content style={{ gap: spacing.sm, alignItems: "center" }}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={colors.primary}
              />
              <Text
                variant="bodyMedium"
                style={{ color: colors.primary, textAlign: "center" }}
              >
                Unable to load blogs: {error}
              </Text>
              <Button
                mode="outlined"
                icon="refresh"
                onPress={() => {
                  setPage(1);
                  setReloadKey((current) => current + 1);
                }}
              >
                Retry
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            <BlogCardSkeleton />
            <BlogCardSkeleton />
            <BlogCardSkeleton />
          </View>
        ) : blogs.length === 0 && !error ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
            }}
          >
            <Card.Content
              style={{
                alignItems: "center",
                gap: spacing.sm,
                paddingVertical: spacing.xl,
              }}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.muted, borderRadius: radii.full },
                ]}
              >
                <Ionicons
                  name="documents-outline"
                  size={28}
                  color={colors.mutedForeground}
                />
              </View>
              <Text variant="titleMedium" style={{ color: colors.foreground }}>
                No blogs found
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: colors.mutedForeground, textAlign: "center" }}
              >
                Try a different search term or status.
              </Text>
              {filters.search || filters.status ? (
                <Button
                  mode="outlined"
                  compact
                  onPress={() => updateFilters({ search: "", status: "" })}
                >
                  Clear filters
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {blogs.map((blog) => (
              <AdminBlogCard
                key={blog._id}
                blog={blog}
                onOpen={() =>
                  void router.push(`/admin/blog/${blog.slug}` as Href)
                }
                onFeature={() => setConfirmation({ action: "feature", blog })}
                onUnpublish={() =>
                  setConfirmation({ action: "unpublish", blog })
                }
              />
            ))}
          </View>
        )}

        {!loading && totalPages > 1 ? (
          <View style={[styles.pagination, { gap: spacing.sm }]}>
            <Button
              mode="outlined"
              compact
              onPress={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              icon={({ size, color }) => (
                <Ionicons name="chevron-back" size={size} color={color} />
              )}
            >
              Prev
            </Button>
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              Page {page} of {totalPages}
            </Text>
            <Button
              mode="outlined"
              compact
              contentStyle={styles.nextButtonContent}
              onPress={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              icon={({ size, color }) => (
                <Ionicons name="chevron-forward" size={size} color={color} />
              )}
            >
              Next
            </Button>
          </View>
        ) : null}
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirmation !== null}
          onDismiss={() => !actionLoading && setConfirmation(null)}
          style={{backgroundColor:colors.background}}
        >
          <Dialog.Title>
            {confirmation?.action === "feature"
              ? "Feature blog"
              : "Unpublish blog"}
          </Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            {confirmation ? (
              <Text
                variant="titleSmall"
                numberOfLines={2}
                style={{ color: colors.foreground }}
              >
                {confirmation.blog.title}
              </Text>
            ) : null}
            <Text variant="bodyMedium">
              {confirmation?.action === "feature"
                ? "Feature this blog on the homepage? It will replace the current featured blog."
                : "Are you sure you want to unpublish this blog? It will no longer be visible to the public."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setConfirmation(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onPress={() => void handleConfirmAction()}
              loading={actionLoading}
              disabled={actionLoading}
              textColor={
                confirmation?.action === "unpublish"
                  ? colors.primary
                  : colors.foreground
              }
            >
              {confirmation?.action === "feature" ? "Feature" : "Unpublish"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AdminShell>
  );
}

function StatusTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: string) => void;
}) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}
    >
      {STATUS_FILTERS.map((filter) => {
        const selected = value === filter.value;
        return (
          <Pressable
            key={filter.value || "all"}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(filter.value)}
            style={[
              styles.tab,
              {
                backgroundColor: selected ? colors.primary : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{
                color: selected ? colors.primaryForeground : colors.foreground,
                fontWeight: selected
                  ? typography.weights.semibold
                  : typography.weights.regular,
              }}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function AdminBlogCard({
  blog,
  onOpen,
  onFeature,
  onUnpublish,
}: {
  blog: AdminBlog;
  onOpen: () => void;
  onFeature: () => void;
  onUnpublish: () => void;
}) {
  const { colors, spacing, radii, typography } = useTheme();
  const status = STATUS_PALETTE[blog.status] ?? {
    bg: colors.badgeBg,
    fg: colors.badgeText,
  };
  const createdDate = new Date(blog.createdAt);
  const dateLabel = Number.isNaN(createdDate.getTime())
    ? "Date unavailable"
    : createdDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  const canModerate = blog.status === "published";

  return (
    <Card
      mode="outlined"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: radii.lg,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${blog.title}`}
        onPress={onOpen}
        style={({ pressed }) => [
          { padding: spacing.md, gap: spacing.sm, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: status.bg,
                borderRadius: radii.full,
                paddingHorizontal: spacing.sm,
              },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{
                color: status.fg,
                fontWeight: typography.weights.semibold,
                textTransform: "capitalize",
              }}
            >
              {blog.status}
            </Text>
          </View>
          <Text variant="labelSmall" style={{ color: colors.mutedForeground }}>
            {dateLabel}
          </Text>
        </View>

        <Text
          variant="titleMedium"
          numberOfLines={2}
          style={{
            color: colors.foreground,
            fontWeight: typography.weights.semibold,
          }}
        >
          {blog.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons
            name="person-outline"
            size={13}
            color={colors.mutedForeground}
          />
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[styles.metaText, { color: colors.mutedForeground }]}
          >
            {blog.author?.name ?? "Unknown author"}
            {"  ·  "}
            {blog.category?.title ?? "Uncategorized"}
          </Text>
        </View>
      </Pressable>

      <Divider />

      <View
        style={[
          styles.actions,
          {
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
            gap: spacing.xs,
          },
        ]}
      >
        <Button mode="text" compact onPress={onOpen} icon="open-in-new">
          View
        </Button>
        <View style={styles.actionSpacer} />
        <Button
          mode="text"
          compact
          onPress={onFeature}
          disabled={!canModerate}
          icon="star-outline"
        >
          Feature
        </Button>
        <Button
          mode="text"
          compact
          onPress={onUnpublish}
          disabled={!canModerate}
          textColor={canModerate ? colors.primary : undefined}
          icon="eye-off-outline"
        >
          Unpublish
        </Button>
      </View>
    </Card>
  );
}

function BlogCardSkeleton() {
  const { colors, spacing, radii } = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <View
        style={[
          styles.skeletonLine,
          { width: "30%", backgroundColor: colors.muted },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { width: "90%", height: 16, backgroundColor: colors.muted },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { width: "55%", backgroundColor: colors.muted },
        ]}
      />
    </View>
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
 
  tab: {
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
 
  
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pill: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    flex: 1,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  actionSpacer: {
    flex: 1,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nextButtonContent: {
    flexDirection: "row-reverse",
  },
 skeleton: {
  borderWidth: StyleSheet.hairlineWidth,
},
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
});