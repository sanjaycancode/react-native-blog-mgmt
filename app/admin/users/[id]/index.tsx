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
        
        {loading ? (
          <View style={[styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Loading user...
            </Text>
          </View>
        ) : error ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
            }}
          >
            <Card.Content style={[styles.state, { gap: spacing.md }]}>
              <Ionicons
                name="alert-circle-outline"
                size={36}
                color={colors.primary}
              />
              <Text
                variant="titleMedium"
                style={{ color: colors.foreground, textAlign: "center" }}
              >
                {error}
              </Text>
              <Button
                mode="outlined"
                onPress={() =>  router.replace("/admin/users" as Href)}
              >
                Back to Users
              </Button>
            </Card.Content>
          </Card>
        ) : user ? (
          <>
            <Card
              mode="outlined"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.md,
              }}
            >
              <Card.Content style={{ gap: spacing.lg }}>
                <View style={[styles.profileHeading, { gap: spacing.md }]}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.secondary },
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
                        style={{ color: colors.foreground, fontWeight: "700" }}
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
                      <Text
                        variant="bodySmall"
                        selectable
                        style={{ color: colors.mutedForeground }}
                      >
                        {user.email}
                      </Text>
                    ) : null}
                    <Chip
                      compact
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: colors.secondary,
                      }}
                      textStyle={{
                        color: colors.secondaryForeground,
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

            <View style={{ gap: spacing.md }}>
              <View style={[styles.blogHeading, { gap: spacing.md }]}>
                <Text
                  variant="titleLarge"
                  style={{ color: colors.foreground, flex: 1 }}
                >
                  Blogs by {displayName}
                </Text>
                <Menu
                  visible={statusMenuVisible}
                  onDismiss={() => setStatusMenuVisible(false)}
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
                <View style={[styles.loading, { gap: spacing.md }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.mutedForeground }}
                  >
                    Loading blogs...
                  </Text>
                </View>
              ) : blogsError ? (
                <Card
                  mode="outlined"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  }}
                >
                  <Card.Content style={[styles.state, { gap: spacing.md }]}>
                    <Text
                      variant="bodyMedium"
                      style={{ color: colors.foreground, textAlign: "center" }}
                    >
                      {blogsError}
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setReloadKey((value) => value + 1)}
                    >
                      Retry
                    </Button>
                  </Card.Content>
                </Card>
              ) : blogs.length === 0 ? (
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.mutedForeground }}
                >
                  No blogs found for this user.
                </Text>
              ) : filteredBlogs.length === 0 ? (
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.mutedForeground }}
                >
                  No {statusFilter} blogs.
                </Text>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {filteredBlogs.map((blog) => (
                    console.log(blog._id, typeof blog.title, typeof blog.description, typeof blog.image, blog.image),
                    <Pressable
                      key={blog._id}
                      accessibilityRole="link"
                      accessibilityLabel={`Open blog: ${blog.title}`}
                      onPress={() =>
                        router.push(
                          `/admin/blog/${(blog.slug)}` as Href,
                        )
                      }
                    >
                      <Card
                        mode="outlined"
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderRadius: radii.md,
                        }}
                      >
                        <Card.Content style={{ gap: spacing.sm }}>
                          <Text
                            variant="titleMedium"
                            style={{ color: colors.foreground }}
                          >
                            {blog.title}
                          </Text>
                          <View style={[styles.blogMeta, { gap: spacing.sm }]}>
                            <Chip
                              compact
                              style={{ backgroundColor: colors.secondary }}
                              textStyle={{ color: colors.secondaryForeground }}
                            >
                              {blog.category?.title ?? "Uncategorized"}
                            </Chip>
                            <Chip
                              compact
                              style={{ backgroundColor: colors.muted }}
                              textStyle={{
                                color: colors.mutedForeground,
                                textTransform: "capitalize",
                              }}
                            >
                              {blog.status}
                            </Chip>
                            {formatDate(blog.createdAt) ? (
                              <Text
                                variant="bodySmall"
                                style={{ color: colors.mutedForeground }}
                              >
                                {formatDate(blog.createdAt)}
                              </Text>
                            ) : null}
                          </View>
                        </Card.Content>
                      </Card>
                    </Pressable>
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
  blogMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
