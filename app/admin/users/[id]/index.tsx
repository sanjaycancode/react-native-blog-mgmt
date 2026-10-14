import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { type Href, useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Menu,
  Text,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { adminApi } from "@/api/services/admin";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { AdminBlog, AdminUser } from "@/types/admin";

import { getErrorMessage } from "@/utils/errorMessage";

import { env } from "@/lib/config/env";

const BLOG_STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Unpublished", value: "unpublished" },
  { label: "Submitted for Review", value: "submitted" },
  { label: "Rejected", value: "rejected" },
] as const;

type BlogStatusFilter = (typeof BLOG_STATUS_FILTERS)[number]["value"];

const STATUS_PALETTE: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#dcfce7", fg: "#15803d" },
  featured: { bg: "#ede9fe", fg: "#6d28d9" },
  submitted: { bg: "#fef9c3", fg: "#a16207" },
  rejected: { bg: "#fee2e2", fg: "#b91c1c" },
  unpublished: { bg: "#f3f4f6", fg: "#374151" },
  draft: { bg: "#fef3c7", fg: "#b45309" },
};

const DANGER_COLOR = "#DC2626";

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getImageUri(value?: ProfileData["avatar"]) {
  if (!value) return undefined;

  if (typeof value === "object") {
    if (typeof value.url === "string" && value.url) return value.url;
    value = typeof value.key === "string" ? value.key : undefined;
  }
  if (typeof value !== "string" || !value) return undefined;
  if (/^(https?:|data:)/i.test(value)) return value;

  return `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/profile/${value.replace(/^\/+/, "")}`;
}

function getExternalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getExternalLabel(value: string) {
  try {
    return new URL(getExternalHref(value)).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = getParam(idParam);
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === "admin";

  const [user, setUser] = useState<AdminUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [blogsError, setBlogsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<BlogStatusFilter>("all");
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isAdmin, isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (!id || !isAdmin || isInitializing) return;

    let active = true;
    setLoading(true);
    setBlogsLoading(true);
    setError("");
    setBlogsError("");

    const load = async () => {
      const [userResult, profileResult, blogsResult] = await Promise.allSettled([
        adminApi.getUser(id),
        profileApi.getById(id),
        adminApi.listAllBlogs({ limit: 100 }),
      ]);

      if (!active) return;

      if (userResult.status === "rejected") {
        const statusCode = (
          userResult.reason as { response?: { status?: number } }
        )?.response?.status;
        setError(
          statusCode === 404 ? "User not found." : "Unable to load user details.",
        );
      } else {
        setUser(userResult.value.data.user);
      }

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.data.profile ?? null);
      }

      if (blogsResult.status === "fulfilled") {
        const allBlogs = blogsResult.value.data.result;
        if (Array.isArray(allBlogs)) {
          setBlogs(
            allBlogs.filter(
              (blog) => blog.author?._id === id && blog.status !== "draft",
            ),
          );
        } else {
          setBlogsError("The blog list response has an unexpected format.");
        }
      } else {
        setBlogsError(getErrorMessage(blogsResult.reason));
      }

      setLoading(false);
      setBlogsLoading(false);
      setRefreshing(false);
    };

    void load().catch((loadError: unknown) => {
      if (!active) return;
      setError(getErrorMessage(loadError));
      setLoading(false);
      setBlogsLoading(false);
      setRefreshing(false);
    });

    return () => {
      active = false;
    };
  }, [id, isAdmin, isInitializing, reloadKey]);

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
    setReloadKey((value) => value + 1);
  }, []);

  const filteredBlogs = useMemo(
    () =>
      statusFilter === "all"
        ? blogs
        : blogs.filter((blog) => blog.status === statusFilter),
    [blogs, statusFilter],
  );

  const activeStatusLabel =
    BLOG_STATUS_FILTERS.find((filter) => filter.value === statusFilter)?.label ??
    "All";
  const displayName = user?.name ?? "User";
  const avatarUri = getImageUri(profile?.avatar);
  const socialLinks = Object.entries(profile?.socialLinks ?? {}).filter(
    ([, value]) => Boolean(value),
  ) as [string, string][];

  const openExternal = useCallback(
    async (value: string) => {
      try {
        await Linking.openURL(getExternalHref(value));
      } catch {
        showToast("Unable to open this link.", "error");
      }
    },
    [showToast],
  );

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

  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
  };

  return (
    <AdminShell
      userName={currentUser?.name}
      onLogout={() => void handleLogout()}
    >
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
          compact
          style={styles.backButton}
          textColor={colors.mutedForeground}
          icon={({ color, size }) => (
            <Ionicons name="arrow-back" color={color} size={size} />
          )}
          onPress={() => router.replace("/admin/users" as Href)}
        >
          Users
        </Button>

        {loading ? (
          <View style={[styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Loading user...
            </Text>
          </View>
        ) : error ? (
          <Card mode="outlined" style={cardStyle}>
            <Card.Content style={[styles.state, { gap: spacing.md }]}>
              <Ionicons
                name="alert-circle-outline"
                size={36}
                color={DANGER_COLOR}
              />
              <Text
                variant="titleMedium"
                style={{ color: colors.foreground, textAlign: "center" }}
              >
                {error}
              </Text>
              <Button
                mode="outlined"
                icon={({ color, size }) => (
                  <Ionicons name="arrow-back" color={color} size={size} />
                )}
                onPress={() => router.replace("/admin/users" as Href)}
              >
                Back to Users
              </Button>
            </Card.Content>
          </Card>
        ) : user ? (
          <>
            {/* Profile card */}
            <Card mode="outlined" style={cardStyle}>
              <Card.Content style={{ gap: spacing.lg }}>
                <View style={[styles.profileHeading, { gap: spacing.md }]}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: colors.secondary,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityLabel={`${displayName} profile photo`}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarFallback,
                        {
                          backgroundColor: colors.secondary,
                          borderColor: colors.border,
                          borderRadius: radii.full,
                        },
                      ]}
                    >
                      <Text
                        variant="headlineMedium"
                        style={{
                          color: colors.secondaryForeground,
                          fontWeight: "700",
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: colors.primary,
                        fontWeight: "700",
                        letterSpacing: 1,
                      }}
                    >
                      USER PROFILE
                    </Text>
                    <View style={[styles.nameRow, { gap: spacing.xs }]}>
                      <Text
                        variant="headlineSmall"
                        style={{
                          color: colors.foreground,
                          fontWeight: "700",
                          flexShrink: 1,
                        }}
                      >
                        {displayName}
                      </Text>
                      {profile?.isVerified ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.primary}
                        />
                      ) : null}
                    </View>
                    {user.email ? (
                      <View style={[styles.emailRow, { gap: spacing.xs }]}>
                        <Ionicons
                          name="mail-outline"
                          size={14}
                          color={colors.mutedForeground}
                        />
                        <Text
                          variant="bodySmall"
                          selectable
                          style={{ color: colors.mutedForeground, flexShrink: 1 }}
                        >
                          {user.email}
                        </Text>
                      </View>
                    ) : null}
                    <Chip
                      compact
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor:
                          user.role === "admin"
                            ? colors.badgePrimaryBg
                            : colors.secondary,
                      }}
                      textStyle={{
                        color:
                          user.role === "admin"
                            ? colors.badgePrimaryText
                            : colors.secondaryForeground,
                        textTransform: "capitalize",
                      }}
                    >
                      {user.role ?? "user"}
                    </Chip>
                  </View>
                </View>

                {/* {profile?.bio || socialLinks.length > 0 ? (
                  <View
                    style={[
                      styles.profileDetails,
                      { borderColor: colors.border, gap: spacing.md },
                    ]}
                  >
                    {profile?.bio ? (
                      <View style={{ gap: spacing.xs }}>
                        <Text
                          variant="labelSmall"
                          style={{
                            color: colors.mutedForeground,
                            fontWeight: "700",
                            letterSpacing: 1,
                          }}
                        >
                          ABOUT
                        </Text>
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: colors.foreground,
                            lineHeight: 24,
                          }}
                        >
                          {profile.bio}
                        </Text>
                      </View>
                    ) : null}

                    {socialLinks.length > 0 ? (
                      <View style={[styles.socialLinks, { gap: spacing.sm }]}>
                        {socialLinks.map(([label, value]) => (
                          <Pressable
                            key={label}
                            accessibilityRole="link"
                            accessibilityLabel={`${label}: ${getExternalLabel(value)}`}
                            onPress={() => void openExternal(value)}
                            style={({ pressed }) => [
                              styles.socialLink,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                borderRadius: radii.md,
                                opacity: pressed ? 0.7 : 1,
                                paddingHorizontal: spacing.md,
                                paddingVertical: spacing.sm,
                                gap: spacing.xs,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                label === "instagram"
                                  ? "logo-instagram"
                                  : label === "facebook"
                                    ? "logo-facebook"
                                    : "globe-outline"
                              }
                              size={16}
                              color={colors.primary}
                            />
                            <Text
                              variant="labelMedium"
                              numberOfLines={1}
                              style={{ color: colors.foreground, flexShrink: 1 }}
                            >
                              {getExternalLabel(value)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.noProfile,
                      {
                        backgroundColor: colors.muted,
                        borderRadius: radii.md,
                        padding: spacing.md,
                        gap: spacing.xs,
                      },
                    ]}
                  >
                    <Text
                      variant="titleSmall"
                      style={{ color: colors.foreground }}
                    >
                      No profile details
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.mutedForeground, lineHeight: 21 }}
                    >
                      This user has not added any profile information yet.
                    </Text>
                  </View>
                )} */}
              </Card.Content>
            </Card>

            {/* Blogs */}
            <View style={{ gap: spacing.md }}>
              <View style={[styles.blogHeading, { gap: spacing.md }]}>
                <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
                  <Text
                    variant="titleLarge"
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    Blogs by {displayName}
                  </Text>
                  {!blogsLoading && !blogsError && blogs.length > 0 ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.mutedForeground }}
                    >
                      {statusFilter === "all"
                        ? `${blogs.length} ${blogs.length === 1 ? "blog" : "blogs"}`
                        : `${filteredBlogs.length} of ${blogs.length}`}
                    </Text>
                  ) : null}
                </View>
                <Menu
                  visible={statusMenuVisible}
                  onDismiss={() => setStatusMenuVisible(false)}
                  contentStyle={{ backgroundColor: colors.card }}
                  anchor={
                    <Button
                      mode="outlined"
                      compact
                      icon={({ color, size }) => (
                        <Ionicons
                          name="chevron-down"
                          color={color}
                          size={size}
                        />
                      )}
                      contentStyle={styles.filterButtonContent}
                      style={{
                        borderColor:
                          statusFilter === "all" ? colors.border : colors.primary,
                        borderRadius: radii.md,
                      }}
                      textColor={
                        statusFilter === "all" ? colors.foreground : colors.primary
                      }
                      onPress={() => setStatusMenuVisible(true)}
                    >
                      {activeStatusLabel}
                    </Button>
                  }
                >
                  {BLOG_STATUS_FILTERS.map((filter) => (
                    <Menu.Item
                      key={filter.value}
                      title={filter.label}
                      leadingIcon={
                        statusFilter === filter.value ? "check" : undefined
                      }
                      onPress={() => {
                        setStatusFilter(filter.value);
                        setStatusMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
              </View>

              {blogsLoading ? (
                <View style={{ gap: spacing.md }}>
                  <BlogCardSkeleton />
                  <BlogCardSkeleton />
                  <BlogCardSkeleton />
                </View>
              ) : blogsError ? (
                <Card mode="outlined" style={cardStyle}>
                  <Card.Content style={[styles.state, { gap: spacing.md }]}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={30}
                      color={DANGER_COLOR}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.foreground, textAlign: "center" }}
                    >
                      {blogsError}
                    </Text>
                    <Button
                      mode="outlined"
                      icon={({ color, size }) => (
                        <Ionicons
                          name="refresh-outline"
                          color={color}
                          size={size}
                        />
                      )}
                      onPress={() => setReloadKey((value) => value + 1)}
                    >
                      Retry
                    </Button>
                  </Card.Content>
                </Card>
              ) : blogs.length === 0 ? (
                <Card mode="outlined" style={cardStyle}>
                  <Card.Content style={[styles.state, { gap: spacing.sm }]}>
                    <Ionicons
                      name="document-text-outline"
                      size={32}
                      color={colors.mutedForeground}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.mutedForeground }}
                    >
                      No blogs found for this user.
                    </Text>
                  </Card.Content>
                </Card>
              ) : filteredBlogs.length === 0 ? (
                <Card mode="outlined" style={cardStyle}>
                  <Card.Content style={[styles.state, { gap: spacing.sm }]}>
                    <Ionicons
                      name="funnel-outline"
                      size={32}
                      color={colors.mutedForeground}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.mutedForeground }}
                    >
                      No {statusFilter} blogs.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {filteredBlogs.map((blog) => (
                    <UserBlogCard
                      key={blog._id}
                      blog={blog}
                      onOpen={() =>
                        router.push(`/admin/blog/${blog.slug}` as Href)
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </AdminShell>
  );
}

function UserBlogCard({
  blog,
  onOpen,
}: {
  blog: AdminBlog;
  onOpen: () => void;
}) {
  const { colors, spacing, radii, typography } = useTheme();
  const status = STATUS_PALETTE[blog.status] ?? {
    bg: colors.badgeBg,
    fg: colors.badgeText,
  };
  const dateLabel = formatDate(blog.createdAt) ?? "Date unavailable";

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
        accessibilityLabel={`Open blog: ${blog.title}`}
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
            name="folder-outline"
            size={13}
            color={colors.mutedForeground}
          />
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[styles.metaText, { color: colors.mutedForeground }]}
          >
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
          View
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
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
    marginBottom: -8,
  },
  loading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  state: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  profileHeading: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emailRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  profileDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  socialLinks: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  socialLink: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    maxWidth: "100%",
  },
  noProfile: {},
  blogHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  filterButtonContent: {
    flexDirection: "row-reverse",
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeleton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
});