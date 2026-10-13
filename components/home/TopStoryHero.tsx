import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

import { imgSrc } from "@/utils/getImgSrc";

import type { Blog } from "@/types";

type Props = {
  blog: Blog;
  onPress: (blog: Blog) => void;
};

function categoryTitle(blog: Blog) {
  return typeof blog.category === "object" ? blog.category?.title : undefined;
}

export default function TopStoryHero({ blog, onPress }: Props) {
  const { colors, typography, spacing, radii } = useTheme();
  const imageUri = blog.image ? imgSrc(blog.image, "blog") : undefined;

  return (
    <View
      style={[
        styles.wrap,
        {
          marginHorizontal: spacing.xl,
          marginTop: spacing.xl,
          borderColor: colors.border,
          borderRadius: radii.lg,
          backgroundColor: colors.card,
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(blog)}
        accessibilityRole="button"
        accessibilityLabel={`Read ${blog.title}`}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        <View style={[styles.imageFrame, { backgroundColor: colors.secondary }]}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="document-text-outline"
              size={34}
              color={colors.mutedForeground}
            />
          )}
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              TOP THIS WEEK
            </Text>
          </View>
        </View>

        <View style={{ padding: spacing.md }}>
          <View style={styles.meta}>
            {!!categoryTitle(blog) && (
              <Text
                numberOfLines={1}
                style={{
                  color: colors.primary,
                  flexShrink: 1,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.bold,
                }}
              >
                {categoryTitle(blog)}
              </Text>
            )}
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.xs,
              }}
            >
              {blog.views ?? 0} views
            </Text>
          </View>

          <Text
            numberOfLines={2}
            style={{
              color: colors.foreground,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
              lineHeight: 26,
              marginTop: spacing.xs,
            }}
          >
            {blog.title}
          </Text>

          <View style={styles.footer}>
            <Text
              style={{
                color: colors.mutedForeground,
                flex: 1,
                fontSize: typography.sizes.xs,
              }}
            >
              {blog.author?.name ?? "By the author"}
            </Text>
            <View style={[styles.readAction, { backgroundColor: colors.primary }]}>
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.bold,
                }}
              >
                Read story
              </Text>
              <Ionicons
                name="arrow-forward"
                size={13}
                color={colors.primaryForeground}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    overflow: "hidden",
  },
  imageFrame: {
    height: 154,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    left: 12,
    top: 12,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  readAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
});
