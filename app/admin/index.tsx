import { useCallback, useEffect, useMemo, useState } from "react";
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
  Chip,
  Divider,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { AdminShell } from "@/app/admin/AdminShell";

import { adminApi } from "@/api/services/admin";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import type { Blog } from "@/types/blog";
import type { Category } from "@/types/category";

import { getErrorMessage } from "@/utils/errorMessage";

const BLOG_LIMIT = 100;
const STATUSES = ["published", "unpublished", "submitted", "rejected"] as const;

const STATUS_PALETTE: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#dcfce7", fg: "#15803d" },
  featured: { bg: "#ede9fe", fg: "#6d28d9" },
  submitted: { bg: "#fef9c3", fg: "#a16207" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  unpublished: { bg: "#f3f4f6", fg: "#374151" },
  draft: { bg: "#fef3c7", fg: "#b45309" },
};

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
      if (!Array.isArray(nextBlogs) || !Array.isArray(nextCategories)) {
        throw new Error(
          "The admin dashboard response has an unexpected format.",
        );
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
  }, [user, isAdmin, isInitializing, loadDashboard, router]);

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

  const blogsByStatus = useMemo<BarEntry[]>(() => {
    const counts = new Map<string, number>(
      STATUSES.map((status) => [status, 0]),
    );
    blogs.forEach((blog) => {
      counts.set(blog.status, (counts.get(blog.status) ?? 0) + 1);
    });
    return Array.from(counts, ([label, value]) => ({ label, value }));
  }, [blogs]);

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
    <AdminShell userName={user?.name} onLogout={() => void handleLogout()}>
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
          <Text
            variant="headlineSmall"
            style={{ color: colors.foreground, fontSize: 20, fontWeight: 600 }}
          >
            Dashboard
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
              <StatCard
                label="Total blogs"
                value={stats.totalBlogs}
                onPress={() => router.push("/admin/blog" as Href)}
              />
              <StatCard
                label="Published"
                value={stats.published}
                onPress={() => router.push("/admin/blog" as Href)}
              />
              <StatCard
                label="Total users"
                value={stats.totalUsers}
                onPress={() => router.push("/admin/users" as Href)}
              />
              <StatCard
                label="Categories"
                value={stats.totalCategories}
                onPress={() => router.push("/admin/category" as Href)}
              />
            </View>

            <View style={{ gap: spacing.md }}>
              <Text
                variant="titleLarge"
                style={{ fontSize: 20, fontWeight: 600 }}
              >
                Analytics
              </Text>
              <CategoryDonutChart data={blogsByCategory} />
              <StatusBarChart data={blogsByStatus} />
            </View>

            <View style={{ gap: spacing.md }}>
              <View style={[styles.sectionHeading, { gap: spacing.sm }]}>
                <Text
                  variant="titleLarge"
                  style={{ fontSize: 20, fontWeight: 600 }}
                >
                  New blogs to review
                </Text>
                <Chip
                  mode="outlined"
                  compact
                  textStyle={{ color: colors.foreground }}
                >
                  {submittedBlogs.length} pending
                </Chip>
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
                  <ReviewBlogCard
                    key={blog._id}
                    blog={blog}
                    onOpen={() =>
                      router.push(
                        `/admin/blog/${encodeURIComponent(blog.slug)}` as Href,
                      )
                    }
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </AdminShell>
  );
}

function ReviewBlogCard({
  blog,
  onOpen,
}: {
  blog: Blog;
  onOpen: () => void;
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
        accessibilityRole="link"
        accessibilityLabel={`Review ${blog.title}`}
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
          { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
        ]}
      >
        <Button mode="text" compact onPress={onOpen} icon="open-in-new">
          Review
        </Button>
      </View>
    </Card>
  );
}

function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Open related admin page.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCardPressable,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Card
        style={[
          styles.statCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        <Card.Content style={styles.statCardContent}>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: colors.mutedForeground, flexShrink: 1 }}
          >
            {label}
          </Text>
          <Text
            variant="titleLarge"
            style={{ color: colors.foreground, fontWeight: "700" }}
          >
            {value}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

