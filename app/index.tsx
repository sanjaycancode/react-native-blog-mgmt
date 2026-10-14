import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import GridFeed, { GridSkeleton } from "@/components/home/GridFeed";
import HomeHeader from "@/components/home/HomeHeader";
import ListFeed, { ListSkeleton } from "@/components/home/ListFeed";
import TopStoryHero from "@/components/home/TopStoryHero";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

import { blogApi } from "@/api/services";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

// ⚠️ Same auth hook your Navbar used
import { useAuth } from "@/context/AuthContext";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog, Category } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTheme();
  const { session } = useAuth();

  const user = session?.user;
  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin";
  const firstName = (user as { name?: string } | undefined)?.name
    ?.trim()
    .split(" ")[0];

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [feedView, setFeedView] = useState<"grid" | "list">("grid");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isBlogsLoading, setIsBlogsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [blogsError, setBlogsError] = useState<string | null>(null);

  const findBlogs = useCallback(async (silent = false) => {
    if (!silent) setIsBlogsLoading(true);
    setBlogsError(null);
    const [blogsResult, categoriesResult] = await Promise.allSettled([
      blogApi.list({ page: 1, limit: 6 }),
      categoryApi.list(),
    ]);

    if (blogsResult.status === "fulfilled") {
      setBlogs(blogsResult.value.data.result);
    } else {
      setBlogsError(getErrorMessage(blogsResult.reason));
    }

    if (categoriesResult.status === "fulfilled") {
      setCategories(categoriesResult.value.data.result);
    } else {
      console.error(
        "Failed to fetch blog categories:",
        categoriesResult.reason,
      );
    }

    setIsBlogsLoading(false);
  }, []);

  useEffect(() => {
    void findBlogs();
  }, [findBlogs]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await findBlogs(true);
    setIsRefreshing(false);
  }, [findBlogs]);

  const categoryOptions = [
    "All",
    ...categories.map((category) => category.title),
  ];
  const filteredBlogs =
    selectedCategory === "All"
      ? blogs
      : blogs.filter((blog) => blog.category?.title === selectedCategory);
  const topStory = blogs
    .filter((blog) => {
      const postedAt = new Date(blog.createdAt).getTime();
      return (
        Number.isFinite(postedAt) &&
        postedAt >= Date.now() - 7 * 24 * 60 * 60 * 1000
      );
    })
    .sort((a, b) => {
      const viewsDifference = (b.views ?? 0) - (a.views ?? 0);
      if (viewsDifference !== 0) return viewsDifference;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    })[0];

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <HomeHeader />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
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
        {/* Hero: changes with login state */}
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.sizes["3xl"],
              fontWeight: typography.weights.heavy,
              lineHeight: 38,
              letterSpacing: -0.5,
            }}
          >
            {isLoggedIn ? (
              <>
                Welcome back
                {firstName ? "," : "."}
                {firstName ? (
                  <Text style={{ color: colors.primary }}> {firstName}.</Text>
                ) : null}
              </>
            ) : (
              <>
                Publish your passions,{" "}
                <Text style={{ color: colors.primary }}>your way.</Text>
              </>
            )}
          </Text>

          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: typography.sizes.base,
              lineHeight: 24,
              marginTop: spacing.sm,
            }}
          >
            {isLoggedIn
              ? "Read something new today, or pick up where you left off."
              : "Thoughtful writing from a growing Nepali community. Read something useful, then add your own voice."}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: spacing.md,
              marginTop: spacing.lg,
            }}
          >
            {isLoggedIn ? (
              <>
                <Button
                  title="Start writing"
                  variant="filled"
                  size="small"
                  onPress={() => void router.push("/blog/create")}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isAdmin ? "Dashboard" : "Your profile"}
                  variant="outlined"
                  size="small"
                  onPress={() =>
                    void router.push(isAdmin ? "/admin" : "/profile")
                  }
                  style={{ flex: 1 }}
                />
              </>
            ) : (
              <>
                <Button
                  title="Browse blogs"
                  variant="filled"
                  size="small"
                  onPress={() => void router.push("/blog")}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Join us"
                  variant="outlined"
                  size="small"
                  onPress={() => void router.push("/register")}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
          }}
        >
          {categoryOptions.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
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
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Latest stories */}
        <View
          style={[
            styles.sectionHeader,
            { paddingHorizontal: spacing.xl, marginTop: spacing.sm },
          ]}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.sizes["2xl"],
              fontWeight: typography.weights.heavy,
              letterSpacing: -0.5,
            }}
          >
            Latest stories
          </Text>
          <View style={styles.sectionActions}>
            <View
              style={[
                styles.viewToggle,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              {(["grid", "list"] as const).map((view) => {
                const isSelected = feedView === view;
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    key={view}
                    onPress={() => setFeedView(view)}
                    accessibilityRole="button"
                    accessibilityLabel={`${view} view`}
                    accessibilityState={{ selected: isSelected }}
                    hitSlop={4}
                    style={[
                      styles.viewToggleButton,
                      {
                        backgroundColor: isSelected
                          ? colors.card
                          : "transparent",
                        borderColor: isSelected
                          ? colors.border
                          : "transparent",
                      },
                    ]}
                  >
                    <Ionicons
                      name={view === "grid" ? "grid-outline" : "list-outline"}
                      size={17}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ marginTop: spacing.xs }}>
          {isBlogsLoading ? (
            feedView === "grid" ? <GridSkeleton count={4} /> : <ListSkeleton count={4} />
          ) : blogsError ? (
            <View style={[styles.stateBox, { padding: spacing.xl }]}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={colors.mutedForeground}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: typography.sizes.base,
                  fontWeight: typography.weights.bold,
                  marginTop: spacing.sm,
                }}
              >
                Couldn't load stories
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                  textAlign: "center",
                  marginTop: 2,
                  marginBottom: spacing.md,
                }}
              >
                {blogsError}
              </Text>
              <Button
                title="Try again"
                variant="outlined"
                onPress={() => void findBlogs()}
              />
            </View>
          ) : filteredBlogs.length > 0 ? (
            feedView === "grid" ? (
              <GridFeed
                key={`${selectedCategory}-grid`}
                items={filteredBlogs}
                type="posts"
                showAuthor
                onPressItem={(blog) => void router.push(`/blog/${blog.slug}`)}
              />
            ) : (
              <ListFeed
                key={`${selectedCategory}-list`}
                items={filteredBlogs}
                type="posts"
                showAuthor
                onPressItem={(blog) => void router.push(`/blog/${blog.slug}`)}
              />
            )
          ) : (
            <View style={[styles.stateBox, { padding: spacing.xl }]}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                }}
              >
                No stories in this category yet.
              </Text>
            </View>
          )}
        </View>

        {!isBlogsLoading &&
          !blogsError &&
          filteredBlogs.length > 0 &&
          feedView === "grid" && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => void router.push("/blog")}
              accessibilityRole="link"
              hitSlop={8}
              style={[styles.viewAllFooter, { borderColor: colors.border }]}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.sizes.sm,
                  fontWeight: typography.weights.semibold,
                }}
              >
                View all stories
              </Text>
              <Ionicons
                name="arrow-forward"
                size={15}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}

        {!isBlogsLoading && !blogsError && topStory ? (
          <TopStoryHero
            blog={topStory}
            onPress={(blog) => void router.push(`/blog/${blog.slug}`)}
          />
        ) : null}

        {/* Bottom call to action: also depends on login state */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
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
              {isLoggedIn
                ? "Got something to say?"
                : "Share your story with the world"}
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
              {isLoggedIn
                ? "Start a draft now. It stays private until you publish."
                : "Join hundreds of Nepali creators, thinkers, and builders writing every day."}
            </Text>
            <Button
              title={isLoggedIn ? "Write a blog" : "Create your account"}
              variant="filled"
              onPress={() =>
                void router.push(isLoggedIn ? "/blog/create" : "/register")
              }
              style={{ width: "100%" }}
            />
            {!isLoggedIn && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => void router.push("/login")}
                accessibilityRole="link"
                hitSlop={8}
                style={{ marginTop: spacing.md }}
              >
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.sm,
                  }}
                >
                  Already have an account?{" "}
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: typography.weights.semibold,
                    }}
                  >
                    Log in
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
  },
  viewToggleButton: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 7,
  },
  viewAllFooter: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
  },
});
