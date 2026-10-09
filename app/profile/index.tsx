import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import GridFeed from "@/components/profile/GridFeed";
import MinimalTabBar, {
  type ProfileTab,
} from "@/components/profile/MinimalTabBar";
import ProfileHeader from "@/components/profile/ProfileHeader";

import { blogApi } from "@/api/services";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog } from "@/types";
import Navbar from "@/components/NavBar";

// Your theme has no "destructive" token, so errors use this fixed red.
const ERROR_COLOR = "#DC2626";

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

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [blogsError, setBlogsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [busyBlogId, setBusyBlogId] = useState<string | null>(null);

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
      setProfile(profileResult.value.data.profile ?? null);
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

  const itemsByTab: Record<ProfileTab, Blog[]> = {
    posts: published,
    saved,
    drafts,
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

  const handlePressItem = (blog: Blog) => {
    if (activeTab === "drafts") {
      void router.push(`/profile/drafts/${blog.slug}`);
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
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const emptyAction =
    activeTab === "saved" ? undefined : () => void router.push("/blog/create");

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
            posts: published.length,
            saved: savedRaw.length,
            drafts: drafts.length,
          }}
          onEdit={() => void router.push("/profile/edit")}
          onAnalytics={() => void router.push("/profile/analytics")}
          onCreate={() => void router.push("/blog/create")}
          onOpenLink={(value) => void openExternal(value)}
        />

        <MinimalTabBar
          activeTab={activeTab}
          setTab={setActiveTab}
          draftsCount={drafts.length}
        />

        <View style={{ minHeight: 420 }}>
          {!!profileError && (
            <Text
              style={{
                color: ERROR_COLOR,
                fontSize: typography.sizes.sm,
                paddingHorizontal: spacing.xl,
                paddingTop: spacing.md,
              }}
            >
              {profileError}
            </Text>
          )}

          {blogsError && activeTab !== "saved" ? (
            <Text
              style={{
                color: ERROR_COLOR,
                fontSize: typography.sizes.sm,
                padding: spacing.xl,
                textAlign: "center",
              }}
            >
              {blogsError} Pull down to try again.
            </Text>
          ) : (
            // Re-mounts on tab change so the cards stagger in fresh.
            <Animated.View
              key={activeTab}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(100)}
            >
              <GridFeed
                items={itemsByTab[activeTab]}
                type={activeTab}
                busyId={busyBlogId}
                onPressItem={handlePressItem}
                onLongPressItem={handleLongPressItem}
                onEmptyAction={emptyAction}
              />
            </Animated.View>
          )}
        </View>
      </ScrollView>
      <Navbar />
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
