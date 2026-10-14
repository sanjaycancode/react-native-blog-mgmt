import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import LogoLoader from "@/components/LogoLoader";
import type { DraftSection } from "@/components/profile/DraftSectionSwitcher";
import type { ProfileTab } from "@/components/profile/MinimalTabBar";
import ProfileConnectionsModal from "@/components/profile/ProfileConnectionsModal";
import ProfileContent from "@/components/profile/ProfileContent";
import ProfileHeader from "@/components/profile/ProfileHeader";

import { blogApi } from "@/api/services";
import { getFollowUsers } from "@/api/services/follow";
import {
  profileApi,
  type ProfileConnectionsResponse,
  type ProfileConnectionUser,
  type ProfileData,
  resolveProfileConnections,
} from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog } from "@/types";

function getStatusCode(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

function isProfileMissing(error: unknown): boolean {
  return (
    getStatusCode(error) === 400 ||
    getErrorMessage(error).toLowerCase().includes("doesn't exist")
  );
}

function getExternalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getOwnerId(value: { _id?: string; id?: string } | undefined) {
  return value?._id ?? value?.id;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { logout, session } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [blogsError, setBlogsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [draftSection, setDraftSection] = useState<DraftSection>("drafts");
  const [busyBlogId, setBusyBlogId] = useState<string | null>(null);
  const [connectionsType, setConnectionsType] = useState<
    "followers" | "following" | null
  >(null);
  const [connections, setConnections] = useState<ProfileConnectionUser[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const handleLogout = () => {
    Alert.alert("Log out?", "You'll need need to sign in again. ", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/");
          } catch {
            Alert.alert("Logout failed", "Please try again");
          }
        },
      },
    ]);
  };

  const openExternal = useCallback(async (value: string) => {
    try {
      await Linking.openURL(getExternalHref(value));
    } catch {
      Alert.alert("Unable to open link", "This link could not be opened.");
    }
  }, []);

  const loadData = useCallback(async () => {
    const [profileResult, blogsResult] = await Promise.allSettled([
      profileApi.get(),
      blogApi.myBlogs(),
    ]);

    if (
      (profileResult.status === "rejected" &&
        getStatusCode(profileResult.reason) === 401) ||
      (blogsResult.status === "rejected" &&
        getStatusCode(blogsResult.reason) === 401)
    ) {
      router.replace("/login");
      return;
    }

    if (profileResult.status === "fulfilled") {
      const profileData = profileResult.value.data.profile ?? null;
      if (profileData?.user) {
        profileData.followersCount ??= profileData.user.followersCount;
        profileData.followingCount ??= profileData.user.followingCount;
      }
      if (profileData?.savedBlogs?.length) {
        const savedEntries = profileData.savedBlogs;
        const savedIds = savedEntries
          .filter((entry): entry is string => typeof entry === "string")
          .filter((id) => id.length > 0);
        if (savedIds.length > 0) {
          const resolved = await Promise.allSettled(
            savedIds.map((id) => blogApi.getById(id)),
          );
          const resolvedById = new Map<string, Blog>();
          resolved.forEach((result) => {
            if (result.status === "fulfilled") {
              const blog = result.value.data.result;
              resolvedById.set(blog._id, blog);
            }
          });
          profileData.savedBlogs = savedEntries.map((entry) =>
            typeof entry === "string"
              ? (resolvedById.get(entry) ?? entry)
              : entry,
          );
        }
      }
      setProfile(profileData);
      setProfileError(null);
    } else if (isProfileMissing(profileResult.reason)) {
      setProfile(null);
      setProfileError(null);
    } else {
      setProfileError("Unable to load your profile.");
    }

    if (blogsResult.status === "fulfilled") {
      setBlogs(blogsResult.value.data.result ?? []);
      setBlogsError(null);
    } else {
      setBlogsError("Your blogs are unavailable right now.");
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadData().finally(() => setIsLoading(false));
    }, [loadData]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // ---- Derived data -------------------------------------------------------

  const published = useMemo(
    () => blogs.filter((b) => String(b.status) === "published"),
    [blogs],
  );
  const drafts = useMemo(
    () => blogs.filter((b) => String(b.status) === "draft"),
    [blogs],
  );
  const submitted = useMemo(
    () => blogs.filter((b) => String(b.status) === "submitted"),
    [blogs],
  );
  const rejected = useMemo(
    () => blogs.filter((b) => String(b.status) === "rejected"),
    [blogs],
  );
  // savedBlogs may hold populated blog objects or plain ids. Only objects can
  // be rendered as cards, but every non-empty entry counts toward the stat.
  const savedRaw = useMemo(
    () =>
      (
        (profile?.savedBlogs ?? []) as unknown as (Blog | string | null)[]
      ).filter(Boolean),
    [profile],
  );
  const saved = useMemo(
    () => savedRaw.filter((b): b is Blog => typeof b === "object"),
    [savedRaw],
  );
  const currentUserId = getOwnerId(profile?.user) ?? getOwnerId(session?.user);

  const openConnections = useCallback(
    async (type: "followers" | "following") => {
      if (!currentUserId) {
        setConnectionsError("Unable to identify this profile.");
        setConnectionsType(type);
        return;
      }

      setConnectionsType(type);
      setConnections([]);
      setConnectionsError(null);
      setConnectionsLoading(true);
      try {
        const response =
          type === "followers"
            ? await profileApi.getFollowers(currentUserId)
            : await profileApi.getFollowing(currentUserId);
        const data = response as unknown as ProfileConnectionsResponse;
        const connectionUsers = getFollowUsers(data);
        setConnections(await resolveProfileConnections(connectionUsers));
        setProfile((current) =>
          current
            ? {
                ...current,
                ...(type === "followers"
                  ? { followersCount: data.count }
                  : { followingCount: data.count }),
              }
            : current,
        );
      } catch (error) {
        setConnectionsError(getErrorMessage(error));
      } finally {
        setConnectionsLoading(false);
      }
    },
    [currentUserId],
  );
  const toggleConnectionFollow = useCallback(
    async (userId: string, isFollowing: boolean) => {
      if (isFollowing) {
        await profileApi.unfollowUser(userId);
      } else {
        await profileApi.followUser(userId);
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              followingCount: Math.max(
                0,
                (current.followingCount ?? 0) + (isFollowing ? -1 : 1),
              ),
            }
          : current,
      );
    },
    [],
  );
  const posts = useMemo(() => {
    const byId = new Map(published.map((blog) => [blog._id, blog]));
    saved
      .filter(
        (blog) =>
          String(blog.status) === "published" &&
          getOwnerId(blog.author) === currentUserId,
      )
      .forEach((blog) => byId.set(blog._id, blog));
    return Array.from(byId.values());
  }, [currentUserId, published, saved]);

  const itemsByTab: Record<ProfileTab, Blog[]> = {
    posts,
    saved,
    drafts,
    submitted,
    rejected,
  };

  // ---- Actions ------------------------------------------------------------

  const handleDeleteBlog = (blogId: string) => {
    Alert.alert("Delete this blog?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyBlogId(blogId);
          try {
            await blogApi.delete(blogId);
            setBlogs((prev) => prev.filter((b) => b._id !== blogId));
          } catch (error) {
            Alert.alert("Couldn't delete blog", getErrorMessage(error));
          } finally {
            setBusyBlogId(null);
          }
        },
      },
    ]);
  };

  const handleUnpublishBlog = async (blogId: string) => {
    setBusyBlogId(blogId);
    try {
      await blogApi.unpublish(blogId);
      setBlogs((prev) =>
        prev.map((b) =>
          b._id === blogId ? ({ ...b, status: "unpublished" } as Blog) : b,
        ),
      );
    } catch (error) {
      Alert.alert("Couldn't unpublish blog", getErrorMessage(error));
    } finally {
      setBusyBlogId(null);
    }
  };

  const handleRemoveSaved = async (blog: Blog) => {
    setBusyBlogId(blog._id);
    try {
      await profileApi.removeSavedBlog(blog._id);
      setProfile((current) =>
        current
          ? {
              ...current,
              savedBlogs: (current.savedBlogs ?? []).filter((entry) =>
                typeof entry === "string"
                  ? entry !== blog._id
                  : (entry as Blog)?._id !== blog._id,
              ),
            }
          : current,
      );
    } catch (error) {
      Alert.alert("Couldn't remove saved blog", getErrorMessage(error));
    } finally {
      setBusyBlogId(null);
    }
  };

  const handlePressItem = (blog: Blog) => {
    if (activeTab === "drafts" || activeTab === "submitted") {
      if (draftSection === "drafts") {
        void router.push(`/profile/drafts/${blog.slug}`);
      } else {
        void router.push(`/profile/${draftSection}/${blog.slug}`);
      }
    } else {
      void router.push(`/blog/${blog.slug}`);
    }
  };

  // Long-press opens a native action sheet; saved items have no owner actions.
  const handleLongPressItem =
    activeTab === "saved"
      ? undefined
      : (blog: Blog) => {
          const actions: {
            text: string;
            style?: "cancel" | "destructive";
            onPress?: () => void;
          }[] = [];

          if (activeTab === "posts") {
            actions.push({
              text: "Unpublish",
              onPress: () =>
                Alert.alert(
                  "Unpublish this blog?",
                  "Readers won't be able to see it until you publish it again.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Unpublish",
                      onPress: () => void handleUnpublishBlog(blog._id),
                    },
                  ],
                ),
            });
          }
          actions.push({
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteBlog(blog._id),
          });
          actions.push({ text: "Cancel", style: "cancel" });

          Alert.alert(blog.title, undefined, actions);
        };

  // ---- Render -------------------------------------------------------------

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <LogoLoader />
      </SafeAreaView>
    );
  }

  const emptyAction =
    activeTab === "drafts" && draftSection === "drafts"
      ? () => void router.push("/blog/create")
      : undefined;
  const feedTab = activeTab === "drafts" ? draftSection : activeTab;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        style={{ flex: 1 }}
        // Index 1 = the tab bar, so it pins to the top while the grid scrolls.
        stickyHeaderIndices={[1]}
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
        <ProfileHeader
          profile={profile}
          counts={{
            posts: posts.length,
          }}
          onConnections={(type) => void openConnections(type)}
          onEdit={() => void router.push("/profile/edit")}
          onAnalytics={() => void router.push("/profile/analytics")}
          onCreate={() => void router.push("/blog/create")}
          onOpenLink={(value) => void openExternal(value)}
          onLogout={handleLogout}
        />

        <ProfileContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          draftsCount={drafts.length}
          draftSection={draftSection}
          setDraftSection={setDraftSection}
          profileError={profileError}
          blogsError={blogsError}
          feedTab={feedTab}
          items={itemsByTab}
          busyBlogId={busyBlogId}
          onPressItem={handlePressItem}
          onLongPressItem={handleLongPressItem}
          onRemoveSaved={activeTab === "saved" ? handleRemoveSaved : undefined}
          onEmptyAction={emptyAction}
        />
      </ScrollView>
      <ProfileConnectionsModal
        visible={connectionsType !== null}
        title={connectionsType === "following" ? "Following" : "Followers"}
        users={connections}
        isLoading={connectionsLoading}
        error={connectionsError}
        onClose={() => setConnectionsType(null)}
        onToggleFollow={toggleConnectionFollow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
