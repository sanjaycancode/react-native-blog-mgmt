import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import type { ProfileConnectionUser } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { imgSrc } from "@/utils/getImgSrc";

type Props = {
  visible: boolean;
  title: string;
  users: ProfileConnectionUser[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onToggleFollow: (
    userId: string,
    isFollowing: boolean,
  ) => Promise<void>;
};

export default function ProfileConnectionsModal({
  visible,
  title,
  users,
  isLoading,
  error,
  onClose,
  onToggleFollow,
}: Props) {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const [followingById, setFollowingById] = useState<Record<string, boolean>>(
    {},
  );
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    setFollowingById(
      Object.fromEntries(
        users
          .filter((user): user is ProfileConnectionUser & { _id: string } =>
            Boolean(user._id ?? user.id),
          )
          .map((user) => [
            user._id ?? user.id,
            user.isFollowing ?? title === "Following",
          ]),
      ),
    );
  }, [title, users]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          { backgroundColor: colors.background, paddingTop: spacing.xl },
        ]}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, padding: spacing.xl },
          ]}
        >
          <View style={styles.titleRow}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes.lg,
                fontWeight: typography.weights.bold,
              }}
            >
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: spacing.xl }}
            />
          ) : error ? (
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
                marginVertical: spacing.xl,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(user, index) =>
                user._id ?? user.id ?? user.email ?? `connection-${index}`
              }
              contentContainerStyle={
                users.length === 0 ? styles.emptyList : undefined
              }
              renderItem={({ item }) => {
                const name = item.name ?? item.username ?? item.email ?? "User";
                const avatarUri = imgSrc(item.avatar, "profile");

                const userId = item._id ?? item.id;
                const isFollowing =
                  (userId ? followingById[userId] : undefined) ??
                  item.isFollowing ??
                  title === "Following";
                const isBusy = userId === busyUserId;

                return (
                  <View style={styles.userRow}>
                    <TouchableOpacity
                      activeOpacity={0.65}
                      disabled={!userId}
                      onPress={() => {
                        if (!userId) return;
                        onClose();
                        void router.push(`/profile/${userId}`);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${name}'s profile`}
                      style={styles.userInfo}
                    >
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={[
                          styles.avatar,
                          { backgroundColor: colors.secondary },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: colors.primary },
                        ]}
                      >
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
                    {userId && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={isBusy}
                        onPress={() => {
                          setBusyUserId(userId);
                          void onToggleFollow(userId, isFollowing)
                            .then(() => {
                              setFollowingById((current) => ({
                                ...current,
                                [userId]: !isFollowing,
                              }));
                            })
                            .catch((error: unknown) => {
                              Alert.alert(
                                isFollowing
                                  ? "Couldn't unfollow user"
                                  : "Couldn't follow user",
                                error instanceof Error
                                  ? error.message
                                  : "Please try again.",
                              );
                            })
                            .finally(() => setBusyUserId(null));
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isFollowing
                            ? `Unfollow ${name}`
                            : `Follow ${name}`
                        }
                        style={[
                          styles.followButton,
                          {
                            backgroundColor: isFollowing
                              ? colors.secondary
                              : colors.primary,
                          },
                        ]}
                      >
                        {isBusy ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              isFollowing
                                ? colors.foreground
                                : colors.primaryForeground
                            }
                          />
                        ) : (
                          <Text
                            style={{
                              color: isFollowing
                                ? colors.foreground
                                : colors.primaryForeground,
                              fontSize: typography.sizes.xs,
                              fontWeight: typography.weights.bold,
                            }}
                          >
                            {isFollowing ? "Unfollow" : "Follow"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.sm,
                    textAlign: "center",
                  }}
                >
                  No {title.toLowerCase()} yet.
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-start",
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    minHeight: 220,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  userRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  userInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  followButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 76,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
