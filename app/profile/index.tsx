import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import LogoLoader from "@/components/LogoLoader";
import type { DraftSection } from "@/components/profile/DraftSectionSwitcher";
import type { ProfileTab } from "@/components/profile/MinimalTabBar";
import ProfileConnectionsModal from "@/components/profile/ProfileConnectionsModal";
import ProfileContent from "@/components/profile/ProfileContent";
import ProfileHeader from "@/components/profile/ProfileHeader";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import { useBlogActions } from "@/hooks/useBlogActions";
import { useProfileConnections } from "@/hooks/useProfileConnections";
import { useProfileData } from "@/hooks/useProfileData";

import { getExternalHref, getOwnerId } from "@/utils/profileHelpers";

import type { Blog } from "@/types";

const byStatus = (blogs: Blog[], status: string) =>
  blogs.filter((b) => String(b.status) === status);

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { logout, session } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [draftSection, setDraftSection] = useState<DraftSection>("drafts");

  const {
    profile,
    setProfile,
    blogs,
    setBlogs,
    isLoading,
    isRefreshing,
    profileError,
    blogsError,
    refresh,
  } = useProfileData();

  const currentUserId = getOwnerId(profile?.user) ?? getOwnerId(session?.user);

  const connections = useProfileConnections({
    profileUserId: currentUserId,
    viewerId: currentUserId,
    setProfile,
  });
  const { busyBlogId, confirmDelete, confirmUnpublish, removeSaved } =
    useBlogActions({ setBlogs, setProfile });

  // ---- Derived data -------------------------------------------------------

  const published = useMemo(() => byStatus(blogs, "published"), [blogs]);
  const drafts = useMemo(() => byStatus(blogs, "draft"), [blogs]);
  const submitted = useMemo(() => byStatus(blogs, "submitted"), [blogs]);
  const rejected = useMemo(() => byStatus(blogs, "rejected"), [blogs]);

  // savedBlogs may hold populated blog objects or plain ids; only objects render.
  const saved = useMemo(
    () =>
      (
        (profile?.savedBlogs ?? []) as unknown as (Blog | string | null)[]
      ).filter((b): b is Blog => typeof b === "object" && b !== null),
    [profile],
  );

  const posts = useMemo(() => {
    const byId = new Map(published.map((b) => [b._id, b]));
    saved
      .filter(
        (b) =>
          String(b.status) === "published" &&
          getOwnerId(b.author) === currentUserId,
      )
      .forEach((b) => byId.set(b._id, b));
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

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again.", [
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

  const handlePressItem = (blog: Blog) => {
    if (activeTab === "drafts" || activeTab === "submitted") {
      const section = draftSection === "drafts" ? "drafts" : draftSection;
      void router.push(`/profile/${section}/${blog.slug}`);
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
              onPress: () => confirmUnpublish(blog._id),
            });
          }
          actions.push({
            text: "Delete",
            style: "destructive",
            onPress: () => confirmDelete(blog._id),
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
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <ProfileHeader
          profile={profile}
          counts={{ posts: posts.length }}
          onConnections={(type) => void connections.open(type)}
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
          onRemoveSaved={activeTab === "saved" ? removeSaved : undefined}
          onEmptyAction={emptyAction}
        />
      </ScrollView>

      <ProfileConnectionsModal
        visible={connections.type !== null}
        title={connections.type === "following" ? "Following" : "Followers"}
        users={connections.connections}
        isLoading={connections.isLoading}
        error={connections.error}
        followingIds={connections.followingIds}
        currentUserId={currentUserId}
        onClose={connections.close}
        onToggleFollow={connections.toggleFollow}
        isOwn = {true}
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
