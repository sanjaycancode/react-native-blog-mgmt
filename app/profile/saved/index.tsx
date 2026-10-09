import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import BlogCard from "@/components/BlogCard";
import Navbar from "@/components/NavBar";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

import { blogApi } from "@/api/services/blog";
import { profileApi } from "@/api/services/profile";

import { useAuth } from "@/context/AuthContext"; // adjust to where your AuthContext lives

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { ApiError } from "@/api/client";
import type { Blog } from "@/types";

const BLOG_BASE_URL = "http://localhost:8081/";

// Your theme has no "destructive" token, so errors use this fixed red.
const ERROR_COLOR = "#DC2626";

/** savedBlogs can contain null for blogs that were deleted, so keep real blogs only. */
function toBlogs(entries: unknown[] | undefined): Blog[] {
  return (entries ?? []).filter(
    (entry): entry is Blog =>
      typeof entry === "object" && entry !== null && "_id" in entry,
  );
}

export default function SavedScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { isAuthenticated, isInitializing } = useAuth();

  const [saved, setSaved] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const loadSaved = useCallback(async () => {
    try {
      const response = await profileApi.get();
      setSaved(toBlogs(response.data.profile?.savedBlogs));
      setError(null);
    } catch (err) {
      // A user who hasn't created a profile yet simply has nothing saved.
      if ((err as ApiError | undefined)?.statusCode === 400) {
        setSaved([]);
        setError(null);
      } else {
        setError(getErrorMessage(err));
      }
    }
  }, []);

  // Wait for the saved session, then load. Logged-out users go to login.
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    void loadSaved().finally(() => setIsLoading(false));
  }, [isInitializing, isAuthenticated, loadSaved, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSaved();
    setIsRefreshing(false);
  }, [loadSaved]);

  // Newest saves are usually last in the array, so show them first.
  const blogs = useMemo(() => [...saved].reverse(), [saved]);

  const handleUnsave = async (blog: Blog) => {
    const previous = saved;
    setBusyBlogId(blog._id);
    setSaved((prev) => prev.filter((b) => b._id !== blog._id)); // optimistic
    try {
      await blogApi.unsave(blog._id);
    } catch (err) {
      setSaved(previous);
      Alert.alert("Couldn't remove from saved", getErrorMessage(err));
    } finally {
      setBusyBlogId(null);
    }
  };

  if (isInitializing || isLoading) {
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
            Loading your saved blogs...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

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
        {/* Header */}
        <View style={[styles.header, { padding: spacing.xl }]}>
          <View pointerEvents="none" style={styles.bookmarkArt}>
            <Ionicons name="bookmark" size={150} color={colors.primary} />
          </View>

          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Ionicons name="bookmark" size={14} color={colors.primary} />
            <Text
              style={{
                color: colors.secondaryForeground,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.semibold,
              }}
            >
              Your reading list
            </Text>
          </View>

          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.sizes["3xl"],
              fontWeight: typography.weights.heavy,
              lineHeight: 38,
              letterSpacing: -0.5,
            }}
          >
            Saved for <Text style={{ color: colors.primary }}>later.</Text>
          </Text>

          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.sizes.base,
              lineHeight: 24,
              marginTop: spacing.md,
            }}
          >
            {blogs.length === 0
              ? "Blogs you bookmark will wait for you here."
              : `${blogs.length} ${blogs.length === 1 ? "story" : "stories"} bookmarked and ready when you are.`}
          </Text>
        </View>

        {/* List */}
        <View style={{ paddingHorizontal: spacing.xl }}>
          {error ? (
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
                {error}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.xs,
                  marginTop: spacing.xs,
                }}
              >
                Pull down to try again.
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
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={26}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{
                  color: colors.secondaryForeground,
                  fontSize: typography.sizes.xl,
                  fontWeight: typography.weights.bold,
                  textAlign: "center",
                }}
              >
                Nothing saved yet
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
                Tap the bookmark on any story to keep it here for later.
              </Text>
              <Button
                title="Browse blogs"
                variant="filled"
                onPress={() => router.push("/")}
                style={{ width: "100%" }}
              />
            </Card>
          ) : (
            blogs.map((blog) => {
              const isBusy = busyBlogId === blog._id;
              return (
                <View key={blog._id}>
                  <BlogCard
                    blog={{
                      id: blog._id,
                      title: blog.title,
                      excerpt: blog.description,
                      author:
                        blog.author?.name ??
                        blog.author?.email ??
                        "Nepal Can writer",
                      date: new Date(blog.createdAt).toLocaleDateString(),
                      category: blog.category?.title ?? "Uncategorized",
                      readTime: "Read story",
                      isFeatured: String(blog.status) === "featured",
                    }}
                    onPress={() => void openWebsite(`/blogs/${blog.slug}`)}
                  />
                  <View
                    style={[
                      styles.savedRow,
                      {
                        marginBottom: spacing.md,
                        paddingHorizontal: spacing.xs,
                      },
                    ]}
                  >
                    <View style={styles.savedLabel}>
                      <Ionicons
                        name="bookmark"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: typography.sizes.xs,
                          fontWeight: typography.weights.semibold,
                        }}
                      >
                        Saved
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => void handleUnsave(blog)}
                      disabled={isBusy}
                      accessibilityRole="button"
                      style={[
                        styles.removeButton,
                        {
                          borderColor: colors.border,
                          borderRadius: radii.full,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.xs,
                          opacity: isBusy ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="bookmark-outline"
                        size={14}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.sizes.xs,
                          fontWeight: typography.weights.semibold,
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
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
  header: {
    position: "relative",
    overflow: "hidden",
  },
  bookmarkArt: {
    position: "absolute",
    right: -10,
    top: -14,
    opacity: 0.08,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 14,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savedLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
});
