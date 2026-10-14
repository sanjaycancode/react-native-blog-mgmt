import { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import GridFeed from "@/components/home/GridFeed";
import LogoLoader from "@/components/LogoLoader";
import { ThemedText } from "@/components/ThemedText";

import { blogApi } from "@/api/services";
import { profileApi } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog } from "@/types";

function isBlog(value: unknown): value is Blog {
  return typeof value === "object" && value !== null && "_id" in value;
}

export default function SavedBlogsScreen() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const [savedBlogs, setSavedBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyBlogId, setBusyBlogId] = useState<string | null>(null);

  const loadSavedBlogs = useCallback(async () => {
    try {
      const response = await profileApi.get();
      const entries = response.data.profile?.savedBlogs ?? [];
      const ids = entries.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0,
      );
      const populated = entries.filter(isBlog);
      const resolved = await Promise.allSettled(
        ids.map(async (id) => (await blogApi.getById(id)).data.result),
      );
      const resolvedBlogs = resolved.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const byId = new Map(
        [...populated, ...resolvedBlogs].map((blog) => [blog._id, blog]),
      );

      setSavedBlogs(Array.from(byId.values()));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedBlogs().finally(() => setIsLoading(false));
    }, [loadSavedBlogs]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSavedBlogs();
    setIsRefreshing(false);
  }, [loadSavedBlogs]);

  const handleRemoveSaved = useCallback(async (blog: Blog) => {
    setBusyBlogId(blog._id);
    try {
      await profileApi.removeSavedBlog(blog._id);
      setSavedBlogs((current) =>
        current.filter((savedBlog) => savedBlog._id !== blog._id),
      );
    } catch (removeError) {
      Alert.alert("Couldn't remove saved blog", getErrorMessage(removeError));
    } finally {
      setBusyBlogId(null);
    }
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <LogoLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.lg,
            },
          ]}
        >
          <ThemedText
            variant="heading4"
            style={{ fontWeight: typography.weights.heavy }}
          >
            Saved blogs
          </ThemedText>
          <ThemedText semantic="muted" variant="bodySmall">
            Stories you saved for later
          </ThemedText>
        </View>

        {error ? (
          <ThemedText
            semantic="error"
            variant="bodySmall"
            style={{ padding: spacing.xl, textAlign: "center" }}
          >
            {error} Pull down to try again.
          </ThemedText>
        ) : (
          <GridFeed
            items={savedBlogs}
            type="saved"
            busyId={busyBlogId}
            showAuthor
            onPressItem={(blog) => void router.push(`/blog/${blog.slug}`)}
            onRemoveSaved={(blog) => void handleRemoveSaved(blog)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
});