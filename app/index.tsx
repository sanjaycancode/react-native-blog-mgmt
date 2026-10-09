import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import BlogCard from "@/components/BlogCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/NavBar";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

import { blogApi } from "@/api/services";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog, Category } from "@/types";

const BLOG_BASE_URL = "http://localhost:8081/";

export default function HomeScreen() {
  const { colors, typography, spacing, radii } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isBlogsLoading, setIsBlogsLoading] = useState(true);
  const [blogsError, setBlogsError] = useState<string | null>(null);
  const router = useRouter();

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

  const findBlogs = useCallback(async () => {
    setIsBlogsLoading(true);
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

  const categoryOptions = [
    "All",
    ...categories.map((category) => category.title),
  ];
  const filteredBlogs =
    selectedCategory === "All"
      ? blogs
      : blogs.filter((blog) => blog.category?.title === selectedCategory);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Navbar />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.hero, { padding: spacing.xl }]}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.primary,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
                marginBottom: spacing.xs,
              },
            ]}
          >
            IDEAS WORTH SHARING
          </Text>

          <Text
            style={[
              styles.heroTitle,
              {
                color: colors.foreground,
                fontSize: typography.sizes["3xl"],
                fontWeight: typography.weights.heavy,
                lineHeight: 38,
              },
            ]}
          >
            Publish your passions,{" "}
            <Text style={{ color: colors.primary }}>your way.</Text>
          </Text>

          <Text
            style={[
              styles.heroSubtitle,
              {
                color: colors.mutedForeground,
                fontSize: typography.sizes.base,
                lineHeight: 24,
                marginTop: spacing.md,
              },
            ]}
          >
            Discover thoughtful writing from a growing Nepali community. Read
            something useful, then add your own voice.
          </Text>

          <View
            style={[
              styles.heroActions,
              { marginTop: spacing.xl, gap: spacing.md },
            ]}
          >
            <Button
              title="Browse Blogs"
              variant="filled"
              onPress={() => void router.push("/blog")}
              style={styles.heroButton}
            />
            <Button
              title="Join the community"
              variant="outlined"
              onPress={() => void router.push("/register")}
              style={styles.heroButton}
            />
          </View>
        </View>

        {/* Category Filter Chips */}
        <View style={{ marginVertical: spacing.md }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.categoryScroll,
              { paddingHorizontal: spacing.xl },
            ]}
          >
            {categoryOptions.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.card,
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
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Latest Stories Section */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color: colors.primary,
                    fontSize: typography.sizes.xs,
                    fontWeight: typography.weights.bold,
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                FRESH FROM THE COMMUNITY
              </Text>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.foreground,
                    fontSize: typography.sizes["2xl"],
                    fontWeight: typography.weights.heavy,
                  },
                ]}
              >
                Latest stories
              </Text>
            </View>

            <Pressable
              onPress={() => void openWebsite("/blog")}
              style={styles.linkRow}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.sizes.sm,
                  fontWeight: typography.weights.semibold,
                }}
              >
                View all
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          </View>

          {/* Story List */}
          <View style={{ marginTop: spacing.lg }}>
            {isBlogsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : blogsError ? (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                }}
              >
                Could not load stories: {blogsError}
              </Text>
            ) : filteredBlogs.length > 0 ? (
              filteredBlogs.map((blog) => (
                <BlogCard
                  key={blog._id}
                  blog={blog}
                  onPress={() => void openWebsite(`/blog/${blog.slug}`)}
                />
              ))
            ) : (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                }}
              >
                No stories found in this category.
              </Text>
            )}
          </View>
        </View>

        {/* Write CTA Section */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
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
              Share your story with the world
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
              Join hundreds of Nepali creators, thinkers, and builders writing
              everyday.
            </Text>
            <Button
              title="Create Your Post"
              variant="filled"
              onPress={() => void router.push("/register")}
              style={{ width: "100%" }}
            />
          </Card>
        </View>

        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  hero: {},
  eyebrow: {
    letterSpacing: 1,
  },
  heroTitle: {
    letterSpacing: -0.5,
  },
  heroSubtitle: {},
  heroActions: {
    flexDirection: "column",
  },
  heroButton: {
    width: "100%",
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
  },
  heroCircle: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  heroCardTitle: {
    letterSpacing: -0.3,
  },
  heroCardDescription: {},
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryScroll: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChip: {
    borderWidth: 1,
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionTitle: {
    letterSpacing: -0.5,
  },
});
