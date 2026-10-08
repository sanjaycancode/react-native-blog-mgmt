import { Image, Pressable, StyleSheet, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";

import type { Blog } from "@/types/blog";

interface BlogCardProps {
  blog: Blog;
  onPress?: () => void;
}

function getImageUri(image: Blog["image"]) {
  if (typeof image === "string") return image;
  return image?.url;
}

function getAuthorName(blog: Blog) {
  return blog.author?.name ?? blog.author?.email ?? "Unknown author";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getExcerpt(description: string) {
  return description
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function BlogCard({ blog, onPress }: BlogCardProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const imageUri = getImageUri(blog.image);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: radii.lg,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          {
            aspectRatio: 1.6,
            backgroundColor: colors.muted,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            accessibilityLabel={blog.title}
            resizeMode="cover"
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="image-outline"
              size={32}
              color={colors.mutedForeground}
            />
          </View>
        )}
        {blog.category?.title ? (
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: colors.background,
                borderRadius: radii.full,
                left: spacing.sm + 2,
                top: spacing.sm + 2,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={{
                color: colors.foreground,
                fontWeight: typography.weights.semibold,
              }}
            >
              {blog.category.title}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.content,
          {
            padding: spacing.md,
            gap: spacing.sm,
          },
        ]}
      >
        <ThemedText
          variant="heading6"
          numberOfLines={2}
          style={{ color: colors.foreground, lineHeight: 24 }}
        >
          {blog.title}
        </ThemedText>

        {blog.description ? (
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            numberOfLines={3}
            style={{ lineHeight: 21 }}
          >
            {getExcerpt(blog.description)}
          </ThemedText>
        ) : null}

        <View style={styles.footer}>
          <ThemedText
            variant="caption"
            semantic="muted"
            numberOfLines={1}
            style={styles.author}
          >
            {getAuthorName(blog)}
          </ThemedText>
          <ThemedText variant="caption" semantic="muted">
            {formatDate(blog.createdAt)}
          </ThemedText>
        </View>

        <View style={styles.readMore}>
          <ThemedText
            variant="bodySmall"
            style={{ color: colors.primary, fontWeight: typography.weights.medium }}
          >
            Read more
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  imageContainer: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    maxWidth: "80%",
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  author: {
    flexShrink: 1,
  },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
});

export default BlogCard;
