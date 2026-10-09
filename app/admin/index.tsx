import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  ProgressBar,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { adminApi } from "@/api/services/admin";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import type { Blog } from "@/types/blog";
import type { Category } from "@/types/category";

import { getErrorMessage } from "@/utils/errorMessage";

const BLOG_LIMIT = 100;
const STATUSES = ["published", "unpublished", "submitted", "rejected"] as const;

type DashboardStats = {
  totalBlogs: number;
  published: number;
  totalUsers: number;
  totalCategories: number;
};

type BarEntry = {
  label: string;
  value: number;
};

export default function AdminOverview() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const [blogsResponse, usersResponse, categoriesResponse] =
        await Promise.all([
          adminApi.listAllBlogs({ limit: BLOG_LIMIT }),
          adminApi.listUsers(),
          categoryApi.list(),
        ]);
      const nextBlogs = blogsResponse.data.result;
      const nextCategories = categoriesResponse.data.result;
    const totalUsers = Array.isArray(usersResponse) ? usersResponse.length : 0
      if (!Array.isArray(nextBlogs) || !Array.isArray(nextCategories)) {
        throw new Error("The admin dashboard response has an unexpected format.");
      }

      setBlogs(nextBlogs);
      setTotalBlogs(blogsResponse.data.meta?.totalBlogs ?? nextBlogs.length);
      setTotalUsers(usersResponse.data.length);
      setCategories(nextCategories);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }

    void loadDashboard();
  }, [isAdmin, isAuthenticated, isInitializing, loadDashboard, router]);

  const stats = useMemo<DashboardStats>(
    () => ({
      totalBlogs,
      published: blogs.filter((blog) => blog.status === "published").length,
      totalUsers,
      totalCategories: categories.length,
    }),
    [blogs, categories.length, totalBlogs, totalUsers],
  );

  const blogsByCategory = useMemo<BarEntry[]>(() => {
    const counts = new Map(categories.map((category) => [category.title, 0]));
    blogs.forEach((blog) => {
      const categoryTitle = blog.category?.title;
      if (categoryTitle && counts.has(categoryTitle)) {
        counts.set(categoryTitle, (counts.get(categoryTitle) ?? 0) + 1);
      }
    });
    return Array.from(counts, ([label, value]) => ({ label, value }));
  }, [blogs, categories]);

  const blogsByStatus = useMemo<BarEntry[]>(
    () => {
      const counts = new Map<string, number>(
        STATUSES.map((status) => [status, 0]),
      );
      blogs.forEach((blog) => {
        counts.set(blog.status, (counts.get(blog.status) ?? 0) + 1);
      });
      return Array.from(counts, ([label, value]) => ({ label, value }));
    },
    [blogs],
  );

  const submittedBlogs = useMemo(
    () => blogs.filter((blog) => blog.status === "submitted"),
    [blogs],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard();
  }, [loadDashboard]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      setError(getErrorMessage(logoutError));
    }
  }, [logout, router]);

  if (isInitializing || !isAuthenticated || !isAdmin) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.loading,
            { gap: spacing.md, paddingVertical: spacing["3xl"] },
          ]}
        >
          <ActivityIndicator />
          <Text variant="bodyMedium">Checking administrator access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Appbar.Header
        mode="small"
        elevated
        style={{ backgroundColor: colors.card }}
      >
        <Appbar.Content
          title="Admin overview"
          subtitle={user?.name ? `Welcome, ${user.name}` : undefined}
        />
        <Appbar.Action
          accessibilityLabel="Log out"
          icon={({ color, size }) => (
            <Ionicons name="log-out-outline" color={color} size={size} />
          )}
          onPress={() => void handleLogout()}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing["4xl"],
          gap: spacing.lg,
        }}
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
        <View>
          <Text variant="headlineSmall" style={{ color: colors.foreground }}>
            Dashboard
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: colors.mutedForeground, marginTop: spacing.xs }}
          >
            Manage content and review activity across the community.
          </Text>
        </View>

        {error ? (
          <Card
            mode="outlined"
            style={[
              styles.errorCard,
              { borderColor: colors.primary, borderRadius: radii.md },
            ]}
          >
            <Card.Content style={{ gap: spacing.sm }}>
              <Text variant="bodyMedium" style={{ color: colors.primary }}>
                Unable to load dashboard data: {error}
              </Text>
              <Button
                mode="outlined"
                onPress={() => {
                  setLoading(true);
                  void loadDashboard();
                }}
              >
                Retry
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {loading ? (
          <View
            style={[
              styles.loading,
              { gap: spacing.md, paddingVertical: spacing["3xl"] },
            ]}
          >
            <ActivityIndicator />
            <Text variant="bodyMedium">Loading dashboard data...</Text>
          </View>
        ) : (
          <>
            <View style={[styles.statsGrid, { gap: spacing.sm }]}>
              <StatCard label="Total blogs" value={stats.totalBlogs} />
              <StatCard label="Published" value={stats.published} />
              <StatCard label="Total users" value={stats.totalUsers} />
              <StatCard label="Categories" value={stats.totalCategories} />
            </View>

            <View style={{ gap: spacing.md }}>
              <Text variant="titleLarge">Analytics</Text>
              <ChartCard title="Blogs per category" entries={blogsByCategory} />
              <ChartCard title="Blogs by status" entries={blogsByStatus} />
            </View>

            <View style={{ gap: spacing.md }}>
              <View style={[styles.sectionHeading, { gap: spacing.sm }]}>
                <Text variant="titleLarge">New blogs to review</Text>
                <Chip compact>{submittedBlogs.length} pending</Chip>
              </View>
              {submittedBlogs.length === 0 ? (
                <Card mode="outlined">
                  <Card.Content>
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.mutedForeground }}
                    >
                      No blogs waiting for review.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                submittedBlogs.map((blog) => (
                  <Card key={blog._id} mode="outlined">
                    <Card.Content style={{ gap: spacing.sm }}>
                      <Text variant="titleMedium">{blog.title}</Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.mutedForeground }}
                      >
                        By {blog.author?.name ?? "Unknown author"}
                      </Text>
                      <View style={[styles.reviewMeta, { gap: spacing.sm }]}>
                        <Chip compact>
                          {blog.category?.title ?? "Uncategorized"}
                        </Chip>
                        <Chip compact>{blog.status}</Chip>
                      </View>
                    </Card.Content>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Card
      mode="outlined"
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderRadius: radii.md },
      ]}
    >
      <Card.Content style={{ gap: spacing.xs }}>
        <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
          {label}
        </Text>
        <Text variant="headlineSmall" style={{ color: colors.foreground }}>
          {value}
        </Text>
      </Card.Content>
    </Card>
  );
}

