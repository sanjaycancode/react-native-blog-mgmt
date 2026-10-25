import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import type { ProfileConnectionUser } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import ConnectionRow from "./connectionRow";

type Props = {
  visible: boolean;
  title: string;
  users: ProfileConnectionUser[];
  isLoading: boolean;
  error: string | null;
  followingIds?: Set<string>;
  currentUserId?: string;
  onClose: () => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => Promise<void>;
  isOwn: boolean;
};

const EMPTY_SET: Set<string> = new Set();

const getKey = (user: ProfileConnectionUser, index: number) =>
  user._id ?? user.id ?? user.email ?? `connection-${index}`;

export default function ProfileConnectionsModal({
  visible,
  title,
  users,
  isLoading,
  error,
  followingIds = EMPTY_SET,
  currentUserId,
  onClose,
  onToggleFollow,
  isOwn,
}: Props) {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const handlePressUser = useCallback(
    (userId: string) => {
      onClose();
      void router.push(`/profile/${userId}`);
    },
    [onClose, router],
  );

  const handleToggle = useCallback(
    (userId: string, isFollowing: boolean) => {
      setBusyUserId(userId);
      onToggleFollow(userId, isFollowing)
        .catch((e: unknown) => {
          Alert.alert(
            isFollowing ? "Couldn't unfollow user" : "Couldn't follow user",
            e instanceof Error ? e.message : "Please try again.",
          );
        })
        .finally(() => setBusyUserId(null));
    },
    [onToggleFollow],
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginVertical: spacing.xl }}
        />
      );
    }

    if (error) {
      return (
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
      );
    }

    return (
      <FlatList
        data={users}
        keyExtractor={getKey}
        extraData={[followingIds, busyUserId]}
        contentContainerStyle={
          users.length === 0 ? styles.emptyList : undefined
        }
        renderItem={({ item }) => {
          const userId = item._id ?? item.id;
          return (
            <ConnectionRow
              user={item}
              isFollowing={userId ? followingIds.has(userId) : false}
              isBusy={!!userId && userId === busyUserId}
              showFollowButton={userId !== currentUserId}
              onPressUser={handlePressUser}
              onToggleFollow={handleToggle}
              isOwn={isOwn}
            />
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
    );
  };

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
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {renderBody()}
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
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
