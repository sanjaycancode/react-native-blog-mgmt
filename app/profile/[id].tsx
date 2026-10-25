import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import GridFeed, { GridSkeleton } from "@/components/home/GridFeed";
import EmptyState from "@/components/profile/EmptyState";
import ProfileConnectionsModal from "@/components/profile/ProfileConnectionsModal";
import PublicProfileHeader, {
  BackButton,
  PublicProfileSkeleton,
} from "@/components/profile/PublicProfileHeader";
import Button from "@/components/ThemedButton";

import { blogApi } from "@/api/services";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { WEBSITE_URL } from "@/constants/config";
import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import { useProfileConnections } from "@/hooks/useProfileConnections";

import { getErrorMessage } from "@/utils/errorMessage";
import { getOwnerId } from "@/utils/profileHelpers";

import type { Blog } from "@/types";

type Status = "loading" | "ready" | "notfound" | "login" | "error";

function getStatusCode(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

function isProfileMissing(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    getStatusCode(error) === 400 ||
    getStatusCode(error) === 404 ||
    message.includes("doesn't exist") ||
    message.includes("profile not found")
  );
}

function getExternalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const { session } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsFailed, setBlogsFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const myId = getOwnerId(session?.user as { _id?: string; id?: string });

  // Followers/following modal logic lives in the shared hook.
  const connections = useProfileConnections({
    profileUserId: id,
    viewerId: myId,
    setProfile,
  });

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setStatus("loading");

      const [profileResult, blogsResult, statusResult] =
        await Promise.allSettled([
          profileApi.getById(id),
          blogApi.getByAuthor(id),
          profileApi.getFollowStatus(id),
        ]);

      if (profileResult.status === "rejected") {
        if (!isProfileMissing(profileResult.reason)) {
          if (getStatusCode(profileResult.reason) === 401) {
            return setStatus("login");
          }
          return setStatus("error");
        }
      }

      const nextProfile =
        profileResult.status === "fulfilled"
          ? (profileResult.value.data.profile ?? null)
          : null;
      const profileForView: ProfileData = nextProfile ?? {
        user: { id, name: "Writer", email: "" },
      };

      const followStatus =
        statusResult.status === "fulfilled" ? statusResult.value : undefined;
      const [followersResult, followingResult] = await Promise.allSettled([
        profileApi.getFollowers(id),
        profileApi.getFollowing(id),
      ]);
      const followersCount =
        followersResult.status === "fulfilled"
          ? followersResult.value.count
          : undefined;
      const followingCount =
        followingResult.status === "fulfilled"
          ? followingResult.value.count
          : undefined;
      setProfile((currentProfile) => ({
        ...profileForView,
        isFollowing:
          followStatus?.isFollowing ??
          followStatus?.result?.isFollowing ??
          profileForView.isFollowing ??
          currentProfile?.isFollowing,
        followersCount:
          followersCount ??
          followStatus?.followersCount ??
          followStatus?.result?.followersCount ??
          profileForView.followersCount ??
          profileForView.user?.followersCount ??
          currentProfile?.followersCount,
        followingCount:
          followingCount ??
          followStatus?.followingCount ??
          followStatus?.result?.followingCount ??
          profileForView.followingCount ??
          profileForView.user?.followingCount ??
          currentProfile?.followingCount,
      }));
      setBlogs(
        blogsResult.status === "fulfilled"
          ? (blogsResult.value.data.result ?? [])
          : [],
      );
      setBlogsFailed(blogsResult.status === "rejected");
      setStatus("ready");
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // If you're looking at yourself, show the full (private) profile instead.
  const profileUserId = (profile?.user as { _id?: string } | undefined)?._id;
  useEffect(() => {
    if (myId && (myId === id || myId === profileUserId)) {
      router.replace("/profile");
    }
  }, [myId, id, profileUserId, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const handleToggleFollow = useCallback(async () => {
    if (!id || !profile) return;
    if (!session) {
      void router.push("/login");
      return;
    }

    setIsFollowLoading(true);
    const wasFollowing = profile.isFollowing === true;
    try {
      if (wasFollowing) {
        await profileApi.unfollowUser(id);
      } else {
        await profileApi.followUser(id);
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: !wasFollowing,
              followersCount: Math.max(
                0,
                (current.followersCount ?? 0) + (wasFollowing ? -1 : 1),
              ),
            }
          : current,
      );
      await load(true);
    } catch (error) {
      Alert.alert(
        wasFollowing ? "Couldn't unfollow user" : "Couldn't follow user",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsFollowLoading(false);
    }
  }, [id, load, profile, router, session]);

  // Visitors only ever see published posts, even if the API sends more.
  const published = useMemo(
    () => blogs.filter((b) => String(b.status) === "published"),
    [blogs],
  );
  const name = profile?.user?.name ?? "This writer";
  const firstName = name.trim().split(" ")[0];

  const handleShare = async () => {
    const profileUrl = `${WEBSITE_URL}/authors/${encodeURIComponent(id)}`;
    try {
      await Share.share({
        message: `Check out this author's profile: ${profileUrl}`,
        title: "Author profile", // Android only (share dialog title)
      });
    } catch {
      // user dismissed or share failed; nothing to do
    }
  };

  const openExternal = async (value: string) => {
    try {
      await Linking.openURL(getExternalHref(value));
    } catch {
      Alert.alert("Unable to open link", "This link could not be opened.");
    }
  };

  // ---- Non-ready states ---------------------------------------------------

  if (status !== "ready") {
    const message = {
      notfound: {
        icon: "person-remove-outline" as const,
        title: "Profile not found",
        body: "This profile doesn't exist or may have been removed.",
      },
      login: {
        icon: "lock-closed-outline" as const,
        title: "Log in to view this profile",
        body: "You need to be signed in to see this writer's page.",
      },
      error: {
        icon: "cloud-offline-outline" as const,
        title: "Couldn't load this profile",
        body: "Check your connection and try again.",
      },
    }[status === "loading" ? "error" : status];

    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {status === "loading" ? (
          <ScrollView scrollEnabled={false}>
            <PublicProfileSkeleton onBack={goBack} />
            <GridSkeleton count={4} />
          </ScrollView>
        ) : (
          <View style={{ padding: spacing.xl }}>
            <BackButton onPress={goBack} />
            <View style={styles.stateBox}>
              <Ionicons
                name={message.icon}
                size={32}
                color={colors.mutedForeground}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: typography.sizes.xl,
                  fontWeight: typography.weights.bold,
                  marginTop: spacing.md,
                }}
              >
                {message.title}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.sizes.sm,
                  textAlign: "center",
                  marginTop: spacing.xs,
                  marginBottom: spacing.lg,
                }}
              >
                {message.body}
              </Text>
              {status === "login" ? (
                <Button
                  title="Log in"
                  variant="filled"
                  onPress={() => void router.push("/login")}
                />
              ) : status === "error" ? (
                <Button
                  title="Try again"
                  variant="outlined"
                  onPress={() => void load()}
                />
              ) : (
                <Button title="Go back" variant="outlined" onPress={goBack} />
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ---- Ready --------------------------------------------------------------

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <PublicProfileHeader
          profile={profile}
          postsCount={published.length}
          onBack={goBack}
          onShare={() => void handleShare()}
          onToggleFollow={() => void handleToggleFollow()}
          isFollowing={profile?.isFollowing ?? false}
          isFollowLoading={isFollowLoading}
          onConnections={(type) => void connections.open(type)}
          onOpenLink={(value) => void openExternal(value)}
        />

        {/* A single "tab": visitors only get Posts */}
        <View
          style={[styles.postsTab, { borderBottomColor: colors.border }]}
          accessibilityRole="tablist"
        >
          <Ionicons name="grid" size={22} color={colors.foreground} />
          <View
            style={[styles.indicator, { backgroundColor: colors.foreground }]}
          />
        </View>

        {blogsFailed ? (
          <View style={[styles.stateBox, { padding: spacing.xl }]}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
                marginBottom: spacing.md,
              }}
            >
              Posts are unavailable right now.
            </Text>
            <Button
              title="Try again"
              variant="outlined"
              onPress={() => void load(true)}
            />
          </View>
        ) : published.length > 0 ? (
          <GridFeed
            items={published}
            type="posts"
            onPressItem={(blog) => void router.push(`/blog/${blog.slug}`)}
          />
        ) : (
          <EmptyState
            type="posts"
            title="Nothing published yet"
            body={`${firstName} hasn't shared any posts yet. Check back soon.`}
          />
        )}
      </ScrollView>

      <ProfileConnectionsModal
        visible={connections.type !== null}
        title={connections.type === "following" ? "Following" : "Followers"}
        users={connections.connections}
        isLoading={connections.isLoading}
        error={connections.error}
        followingIds={connections.followingIds}
        currentUserId={myId}
        onClose={connections.close}
        onToggleFollow={connections.toggleFollow}
        isOwn={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  postsTab: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    width: 28,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
