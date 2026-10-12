import { useCallback, useEffect, useState } from "react";
import {
  Modal,
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
  Chip,
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
import { Blog } from "@/types";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Submitted", value: "submitted" },
  { label: "Published", value: "published" },
  { label: "Featured", value: "featured" },
  { label: "Unpublished", value: "unpublished" },
  { label: "Rejected", value: "rejected" },
] as const;

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
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

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
    "All statuses";

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
        <View style={{ gap: spacing.xs }}>
          <Text variant="headlineSmall" style={{ color: colors.foreground }}>
            Blogs
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
            Search and manage all published and submitted blogs.
          </Text>
        </View>

        <Card mode="outlined" style={{ backgroundColor: colors.card }}>
          <Card.Content style={{ gap: spacing.md }}>
            <SearchBox
              initialValue={filters.search}
              onSearch={(search) => updateFilters({ search })}
              placeholder="Search by title, author, or tag"
            />
            <View style={{ gap: spacing.sm }}>
              <Text variant="labelLarge" style={{ color: colors.foreground }}>
                Status
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Status filter: ${selectedStatusLabel}`}
                accessibilityState={{ expanded: statusMenuVisible }}
                onPress={() => setStatusMenuVisible(true)}
                style={[
                  styles.statusDropdown,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    minHeight: 40,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              >
                <Text variant="bodySmall" style={{ color: colors.foreground }}>
                  {selectedStatusLabel}
                </Text>
                <Ionicons
                  name={statusMenuVisible ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </Card.Content>
        </Card>

        <Modal
          animationType="fade"
          transparent
          visible={statusMenuVisible}
          onRequestClose={() => setStatusMenuVisible(false)}
        >
          <View style={styles.statusModal}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close status filter"
              onPress={() => setStatusMenuVisible(false)}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.foreground, opacity: 0.35 },
              ]}
            />
            <View
              style={[
                styles.statusMenu,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  maxHeight: "70%",
                  padding: spacing.md,
                },
              ]}
            >
              <Text
                variant="titleMedium"
                style={[styles.statusMenuTitle, { color: colors.foreground }]}
              >
                Choose a status
              </Text>
              <ScrollView>
                {STATUS_FILTERS.map((filter) => {
                  const selected = filters.status === filter.value;
                  return (
                    <Pressable
                      key={filter.value || "all"}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setStatusMenuVisible(false);
                        updateFilters({ status: filter.value });
                      }}
                      style={[
                        styles.statusOption,
                        { paddingVertical: spacing.md },
                      ]}
                    >
                      <Text
                        variant="bodySmall"
                        style={{
                          color: selected ? colors.primary : colors.foreground,
                          fontWeight: selected
                            ? typography.weights.semibold
                            : typography.weights.regular,
                        }}
                      >
                        {filter.label}
                      </Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={[styles.resultHeading, { gap: spacing.sm }]}>
          <Text variant="titleMedium" style={{ color: colors.foreground }}>
            All blogs
          </Text>
          <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
            {totalBlogs} total
          </Text>
        </View>

        {error ? (
          <Card
            mode="outlined"
            style={{ borderColor: colors.primary, borderRadius: radii.md }}
          >
            <Card.Content style={{ gap: spacing.sm }}>
              <Text variant="bodyMedium" style={{ color: colors.primary }}>
                Unable to load blogs: {error}
              </Text>
              <Button
                mode="outlined"
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
          <View style={[styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text
              variant="bodyMedium"
              style={{ color: colors.mutedForeground }}
            >
              Loading blogs...
            </Text>
          </View>
        ) : blogs.length === 0 && !error ? (
          <Card mode="outlined" style={{ backgroundColor: colors.card }}>
            <Card.Content style={{ alignItems: "center", gap: spacing.sm }}>
              <Ionicons
                name="documents-outline"
                size={32}
                color={colors.mutedForeground}
              />
              <Text variant="titleMedium" style={{ color: colors.foreground }}>
                No blogs found
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: colors.mutedForeground, textAlign: "center" }}
              >
                Try changing your search terms or selected status.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {blogs.map((blog) => (
              <AdminBlogCard
                key={blog._id}
                blog={blog}
                onOpen={() =>
                 void router.push(`/admin/blog/${(blog.slug)}` as Href)
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
          <View style={[styles.pagination, { gap: spacing.md }]}>
            <Button
              mode="outlined"
              onPress={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              icon="chevron-left"
            >
              Previous
            </Button>
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              Page {page} of {totalPages}
            </Text>
            <Button
              mode="outlined"
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
        >
          <Dialog.Title>
            {confirmation?.action === "feature"
              ? "Feature blog"
              : "Unpublish blog"}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {confirmation?.action === "feature"
                ? "Feature this blog on the homepage? It will replace the current featured blog."
                : "Are you sure you want to unpublish this blog?"}
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
  const { colors, spacing, radii } = useTheme();
  const statusColor =
    blog.status === "published" || blog.status === "featured"
      ? colors.primary
      : blog.status === "submitted"
        ? colors.accent
        : colors.mutedForeground;
  const createdDate = new Date(blog.createdAt);
  const dateLabel = Number.isNaN(createdDate.getTime())
    ? "Date unavailable"
    : createdDate.toLocaleDateString();

  return (
    <Card
      mode="outlined"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: radii.md,
      }}
    >
      <Card.Content style={{ gap: spacing.sm }}>
        <View style={[styles.cardHeading, { gap: spacing.sm }]}>
          <Text
            variant="titleMedium"
            onPress={onOpen}
            style={[styles.blogTitle, { color: colors.foreground }]}
          >
            {blog.title}
          </Text>
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

        <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
          By {blog.author?.name ?? "Unknown author"} · {dateLabel}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
          {blog.category?.title ?? "Uncategorized"}
        </Text>

        {blog.tags?.length ? (
          <View style={[styles.tags, { gap: spacing.xs }]}>
            {blog.tags.slice(0, 4).map((tag) => (
              <Chip key={tag} compact>
                {tag}
              </Chip>
            ))}
            {blog.tags.length > 4 ? (
              <Text
                variant="labelSmall"
                style={{ alignSelf: "center", color: colors.mutedForeground }}
              >
                +{blog.tags.length - 4}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Divider />
        <View style={[styles.actions, { gap: spacing.sm }]}>
          <Button
            mode="text"
            compact
            onPress={onOpen}
            icon="open-in-new"
            style={styles.actionButton}
          >
            View
          </Button>
          <View style={styles.actionSpacer} />
          <Button
            mode="outlined"
            compact
            onPress={onFeature}
            disabled={blog.status !== "published"}
            icon="star-outline"
            style={styles.actionButton}
          >
            Feature
          </Button>
          <Button
            mode="outlined"
            compact
            onPress={onUnpublish}
            disabled={blog.status !== "published"}
            textColor={colors.primary}
            icon="eye-off-outline"
            style={styles.actionButton}
          >
            Unpublish
          </Button>
        </View>
      </Card.Content>
    </Card>
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
  resultHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusDropdown: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusModal: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  statusMenu: {
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  statusMenuTitle: {
    marginBottom: 8,
  },
  statusOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  cardHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  blogTitle: {
    flex: 1,
  },
  tags: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actionButton: {
    marginVertical: 0,
  },
  actionSpacer: {
    flex: 1,
  },
});
