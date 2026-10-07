import React from 'react';
import { Pressable,StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../constants/theme';

import Badge from './Badge';
import Card from './ThemedCard';

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

interface BlogCardProps {
  blog: BlogItem;
  onPress?: () => void;
}

export function BlogCard({ blog, onPress }: BlogCardProps) {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.header}>
          <Badge
            label={blog.category}
            variant={blog.isFeatured ? 'primary' : 'default'}
          />
          <Text
            style={[
              styles.metaText,
              {
                color: colors.mutedForeground,
                fontSize: typography.sizes.xs,
              },
            ]}
          >
            {blog.readTime}
          </Text>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: colors.foreground,
              fontSize: typography.sizes.lg,
              fontWeight: typography.weights.bold,
              marginTop: spacing.sm,
            },
          ]}
          numberOfLines={2}
        >
          {blog.title}
        </Text>

        <Text
          style={[
            styles.excerpt,
            {
              color: colors.mutedForeground,
              fontSize: typography.sizes.sm,
              marginTop: spacing.xs,
              lineHeight: 20,
            },
          ]}
          numberOfLines={3}
        >
          {blog.excerpt}
        </Text>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              paddingTop: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          <View style={styles.authorRow}>
            <View
              style={[
                styles.authorAvatar,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.full,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.bold,
                }}
              >
                {blog.author.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text
              style={[
                styles.authorName,
                {
                  color: colors.foreground,
                  fontSize: typography.sizes.xs,
                  fontWeight: typography.weights.medium,
                },
              ]}
            >
              {blog.author}
            </Text>
          </View>

          <Text
            style={[
              styles.date,
              {
                color: colors.mutedForeground,
                fontSize: typography.sizes.xs,
              },
            ]}
          >
            {blog.date}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontWeight: '500',
  },
  title: {
    letterSpacing: -0.3,
  },
  excerpt: {},
  footer: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {},
  date: {},
});

export default BlogCard;
