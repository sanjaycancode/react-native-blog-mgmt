import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import BlogCard from "@/components/BlogCard";
import Navbar from "@/components/NavBar";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

import { blogApi } from "@/api/services";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog } from "@/types";
import { imgSrc } from "@/utils/getImgSrc";

const BLOG_BASE_URL = "http://localhost:8081/";

// Your theme has no "destructive" token, so errors use this fixed red.
const ERROR_COLOR = "#DC2626";

const STATUS_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
  { value: "submitted", label: "In review" },
  { value: "rejected", label: "Rejected" },
];

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram: "logo-instagram",
  facebook: "logo-facebook",
  website: "globe-outline",
};

function getStatusCode(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

function isProfileMissing(error: unknown): boolean {
  return (
    getStatusCode(error) === 400 ||
    getErrorMessage(error).toLowerCase().includes("doesn't exist")
  );
}

function getExternalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getLinkLabel(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0];
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [blogsError, setBlogsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("published");
  const [busyBlogId, setBusyBlogId] = useState<string | null>(null);

  const openWebsite = useCallback(async (path: string) => {
    try {
      await Linking.openURL(`${BLOG_BASE_URL}${path}`);
    } catch {
      Alert.alert(
        "Unable to open page",
        "Please check your connection and try again.",
      );
    }
  }, []);

  const openExternal = useCallback(async (value: string) => {
    try {
      await Linking.openURL(getExternalHref(value));
    } catch {
      Alert.alert("Unable to open link", "This link could not be opened.");
    }
  }, []);

  const loadData = useCallback(async () => {
    const [profileResult, blogsResult] = await Promise.allSettled([
      profileApi.get(),
      blogApi.myBlogs(),
    ]);

    // Not logged in (or session expired): go to login.
    if (
      (profileResult.status === "rejected" &&
        getStatusCode(profileResult.reason) === 401) ||
      (blogsResult.status === "rejected" &&
        getStatusCode(blogsResult.reason) === 401)
    ) {
      router.replace("/login");
      return;
    }

    if (profileResult.status === "fulfilled") {
      const nextProfile = profileResult.value.data.profile ?? null;
      setProfile(nextProfile);
      setProfileMissing(!nextProfile);
      setProfileError(null);
    } else if (isProfileMissing(profileResult.reason)) {
      setProfile(null);
      setProfileMissing(true);
      setProfileError(null);
    } else {
      setProfileError("Unable to load your profile.");
    }

    if (blogsResult.status === "fulfilled") {
      setBlogs(blogsResult.value.data.result ?? []);
      setBlogsError(null);
    } else {
      setBlogsError("Your blogs are unavailable right now.");
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadData().finally(() => setIsLoading(false));
    }, [loadData]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleDeleteBlog = (blogId: string) => {
    Alert.alert("Delete this blog?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyBlogId(blogId);
          try {
            await blogApi.delete(blogId);
            setBlogs((prev) => prev.filter((b) => b._id !== blogId));
          } catch (error) {
            Alert.alert("Couldn't delete blog", getErrorMessage(error));
          } finally {
            setBusyBlogId(null);
          }
        },
      },
    ]);
  };

  const handleUnpublishBlog = (blogId: string) => {
    Alert.alert(
      "Unpublish this blog?",
      "Readers won't be able to see it until you publish it again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpublish",
          onPress: async () => {
            setBusyBlogId(blogId);
            try {
              await blogApi.unpublish(blogId);
              setBlogs((prev) =>
                prev.map((b) =>
                  b._id === blogId
                    ? ({ ...b, status: "unpublished" } as Blog)
                    : b,
                ),
              );
            } catch (error) {
              Alert.alert("Couldn't unpublish blog", getErrorMessage(error));
            } finally {
              setBusyBlogId(null);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <Navbar />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.sizes.sm,
              marginTop: spacing.md,
            }}
          >
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const profileUser = profile?.user;
  const displayName = profileUser?.name ?? "Your profile";
  const publishedCount = blogs.filter(
    (blog) => String(blog.status) === "published",
  ).length;
  const draftsCount = blogs.filter(
    (blog) => String(blog.status) === "draft",
  ).length;
  const savedCount = (profile?.savedBlogs ?? []).filter(Boolean).length;
  const socialLinks = Object.entries(profile?.socialLinks ?? {}).filter(
    ([, value]) => Boolean(value),
  ) as [string, string][];
  const filteredBlogs = blogs.filter(
    (blog) => String(blog.status) === statusFilter,
  );
  const activeStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ??
    statusFilter;

  const renderEntryCard = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
    path: string,
  ) => (
    <Pressable
      onPress={() => void router.push(path)}
      accessibilityRole="button"
      style={{ marginTop: spacing.md }}
    >
      <Card
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          padding: spacing.lg,
        }}
      >
        <View style={styles.entryRow}>
          <View
            style={[
              styles.entryIcon,
              { backgroundColor: colors.secondary, borderRadius: radii.full },
            ]}
          >
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
                letterSpacing: 1,
              }}
            >
              PRIVATE
            </Text>
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </View>
      </Card>
    </Pressable>
  );

  const renderBlogAction = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    onPress: () => void,
    disabled: boolean,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.blogAction,
        {
          borderColor: colors.border,
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text
        style={{
          color,
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Navbar />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Profile card */}
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}>
          <Card
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              padding: spacing.xl,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={[styles.glow, { backgroundColor: colors.primary }]}
            />

            <View style={styles.profileHeader}>
              {profile?.avatar ? (
                <Image
                  source={{ uri: imgSrc(profile.avatar) }}
                  style={[styles.avatar, { borderColor: colors.border }]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.primaryForeground,
                      fontSize: typography.sizes["2xl"],
                      fontWeight: typography.weights.heavy,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: typography.sizes.xs,
                    fontWeight: typography.weights.bold,
                    letterSpacing: 1,
                  }}
                >
                  PROFILE
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.foreground,
                    fontSize: typography.sizes["2xl"],
                    fontWeight: typography.weights.heavy,
                    letterSpacing: -0.5,
                  }}
                >
                  {displayName}
                </Text>
                {!!profileUser?.email && (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.mutedForeground,
                      fontSize: typography.sizes.sm,
                    }}
                  >
                    {profileUser.email}
                  </Text>
                )}
                {profile?.isVerified && (
                  <View style={[styles.verifiedRow, { marginTop: spacing.xs }]}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography.sizes.sm,
                        fontWeight: typography.weights.semibold,
                      }}
                    >
                      Verified account
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button
                title="Edit profile"
                variant="outlined"
                onPress={() => void router.push("/profile/edit")}
                style={{ width: "100%" }}
              />
              <Button
                title="Analytics"
                variant="outlined"
                onPress={() => router.push("/profile/analytics")}
                style={{ width: "100%" }}
              />
            </View>

            {profileMissing ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    padding: spacing.lg,
                    marginTop: spacing.lg,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.secondaryForeground,
                    fontSize: typography.sizes.lg,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  Complete your profile
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.sm,
                    lineHeight: 20,
                    marginTop: spacing.xs,
                  }}
                >
                  Add a bio, website, and other details to tell people more
                  about you.
                </Text>
              </View>
            ) : (
              (!!profile?.bio || socialLinks.length > 0) && (
                <View
                  style={[
                    styles.about,
                    {
                      borderTopColor: colors.border,
                      marginTop: spacing.lg,
                      paddingTop: spacing.lg,
                    },
                  ]}
                >
                  {!!profile?.bio && (
                    <View>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.sizes.xs,
                          fontWeight: typography.weights.bold,
                          letterSpacing: 1,
                          marginBottom: spacing.xs,
                        }}
                      >
                        ABOUT
                      </Text>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: typography.sizes.base,
                          lineHeight: 24,
                        }}
                      >
                        {profile.bio}
                      </Text>
                    </View>
                  )}

                  {socialLinks.length > 0 && (
                    <View
                      style={[
                        styles.socialRow,
                        { marginTop: profile?.bio ? spacing.md : 0 },
                      ]}
                    >
                      {socialLinks.map(([label, value]) => (
                        <Pressable
                          key={label}
                          onPress={() => void openExternal(value)}
                          accessibilityRole="link"
                          style={[
                            styles.socialChip,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                              borderRadius: radii.full,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                            },
                          ]}
                        >
                          <Ionicons
                            name={SOCIAL_ICONS[label] ?? "link-outline"}
                            size={14}
                            color={colors.primary}
                          />
                          <Text
                            numberOfLines={1}
                            style={{
                              color: colors.foreground,
                              fontSize: typography.sizes.xs,
                              fontWeight: typography.weights.semibold,
                              maxWidth: 160,
                            }}
                          >
                            {getLinkLabel(value)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )
            )}

            {!!profileError && (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: ERROR_COLOR,
                    padding: spacing.md,
                    marginTop: spacing.lg,
                  },
                ]}
              >
                <Text
                  style={{
                    color: ERROR_COLOR,
                    fontSize: typography.sizes.sm,
                  }}
                >
                  {profileError}
                </Text>
              </View>
            )}
          </Card>

          {/* Private shortcuts */}
          {!blogsError &&
            renderEntryCard(
              "document-text-outline",
              "Drafts",
              draftsCount === 0
                ? "Your unfinished blogs will appear here."
                : `${draftsCount} unpublished ${draftsCount === 1 ? "blog" : "blogs"} waiting for you.`,
              "/profile/drafts",
            )}

          {renderEntryCard(
            "bookmark-outline",
            "Saved blogs",
            savedCount === 0
              ? "Blogs you save for later will appear here."
              : `${savedCount} saved ${savedCount === 1 ? "blog" : "blogs"} to read later.`,
            "/profile/saved",
          )}

          {!blogsError && publishedCount > 0 && (
            <Button
              title="Start writing"
              variant="filled"
              onPress={() => void openWebsite("/blog/create")}
              style={{ width: "100%", marginTop: spacing.md }}
            />
          )}
        </View>

        {/* Your blogs */}
        <View style={{ marginTop: spacing.xl }}>
          <View style={{ paddingHorizontal: spacing.xl }}>
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
                letterSpacing: 1,
                marginBottom: spacing.xs,
              }}
            >
              YOUR WORK
            </Text>
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes["2xl"],
                fontWeight: typography.weights.heavy,
                letterSpacing: -0.5,
              }}
            >
              Your blogs
            </Text>
          </View>

          {!blogsError && blogs.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: spacing.xl,
                marginVertical: spacing.md,
              }}
            >
              {STATUS_OPTIONS.map((option) => {
                const isSelected = statusFilter === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setStatusFilter(option.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.card,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        borderRadius: radii.full,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.sm,
                        marginRight: spacing.sm,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? colors.primaryForeground
                          : colors.foreground,
                        fontSize: typography.sizes.xs,
                        fontWeight: isSelected
                          ? typography.weights.bold
                          : typography.weights.medium,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View
            style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}
          >
            {blogsError ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: ERROR_COLOR,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text
                  style={{ color: ERROR_COLOR, fontSize: typography.sizes.sm }}
                >
                  {blogsError}
                </Text>
              </View>
            ) : blogs.length === 0 ? (
              <Card
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  padding: spacing.xl,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.secondaryForeground,
                    fontSize: typography.sizes.xl,
                    fontWeight: typography.weights.bold,
                    textAlign: "center",
                  }}
                >
                  No blogs yet
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.sm,
                    textAlign: "center",
                    lineHeight: 20,
                    marginTop: spacing.xs,
                    marginBottom: spacing.lg,
                  }}
                >
                  Start writing a blog when you are ready to share your ideas
                  with the community.
                </Text>
                <Button
                  title="Start writing"
                  variant="filled"
                  onPress={() => void openWebsite("/blogs/create")}
                  style={{ width: "100%" }}
                />
              </Card>
            ) : filteredBlogs.length === 0 ? (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                }}
              >
                No {activeStatusLabel.toLowerCase()} blogs.
              </Text>
            ) : (
              filteredBlogs.map((blog) => {
                const isBusy = busyBlogId === blog._id;
                return (
                  <View key={blog._id}>
                    <BlogCard
                      blog={{
                        id: blog._id,
                        title: blog.title,
                        excerpt: blog.description,
                        author: blog.author,
                        date: new Date(blog.createdAt).toLocaleDateString(),
                        category: blog.category?.title ?? "Uncategorized",
                        readTime: "Read story",
                        isFeatured: String(blog.status) === "featured",
                        image: blog.image,
                      }}
                      onPress={() => void openWebsite(`/blogs/${blog.slug}`)}
                    />
                    <View
                      style={[
                        styles.blogActions,
                        { gap: spacing.sm, marginBottom: spacing.md },
                      ]}
                    >
                      {String(blog.status) === "published" &&
                        renderBlogAction(
                          "Unpublish",
                          "eye-off-outline",
                          colors.foreground,
                          () => handleUnpublishBlog(blog._id),
                          isBusy,
                        )}
                      {renderBlogAction(
                        "Delete",
                        "trash-outline",
                        ERROR_COLOR,
                        () => handleDeleteBlog(blog._id),
                        isBusy,
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  glow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.1,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 14,
  },
  about: {
    borderTopWidth: 1,
  },
  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  entryIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    borderWidth: 1,
  },
  blogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  blogAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
});
