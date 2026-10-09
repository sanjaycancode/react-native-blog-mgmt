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

import { useAuth } from "@/context/AuthContext"; // adjust to where your AuthContext lives

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog } from "@/types";

const BLOG_BASE_URL = "http://localhost:8081/";

// Your theme has no "destructive" token, so errors use this fixed red.
const ERROR_COLOR = "#DC2626";

// There's no native editor yet, so drafts open in the website's editor.
// Change this if your web edit route is different.
const draftEditPath = (blog: Blog) => `/blogs/${blog._id}/edit`;

export default function DraftsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { isAuthenticated, isInitializing, session } = useAuth();

  const [blogs, setBlogs] = useState<Blog[]>([]);
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

  const loadDrafts = useCallback(async () => {
    try {
      // myBlogs only returns the logged-in user's blogs, so drafts stay private.
      const response = await blogApi.myBlogs();
      setBlogs(response.data.result ?? []);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  // Wait for the saved session, then load. Logged-out users go to login.
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    void loadDrafts().finally(() => setIsLoading(false));
  }, [isInitializing, isAuthenticated, loadDrafts, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDrafts();
    setIsRefreshing(false);
  }, [loadDrafts]);

  const drafts = useMemo(
    () =>
      blogs
        .filter((blog) => String(blog.status) === "draft")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [blogs],
  );

  const handleDelete = (blogId: string) => {
    Alert.alert("Delete this draft?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyBlogId(blogId);
          try {
            await blogApi.delete(blogId);
            setBlogs((prev) => prev.filter((b) => b._id !== blogId));
          } catch (err) {
            Alert.alert("Couldn't delete draft", getErrorMessage(err));
          } finally {
            setBusyBlogId(null);
          }
        },
      },
    ]);
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
            Loading your drafts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  const authorName = session?.user?.name ?? "You";

  const renderAction = (
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
        styles.action,
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
        {/* Header */}
        <View style={[styles.header, { padding: spacing.xl }]}>
          <View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: colors.primary }]}
          />

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
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={colors.primary}
            />
            <Text
              style={{
                color: colors.secondaryForeground,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.semibold,
              }}
            >
              Only visible to you
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
            Your <Text style={{ color: colors.primary }}>drafts.</Text>
          </Text>

          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.sizes.base,
              lineHeight: 24,
              marginTop: spacing.md,
            }}
          >
            {drafts.length === 0
              ? "Unfinished blogs will show up here until you publish them."
              : `${drafts.length} unpublished ${drafts.length === 1 ? "blog" : "blogs"} waiting for you to finish.`}
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
          ) : drafts.length === 0 ? (
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
                No drafts yet
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
                Start a blog and save it for later. It'll wait for you here.
              </Text>
              <Button
                title="Start writing"
                variant="filled"
                onPress={() => void openWebsite("/blogs/create")}
                style={{ width: "100%" }}
              />
            </Card>
          ) : (
            drafts.map((blog) => {
              const isBusy = busyBlogId === blog._id;
              return (
                <View key={blog._id}>
                  <BlogCard
                    blog={{
                      _id: blog._id,
                      title: blog.title,
                      excerpt: blog.description,
                      author: blog.author,
                      date: new Date(blog.createdAt).toLocaleDateString(),
                      category: blog.category,
                      readTime: "Draft",
                      isFeatured: false,
                    }}
                    onPress={() =>
                      void router.push(`/profile/drafts/${blog.slug}`)
                    }
                  />
                  <View
                    style={[
                      styles.actions,
                      { gap: spacing.sm, marginBottom: spacing.md },
                    ]}
                  >
                    {renderAction(
                      "Continue writing",
                      "create-outline",
                      colors.primary,
                      () => void router.push(`/blog/${blog.slug}/edit`),
                      isBusy,
                    )}
                    {renderAction(
                      "Delete",
                      "trash-outline",
                      ERROR_COLOR,
                      () => handleDelete(blog._id),
                      isBusy,
                    )}
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
  glow: {
    position: "absolute",
    right: -50,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.12,
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
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
});
