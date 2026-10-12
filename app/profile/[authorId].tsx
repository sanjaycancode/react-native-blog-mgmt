import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { Appbar, Card, Text } from "react-native-paper";

import BlogFeedCard from "@/components/BlogFeedCard";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";

import { blogApi } from "@/api/services";

import { useTheme } from "@/constants/theme";

import type { Blog } from "@/types/blog";

import { getErrorMessage } from "@/utils/errorMessage";
import { imgSrc } from "@/utils/getImgSrc";

const PAGE_SIZE = 10;

export default function AuthorProfilePage() {
  const router = useRouter();
  const { authorId: authorParam } = useLocalSearchParams<{
    authorId?: string | string[];
  }>();
  const authorId = Array.isArray(authorParam) ? authorParam[0] : authorParam;
  const { colors, spacing, radii } = useTheme();

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const author = useMemo(() => blogs[0]?.author, [blogs]);

  const loadPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      if (!authorId) {
        setError("This author profile could not be found.");
        setLoading(false);
        return;
      }

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError("");

      try {
        const response = await blogApi.getByAuthor(authorId, {
          page: pageToLoad,
          limit: PAGE_SIZE,
        });
        const result = response.data.result;
        setBlogs((current) => (replace ? result : [...current, ...result]));
        setTotalPages(response.data.meta.totalPages);
        setPage(pageToLoad);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [authorId],
  );

  useEffect(() => {
    void loadPage(1, true);
  }, [loadPage]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPage(1, true);
  }, [loadPage]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && page < totalPages) {
      void loadPage(page + 1, false);
    }
  }, [loadPage, loading, loadingMore, page, totalPages]);

  const authorName = author?.name ?? "Author";
  const avatar =
    typeof author?.profile?.avatar === "string"
      ? author.profile.avatar
      : author?.profile?.avatar?.url;

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <FlatList
        data={blogs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <BlogFeedCard
            blog={item}
            onPress={() =>
              router.push({
                pathname: "/blog/[slug]",
                params: { slug: item.slug },
              })
            }
            shareUrl={`https://blog-ncc19.vercel.app/blogs/${item.slug}`}
          />
        )}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
            <Appbar.BackAction
              onPress={() => router.back()}
              color={colors.foreground}
            />
            <Card
              mode="outlined"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.lg,
              }}
            >
              <Card.Content
                style={[
                  styles.authorHeader,
                  { gap: spacing.md, paddingVertical: spacing.lg },
                ]}
              >
                {avatar ? (
                  <Image
                    source={{ uri: imgSrc(avatar, "profile") }}
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.secondary },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      variant="headlineMedium"
                      style={{ color: colors.primaryForeground }}
                    >
                      {authorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text
                    variant="headlineSmall"
                    style={{ color: colors.foreground }}
                  >
                    {authorName}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    {blogs.length} {blogs.length === 1 ? "blog" : "blogs"}
                  </Text>
                </View>
              </Card.Content>
            </Card>
            <Text variant="titleLarge" style={{ color: colors.foreground }}>
              Published blogs
            </Text>
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing["4xl"],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={[styles.centered, { gap: spacing.sm }]}>
              <ActivityIndicator color={colors.primary} />
              <Text
                variant="bodyMedium"
                style={{ color: colors.mutedForeground }}
              >
                Loading author profile...
              </Text>
            </View>
          ) : error ? (
            <View style={[styles.centered, { gap: spacing.sm }]}>
              <Text
                variant="bodyMedium"
                style={{ color: colors.primary, textAlign: "center" }}
              >
                {error}
              </Text>
            </View>
          ) : (
            <View style={[styles.centered, { gap: spacing.sm }]}>
              <Ionicons
                name="document-text-outline"
                size={32}
                color={colors.mutedForeground}
              />
              <Text
                variant="titleMedium"
                style={{ color: colors.foreground }}
              >
                No published blogs yet
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ paddingVertical: spacing.lg }}
            />
          ) : null
        }
      />
    </ThemedSafeAreaView>
  );
}

const styles = StyleSheet.create({
  authorHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});
