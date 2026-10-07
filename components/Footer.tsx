import React from 'react';
import { StyleSheet,Text, View } from 'react-native';

import { useTheme } from '../constants/theme';

export function Footer() {
  const { colors, typography, spacing } = useTheme();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          padding: spacing.xl,
        },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.foreground,
              fontSize: typography.sizes.base,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          Nepal Can Blog
        </Text>
        <Text
          style={[
            styles.tagline,
            {
              color: colors.mutedForeground,
              fontSize: typography.sizes.sm,
              marginTop: spacing.xs,
            },
          ]}
        >
          A warm place for useful stories.
        </Text>
        <Text
          style={[
            styles.copyright,
            {
              color: colors.mutedForeground,
              fontSize: typography.sizes.xs,
              marginTop: spacing.md,
            },
          ]}
        >
          © {new Date().getFullYear()} Nepal Can Blog. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    marginTop: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  tagline: {
    textAlign: 'center',
  },
  copyright: {
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default Footer;
