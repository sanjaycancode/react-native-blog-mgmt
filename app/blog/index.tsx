import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Href, useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { BlogComments } from "@/components/BlogComments";
import BlogFeedCard from "@/components/BlogFeedCard";
import { HeaderBackButton } from "@/components/HeaderBackButton";
import SearchBox from "@/components/SearchBox";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { blogApi } from "@/api/services";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog, Category } from "@/types";

const PAGE_SIZE = 7;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}


function CategoryChips({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string;
  onSelect: (title: string) => void;
}) {
  const { colors, spacing, radii, typography } = useTheme();
  const items = [{ _id: "", title: "All" }, ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: spacing.xs, paddingRight: spacing.md }}
    >
      {items.map((item) => {
        const isSelected = item._id ? selected === item.title : !selected;

        return (
          <Pressable
            key={item._id || "all"}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(item._id ? item.title : "")}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <ThemedText
              variant="caption"
              style={{
                color: isSelected ? colors.primaryForeground : colors.foreground,
                fontWeight: isSelected
                  ? typography.weights.semibold
                  : typography.weights.regular,
              }}
            >
              {item.title}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}


function BlogCardSkeleton() {
  const { colors, spacing, radii } = useTheme();

  return (
    <View
      style={[
        styles.skeletonCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          marginBottom: spacing.lg,
        },
      ]}
    >
      <View style={styles.skeletonAuthor}>
        <View
          style={[
            styles.skeletonAvatar,
            { backgroundColor: colors.muted, borderRadius: radii.full },
          ]}
        />
        <View style={styles.skeletonTextGroup}>
          <View
            style={[
              styles.skeletonLine,
              { width: "52%", backgroundColor: colors.muted },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              { width: "34%", backgroundColor: colors.muted },
            ]}
          />
        </View>
      </View>
      <View
        style={[
          styles.skeletonLine,
          { width: "82%", height: 18, backgroundColor: colors.muted },
        ]}
      />
      <View
        style={[
          styles.skeletonLine,
          { width: "100%", backgroundColor: colors.muted },
        ]}
      />
      <View
        style={[
          styles.skeletonImage,
          {
            height: 190,
            backgroundColor: colors.muted,
            borderRadius: radii.md,
          },
        ]}
      />
    </View>
  );
}


export default function BlogsPage() {
  const { colors, spacing, radii, typography } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    search?: string | string[];
    category?: string | string[];
    tag?: string | string[];
  }>();
  const search = getParam(params.search);
  const category = getParam(params.category);
  const tag = getParam(params.tag);

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchMoreError, setFetchMoreError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    categoryApi
      .list()
      .then((response) => {
        if (!cancelled) setCategories(response.data.result ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Unable to load blog categories:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    isFetchingRef.current = true;

    setLoading(true);
    setFetchError(null);
    setFetchMoreError(null);
    setPage(1);
    setLoadingMore(false);

    blogApi
      .list({ page: 1, limit: PAGE_SIZE, search, category, tag })
      .then((response) => {
        if (cancelled || requestId !== requestIdRef.current) return;

        const result = response.data.result ?? [];
        const totalPages = response.data.meta?.totalPages ?? 1;
        setBlogs(result);
        setTotalBlogs(response.data.meta?.totalBlogs ?? result.length);
        setHasMore(1 < totalPages);
      })
      .catch((error: unknown) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        setBlogs([]);
        setTotalBlogs(0);
        setHasMore(false);
        setFetchError(getErrorMessage(error));
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search, category, tag, reloadKey]);

  const updateFilters = useCallback(
    (next: { search?: string; category?: string; tag?: string }) => {
      router.setParams({
        search: next.search ?? search,
        category: next.category ?? category,
        tag: (next.tag ?? tag) || undefined,
      });
    },
    [category, router, search, tag],
  );

  const handleSearch = useCallback(
    (value: string) => updateFilters({ search: value }),
    [updateFilters],
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoadingMore(true);
    setFetchMoreError(null);
    const requestId = requestIdRef.current;
    const nextPage = page + 1;

    try {
      const response = await blogApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        search,
        category,
        tag,
      });

      if (requestId !== requestIdRef.current) return;

      const newBlogs = response.data.result ?? [];
      setBlogs((current) => {
        const existingIds = new Set(current.map((blog) => blog._id));
        return [
          ...current,
          ...newBlogs.filter((blog) => !existingIds.has(blog._id)),
        ];
      });
      setPage(nextPage);
      setHasMore(nextPage < (response.data.meta?.totalPages ?? 1));
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setFetchMoreError(getErrorMessage(error));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        isFetchingRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [category, hasMore, loading, loadingMore, page, search, tag]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const openBlog = useCallback(
    (slug: string) =>
      router.push({ pathname: "/blog/[slug]", params: { slug } }),
    [router],
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const hasFilters = Boolean(search || category || tag);
  const header = (
    <View
      style={[
        {
          backgroundColor: colors.background,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.md,
        },
      ]}
    >
<View style={{flexDirection:"row",gap:spacing.sm}}>
    <Pressable
  accessibilityRole="search"
  accessibilityLabel="Search blogs and people"
  onPress={() => router.push("/search" as Href)}
  style={[
    styles.searchBar,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      flex:1
    },
  ]}
>
  <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
  <ThemedText variant="bodySmall" semantic="muted">
    Search blogs and people
  </ThemedText>
</Pressable>
</View>
      <CategoryChips
        categories={categories}
        selected={category}
        onSelect={(title) => updateFilters({ category: title })}
      />

     
    </View>
  );

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <FlatList
        data={loading ? [] : blogs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <BlogFeedCard
            blog={item}
            onPress={() => void openBlog(item.slug)}
            onLike={async (blogId) =>
              (await blogApi.toggleLike(blogId)).data.result
            }
            renderComments={({ onCommentCountChange }) => (
              <BlogComments
                blogId={item._id}
                onCommentCountChange={onCommentCountChange}
              />
            )}
            shareUrl={`https://blog-ncc19.vercel.app/blogs/${item.slug}`}
          />
        )}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={[styles.loadingState, { paddingTop: spacing.md }]}>
              <BlogCardSkeleton />
              <BlogCardSkeleton />
            </View>
          ) : fetchError ? (
            <EmptyState
              title="Unable to load blogs"
              message={fetchError}
              action="Retry"
              onPress={handleRetry}
            />
          ) : (
            <EmptyState
              title="No blogs found"
              message={
                search
                  ? `No blogs matching "${search}". Try another search.`
                  : "There are no stories to show for these filters yet."
              }
              action={hasFilters ? "Clear filters" : undefined}
              onPress={
                hasFilters
                  ? () => updateFilters({ search: "", category: "", tag: "" })
                  : undefined
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ paddingVertical: spacing.lg }}
            />
          ) : fetchMoreError ? (
            <View style={styles.loadMoreError}>
              <ThemedText variant="bodySmall" semantic="muted">
                Could not load more articles: {fetchMoreError}
              </ThemedText>
              <ThemedButton
                title="Retry"
                variant="outlined"
                size="small"
                onPress={() => void loadMore()}
              />
            </View>
          ) : !loading && blogs.length > 0 && !hasMore ? (
            <ThemedText
              variant="caption"
              semantic="muted"
              style={[styles.endMessage, { paddingVertical: spacing.xl }]}
            >
              You’re all caught up.
            </ThemedText>
          ) : null
        }
      />
    </ThemedSafeAreaView>
  );
}

function EmptyState({
  title,
  message,
  action,
  onPress,
}: {
  title: string;
  message: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.emptyState, { paddingVertical: spacing["4xl"] }]}>
      <Ionicons
        name="document-text-outline"
        size={36}
        color={colors.mutedForeground}
      />
      <ThemedText variant="heading5" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText
        variant="bodySmall"
        semantic="muted"
        style={styles.emptyMessage}
      >
        {message}
      </ThemedText>
      {action && onPress ? (
        <ThemedButton
          title={action}
          variant="outlined"
          size="small"
          onPress={onPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    flex: 1,
  },
chip: {
    height: 25,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  loadingState: {
    gap: 4,
  },
  skeletonCard: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  skeletonAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonImage: {
    width: "100%",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyMessage: {
    textAlign: "center",
  },
  loadMoreError: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  endMessage: {
    textAlign: "center",
  },
  searchBar: {
  height: 35,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,

},
});