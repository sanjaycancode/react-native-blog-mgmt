import React, { useState } from "react";
import { Pressable,ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import BlogCard from "../components/BlogCard";
import Footer from "../components/Footer"
import Button from "../components/ThemedButton";
import Card from "../components/ThemedCard";
import { useTheme } from "../constants/theme";
import Navbar from "../components/NavBar";

export interface BlogItem {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  isFeatured?: boolean;
}
const SAMPLE_BLOGS: BlogItem[] = [
  {
    id: "1",
    title: "Building Modern Web and Mobile Apps with Seamless Architecture",
    excerpt:
      "Explore how modern fullstack patterns simplify cross-platform development while maintaining high performance and clarity.",
    author: "Aarav Sharma",
    date: "Oct 4, 2026",
    category: "Technology",
    readTime: "5 min read",
    isFeatured: true,
  },
  {
    id: "2",
    title: "A Trekker’s Guide to the Hidden Trails of Annapurna",
    excerpt:
      "Beyond the mainstream routes lies an untouched realm of stunning landscapes, peaceful tea houses, and hospitable locals.",
    author: "Pooja Thapa",
    date: "Oct 2, 2026",
    category: "Travel & Culture",
    readTime: "7 min read",
  },
  {
    id: "3",
    title: "The Art of Slow Living in Kathmandu’s Bustling Corners",
    excerpt:
      "Finding mindful moments, morning chiya culture, and quiet heritage courtyards amidst city life.",
    author: "Bikash Karki",
    date: "Sep 29, 2026",
    category: "Life & Thoughts",
    readTime: "4 min read",
  },
];

const CATEGORIES = [
  "All",
  "Technology",
  "Travel & Culture",
  "Life & Thoughts",
  "Startups",
  "Design",
];

interface HomeScreenProps {
  onNavigate?: (route: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { colors, typography, spacing, radii } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredBlogs =
    selectedCategory === "All"
      ? SAMPLE_BLOGS
      : SAMPLE_BLOGS.filter((b) => b.category === selectedCategory);

  return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
    <Navbar
      onNavigate={onNavigate}
      activeRoute="home"
    />

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

        {/* Hero Actions */}
        <View
          style={[
            styles.heroActions,
            { marginTop: spacing.xl, gap: spacing.md },
          ]}
        >
          <Button title="Browse Blogs"
            variant="filled"
            onPress={() => onNavigate?.("explore")}
            style={styles.heroButton}
          />
          <Button title="Join the community"
            variant="outlined"
            onPress={() => onNavigate?.("register")}
            style={styles.heroButton}
          />
        </View>

        {/* Hero Featured Card */}
        <Card
          style={[
            styles.heroCard,
            {
              marginTop: spacing["2xl"],
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.heroCircle,
              {
                backgroundColor: colors.heroCircle,
              },
            ]}
          />
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.primary,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              },
            ]}
          >
            FEATURED THIS WEEK
          </Text>
          <Text
            style={[
              styles.heroCardTitle,
              {
                color: colors.foreground,
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
                marginTop: spacing.sm,
              },
            ]}
          >
            Write your Blog
          </Text>
          <Text
            style={[
              styles.heroCardDescription,
              {
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
                lineHeight: 20,
                marginTop: spacing.xs,
              },
            ]}
          >
            Get started with writing your stories; stories remain alive for
            generations.
          </Text>

          <Pressable
            onPress={() => onNavigate?.("write")}
            style={[styles.linkRow, { marginTop: spacing.md }]}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.semibold,
              }}
            >
              Start writing now
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </Pressable>
        </Card>
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
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryChip,
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
            onPress={() => onNavigate?.("explore")}
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
          {filteredBlogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              onPress={() => onNavigate?.("explore")}
            />
          ))}
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
          <Button title = "Create Your Post"
            variant="filled"
            onPress={() => onNavigate?.("write")}
            style={{ width: "100%" }}
          />
        </Card>
      </View>

      <Footer />
    </ScrollView>
    </View>
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
export default HomeScreen;
