import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/constants/theme";

import type { ProfileTab } from "./MinimalTabBar";

const COPY: Record<
  ProfileTab,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    body: string;
    cta?: string;
  }
> = {
  posts: {
    icon: "newspaper-outline",
    title: "No posts yet",
    body: "Publish your first blog and it will show up here.",
    cta: "Write a blog",
  },
  saved: {
    icon: "bookmark-outline",
    title: "No saved blogs yet",
    body: "Tap the bookmark on any blog to keep it for later.",
  },
  drafts: {
    icon: "create-outline",
    title: "No drafts waiting",
    body: "Blogs you haven't published yet are kept here, just for you.",
    cta: "Start a draft",
  },
  submitted: {
    icon: "paper-plane-outline",
    title: "No submitted blogs",
    body: "Blogs submitted for review will appear here.",
  },
  rejected: {
    icon: "close-circle-outline",
    title: "No rejected blogs",
    body: "Blogs rejected during review will appear here.",
  },
};

type Props = {
  type: ProfileTab;
  onAction?: () => void;
  /** Optional copy overrides, e.g. for visitors viewing someone else's page. */
  title?: string;
  body?: string;
};

export default function EmptyState({ type, onAction, title, body }: Props) {
  const { colors, typography, spacing } = useTheme();
  const copy = COPY[type];

  return (
    <View style={[styles.wrap, { paddingHorizontal: spacing.xl * 1.5 }]}>
      {/* Layered rings behind the icon */}
      <View style={styles.iconStack}>
        <View
          style={[
            styles.ring,
            {
              width: 128,
              height: 128,
              borderRadius: 64,
              backgroundColor: colors.primary,
              opacity: 0.05,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: colors.primary,
              opacity: 0.1,
            },
          ]}
        />
        <View
          style={[
            styles.core,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name={copy.icon} size={26} color={colors.primary} />
        </View>
      </View>

      <Text
        style={{
          color: colors.foreground,
          fontSize: typography.sizes.xl,
          fontWeight: typography.weights.bold,
          marginTop: spacing.lg,
          textAlign: "center",
        }}
      >
        {title ?? copy.title}
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: typography.sizes.sm,
          lineHeight: 20,
          marginTop: spacing.xs,
          textAlign: "center",
        }}
      >
        {body ?? copy.body}
      </Text>

      {!!copy.cta && !!onAction && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          accessibilityRole="button"
          style={[
            styles.cta,
            {
              backgroundColor: colors.primary,
              marginTop: spacing.lg,
            },
          ]}
        >
          <Text
            style={{
              color: colors.primaryForeground,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.bold,
            }}
          >
            {copy.cta}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
  },
  iconStack: {
    width: 128,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
  core: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    height: 42,
    paddingHorizontal: 24,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
