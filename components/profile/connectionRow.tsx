import { memo } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { ProfileConnectionUser } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { imgSrc } from "@/utils/getImgSrc";

type Props = {
  user: ProfileConnectionUser;
  isFollowing: boolean;
  isBusy: boolean;
  showFollowButton: boolean;
  onPressUser: (userId: string) => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  isOwn: boolean;
};

function ConnectionRow({
  user,
  isFollowing,
  isBusy,
  showFollowButton,
  onPressUser,
  onToggleFollow,
  isOwn,
}: Props) {
  const { colors, typography } = useTheme();

  const userId = user._id ?? user.id;
  const name = user.name ?? user.username ?? user.email ?? "User";
  const avatarUri = imgSrc(user.avatar, "profile");

  const buttonBg = isFollowing ? colors.secondary : colors.primary;
  const buttonFg = isFollowing ? colors.foreground : colors.primaryForeground;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.65}
        disabled={!userId}
        onPress={() => userId && onPressUser(userId)}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}'s profile`}
        style={styles.info}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={[styles.avatar, { backgroundColor: colors.secondary }]}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text
              style={{
                color: colors.primaryForeground,
                fontWeight: typography.weights.bold,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text
          numberOfLines={1}
          style={{
            color: colors.foreground,
            fontSize: typography.sizes.base,
            fontWeight: typography.weights.semibold,
            flex: 1,
          }}
        >
          {name}
        </Text>
      </TouchableOpacity>

      {showFollowButton && userId && (
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={isBusy}
          onPress={() => onToggleFollow(userId, isFollowing)}
          accessibilityRole="button"
          accessibilityLabel={
            isFollowing ? `Unfollow ${name}` : `Follow ${name}`
          }
          style={[styles.followButton, { backgroundColor: buttonBg }]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={buttonFg} />
          ) : (
            <Text
              style={{
                color: buttonFg,
                fontSize: typography.sizes.xs,
                fontWeight: typography.weights.bold,
              }}
            >
              {isFollowing ? "Unfollow" : isOwn ? "Follow back" : "follow"}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default memo(ConnectionRow);

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  info: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  followButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: 10,
  },
});