function ChartCard({
  title,
  entries,
}: {
  title: string;
  entries: BarEntry[];
}) {
  const { colors, spacing, radii } = useTheme();
  const maxValue = Math.max(...entries.map((entry) => entry.value), 1);

  return (
    <Card mode="outlined" style={{ backgroundColor: colors.card }}>
      <Card.Content style={{ gap: spacing.md }}>
        <Text variant="titleMedium">{title}</Text>
        {entries.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
            No data available.
          </Text>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.label}
              style={[styles.chartRow, { gap: spacing.sm }]}
            >
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={[styles.chartLabel, { color: colors.foreground }]}
              >
                {entry.label}
              </Text>
              <ProgressBar
                progress={entry.value / maxValue}
                color={colors.primary}
                style={[
                  styles.progress,
                  {
                    backgroundColor: colors.muted,
                    height: spacing.xs,
                    borderRadius: radii.full,
                  },
                ]}
              />
              <Text
                variant="labelMedium"
                style={[styles.chartValue, { color: colors.mutedForeground }]}
              >
                {entry.value}
              </Text>
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48.5%",
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    borderWidth: 1,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  reviewMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chartRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  chartLabel: {
    width: 96,
    textTransform: "capitalize",
  },
  progress: {
    flex: 1,
  },
  chartValue: {
    minWidth: 24,
    textAlign: "right",
  },
});