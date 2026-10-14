import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { imgSrc } from "@/utils/getImgSrc";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram: "logo-instagram",
  facebook: "logo-facebook",
  website: "globe-outline",
};

type Props = {
  profile: ProfileData | null;
  postsCount: number;
  onBack: () => void;
  onShare: () => void;
  onToggleFollow: () => void;
  isFollowing: boolean;
  isFollowLoading: boolean;
  onConnections: (type: "followers" | "following") => void;
  onOpenLink: (value: string) => void;
};

function Stat({ value, label }: { value: number; label: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.stat}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: typography.sizes.xl,
          fontWeight: typography.weights.heavy,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: typography.sizes.xs,
          marginTop: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.foreground} />
    </Pressable>
  );
}

export default function PublicProfileHeader({
  profile,
  postsCount,
  onBack,
  onShare,
  onToggleFollow,
  isFollowing,
  isFollowLoading,
  onConnections,
  onOpenLink,
}: Props) {
  const { colors, typography, spacing } = useTheme();
  const name = profile?.user?.name ?? profile?.user?.username ?? "Writer";
  const socialLinks = Object.entries(profile?.socialLinks ?? {}).filter(
    ([, value]) => Boolean(value),
  ) as [string, string][];

  // Note: email, saved blogs, drafts and analytics are deliberately never
  // read here. Visitors only get public information.
  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
      }}
    >
      <View style={styles.topRow}>
        <BackButton onPress={onBack} />
      </View>

      <View style={styles.heroRow}>
        {profile?.avatar ? (
          <Image
            source={{ uri: imgSrc(profile.avatar) }}
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: typography.sizes["2xl"],
                fontWeight: typography.weights.heavy,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <Stat value={postsCount} label="Posts" />
          <Pressable
            onPress={() => onConnections("followers")}
            accessibilityRole="button"
            accessibilityLabel="View followers"
          >
            <Stat value={profile?.followersCount ?? 0} label="Followers" />
          </Pressable>
          <Pressable
            onPress={() => onConnections("following")}
            accessibilityRole="button"
            accessibilityLabel="View following"
          >
            <Stat value={profile?.followingCount ?? 0} label="Following" />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.foreground,
              fontSize: typography.sizes.lg,
              fontWeight: typography.weights.bold,
              flexShrink: 1,
            }}
          >
            {name}
          </Text>
          {profile?.isVerified && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {!!profile?.bio && (
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.sizes.sm,
              lineHeight: 20,
              marginTop: 2,
            }}
          >
            {profile.bio}
          </Text>
        )}

        {socialLinks.length > 0 && (
          <View style={styles.socialRow}>
            {socialLinks.map(([label, value]) => (
              <Pressable
                key={label}
                onPress={() => onOpenLink(value)}
                accessibilityRole="link"
                accessibilityLabel={label}
                hitSlop={8}
              >
                <Ionicons
                  name={SOCIAL_ICONS[label] ?? "link-outline"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onToggleFollow}
          disabled={isFollowLoading}
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? "Unfollow user" : "Follow user"}
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: isFollowing
                ? colors.secondary
                : colors.primary,
              opacity: pressed || isFollowLoading ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={isFollowing ? "person-remove-outline" : "person-add-outline"}
            size={16}
            color={
              isFollowing ? colors.secondaryForeground : colors.primaryForeground
            }
          />
          <Text
            style={{
              color: isFollowing
                ? colors.secondaryForeground
                : colors.primaryForeground,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.semibold,
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share profile"
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: colors.secondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name="share-outline"
            size={16}
            color={colors.secondaryForeground}
          />
          <Text
            style={{
              color: colors.secondaryForeground,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.semibold,
            }}
          >
            Share profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Pulsing placeholder that matches the header's shape while loading. */
export function PublicProfileSkeleton({ onBack }: { onBack: () => void }) {
  const { colors, spacing } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const block = { backgroundColor: colors.secondary };

  return (
    <View
      style={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
      }}
    >
      <View style={styles.topRow}>
        <BackButton onPress={onBack} />
      </View>
      <Animated.View style={style}>
        <View style={styles.heroRow}>
          <View style={[styles.avatar, block]} />
          <View style={styles.statsRow}>
            <View style={[styles.skelStat, block]} />
            <View style={[styles.skelStat, block]} />
            <View style={[styles.skelStat, block]} />
          </View>
        </View>
        <View style={[styles.skelLine, block, { width: "40%", marginTop: 16 }]} />
        <View style={[styles.skelLine, block, { width: "85%", marginTop: 10 }]} />
        <View style={[styles.skelPill, block, { marginTop: 20 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  actionPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  skelStat: {
    width: 56,
    height: 36,
    borderRadius: 10,
  },
  skelLine: {
    height: 14,
    borderRadius: 7,
  },
  skelPill: {
    height: 38,
    borderRadius: 19,
  },
});