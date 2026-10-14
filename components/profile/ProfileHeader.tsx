import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

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
  counts: { posts: number };
  onConnections: (type: "followers" | "following") => void;
  onEdit: () => void;
  onAnalytics: () => void;
  onCreate: () => void;
  onOpenLink: (value: string) => void;
  onLogout: () => void;
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

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconButton, { backgroundColor: colors.secondary }]}
    >
      <Ionicons name={icon} size={20} color={colors.foreground} />
    </TouchableOpacity>
  );
}

export default function ProfileHeader({
  profile,
  counts,
  onConnections,
  onEdit,
  onAnalytics,
  onCreate,
  onOpenLink,
  onLogout,
}: Props) {
  const { colors, typography, spacing } = useTheme();
  const name = profile?.user?.name ?? profile?.user?.username ?? "Your profile";
  const socialLinks = Object.entries(profile?.socialLinks ?? {}).filter(
    ([, value]) => Boolean(value),
  ) as [string, string][];

  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
      }}
    >
      {/* Top actions */}
      <View style={styles.topRow}>
        <IconButton
          icon="stats-chart-outline"
          label="Analytics"
          onPress={onAnalytics}
        />
        <IconButton icon="add" label="Write a new blog" onPress={onCreate} />
        <IconButton icon="log-out-outline" label="Log out" onPress={onLogout} />
      </View>

      {/* Avatar + stats */}
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
          <Stat value={counts.posts} label="Posts" />
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={() => onConnections("followers")}
            accessibilityRole="button"
            accessibilityLabel="View followers"
          >
            <Stat value={profile?.followersCount ?? 0} label="Followers" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={() => onConnections("following")}
            accessibilityRole="button"
            accessibilityLabel="View following"
          >
            <Stat value={profile?.followingCount ?? 0} label="Following" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Name + bio */}
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
            numberOfLines={3}
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
              <TouchableOpacity
                activeOpacity={0.6}
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
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Edit pill */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onEdit}
        accessibilityRole="button"
        style={[
          styles.editPill,
          {
            backgroundColor: colors.secondary,
            marginTop: spacing.lg,
          },
        ]}
      >
        <Text
          style={{
            color: colors.secondaryForeground,
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.semibold,
          }}
        >
          {profile ? "Edit profile" : "Complete your profile"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
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
  editPill: {
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