function CategoryDonutChart({ data }: { data: BarEntry[] }) {
  const { colors, spacing } = useTheme();
  const size = 176;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const palette = [
    colors.primary,
    colors.accent,
    colors.secondaryForeground,
    colors.primaryHover,
    colors.mutedForeground,
  ];

  let offset = 0;
  const segments = data.map((entry, index) => {
    const length = total > 0 ? (entry.value / total) * circumference : 0;
    const segment = {
      ...entry,
      color: palette[index % palette.length],
      length,
      offset,
    };
    offset += length;
    return segment;
  });

  return (
    <Card mode="outlined" style={{ backgroundColor: colors.card }}>
      <Card.Content style={{ gap: spacing.md }}>
        <Text variant="titleMedium">Blogs per category</Text>
        {data.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
            No data available.
          </Text>
        ) : (
          <>
            <View style={[styles.donutWrap, { width: size, height: size }]}>
              <Svg width={size} height={size}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={colors.muted}
                  strokeWidth={stroke}
                />
                {segments.map((segment) =>
                  segment.length > 0 ? (
                    <Path
                      key={segment.label}
                      d={getDonutSegmentPath(
                        segment.offset,
                        segment.length,
                        circumference,
                        size / 2,
                        radius + stroke / 2,
                        radius - stroke / 2,
                      )}
                      fill={segment.color}
                    />
                  ) : null,
                )}
              </Svg>
              <View style={styles.donutCenter} pointerEvents="none">
                <Text variant="headlineSmall">{total}</Text>
                <Text
                  variant="labelMedium"
                  style={{ color: colors.mutedForeground }}
                >
                  blogs
                </Text>
              </View>
            </View>
            <View style={{ gap: spacing.sm }}>
              {segments.map((segment) => (
                <View
                  key={segment.label}
                  style={[styles.legendRow, { gap: spacing.sm }]}
                >
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: segment.color },
                    ]}
                  />
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={[styles.legendLabel, { color: colors.foreground }]}
                  >
                    {segment.label}
                  </Text>
                  <Text
                    variant="labelMedium"
                    style={{ color: colors.mutedForeground }}
                  >
                    {segment.value}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.legendPercent,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {total > 0
                      ? `${Math.round((segment.value / total) * 100)}%`
                      : "0%"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

function getDonutSegmentPath(
  offset: number,
  length: number,
  circumference: number,
  center: number,
  outerRadius: number,
  innerRadius: number,
) {
  const startAngle = (offset / circumference) * Math.PI * 2 - Math.PI / 2;
  const sweepAngle = (length / circumference) * Math.PI * 2;
  const point = (angle: number, radius: number) => ({
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  });
  const outerStart = point(startAngle, outerRadius);
  const innerStart = point(startAngle, innerRadius);

  if (sweepAngle >= Math.PI * 2 - 0.0001) {
    const outerMid = point(startAngle + Math.PI, outerRadius);
    const innerMid = point(startAngle + Math.PI, innerRadius);
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${outerMid.x} ${outerMid.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${outerStart.x} ${outerStart.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${innerMid.x} ${innerMid.y}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  }

  const endAngle = startAngle + sweepAngle;
  const outerEnd = point(endAngle, outerRadius);
  const innerEnd = point(endAngle, innerRadius);
  const largeArc = sweepAngle > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function StatusBarChart({ data }: { data: BarEntry[] }) {
  const { colors, spacing } = useTheme();
  const chartHeight = 148;
  const barMaxHeight = chartHeight - 24;
  const maxValue = Math.max(1, ...data.map((entry) => entry.value));
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <Card mode="outlined" style={{ backgroundColor: colors.card }}>
      <Card.Content style={{ gap: spacing.md }}>
        <Text variant="titleMedium">Blogs by status</Text>
        {data.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
            No data available.
          </Text>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <View style={styles.barChartRow}>
              <View
                style={[
                  styles.barAxis,
                  { height: chartHeight, marginRight: spacing.xs },
                ]}
              >
                {ticks.map((tick) => (
                  <Text
                    key={tick}
                    variant="labelSmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    {Math.round(maxValue * tick)}
                  </Text>
                ))}
              </View>
              <View
                style={[
                  styles.barPlot,
                  { height: chartHeight, borderBottomColor: colors.border },
                ]}
              >
                {ticks.slice(0, -1).map((tick) => (
                  <View
                    key={tick}
                    pointerEvents="none"
                    style={[
                      styles.barGridLine,
                      {
                        top: `${(1 - tick) * 100}%`,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                ))}
                <View style={styles.barColumns}>
                  {data.map((entry) => {
                    const barHeight = (entry.value / maxValue) * barMaxHeight;
                    return (
                      <View key={entry.label} style={styles.barColumn}>
                        {entry.value > 0 ? (
                          <Text
                            variant="labelSmall"
                            style={{
                              color: colors.foreground,
                              marginBottom: spacing.xs,
                            }}
                          >
                            {entry.value}
                          </Text>
                        ) : null}
                        <View
                          style={[
                            styles.bar,
                            {
                              height: barHeight,
                              minHeight: entry.value > 0 ? 3 : 0,
                              maxWidth: 36,
                              backgroundColor: colors.primary,
                              borderTopLeftRadius: spacing.xs,
                              borderTopRightRadius: spacing.xs,
                            },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={styles.barLabels}>
              {data.map((entry) => (
                <Text
                  key={entry.label}
                  numberOfLines={1}
                  variant="labelSmall"
                  style={[styles.barLabel, { color: colors.mutedForeground }]}
                >
                  {entry.label}
                </Text>
              ))}
            </View>
          </View>
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
  statCardPressable: {
    width: "48.5%",
  },
  statCard: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
  },
  statCardContent: {
    minHeight: 88,
    justifyContent: "space-between",
    gap: 8,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  donutCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
  },
  legendPercent: {
    minWidth: 40,
    textAlign: "right",
  },
  barChartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  barAxis: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  barPlot: {
    flex: 1,
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    position: "relative",
  },
  barGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barColumns: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  barColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "58%",
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  barLabel: {
    flex: 1,
    textAlign: "center",
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

  // Review card (matches the admin blogs page card)
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
});