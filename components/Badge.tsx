import React from 'react';
import { StyleProp,Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary';
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { colors, typography, spacing, radii } = useTheme();

  const isPrimary = variant === 'primary';
  const bgColor = isPrimary ? colors.badgePrimaryBg : colors.badgeBg;
  const textColor = isPrimary ? colors.badgePrimaryText : colors.badgeText;

  return (
    <View
      style={[
        {
          backgroundColor: bgColor,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs,
          borderRadius: radii.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: textColor,
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default Badge;
