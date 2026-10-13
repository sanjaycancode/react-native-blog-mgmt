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

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/profile/EmptyState";
import GridFeed, { GridSkeleton } from "@/components/home/GridFeed";
import PublicProfileHeader, {
  BackButton,
  PublicProfileSkeleton,
} from "@/components/profile/PublicProfileHeader";
import Button from "@/components/ThemedButton";

import { blogApi } from "@/api/services";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

// ⚠️ Same auth hook used everywhere else
import { useAuth } from "@/context/AuthContext";

import type { Blog } from "@/types";

// Set this to your production site so shared links open the right page.
const SITE_URL = "http://localhost:8081/";

type Status = "loading" | "ready" | "notfound" | "login" | "error";

function getStatusCode(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
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

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setStatus("loading");

      // ⚠️ Wire these two to your backend (see notes). Same response shapes
      // as profileApi.get() and blogApi.list().
      const [profileResult, blogsResult] = await Promise.allSettled([
        profileApi.getById(id),
        blogApi.getByAuthor(id),
      ]);

      if (profileResult.status === "rejected") {
        const code = getStatusCode(profileResult.reason);
        if (code === 404 || code === 400) return setStatus("notfound");
        if (code === 401) return setStatus("login");
        return setStatus("error");
      }

      const nextProfile = profileResult.value.data.profile ?? null;
      if (!nextProfile) return setStatus("notfound");

      setProfile(nextProfile);
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
  const me = session?.user as { _id?: string; id?: string } | undefined;
  const myId = me?._id ?? me?.id;
  const profileUserId = (profile?.user as { _id?: string } | undefined)?._id;
  useEffect(() => {
    if (myId && (myId === id || myId === profileUserId)) {
      router.replace("/profile");
    }
  }, [myId, id, profileUserId, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load(true);
    setIsRefreshing(false);
  }, [load]);

  // Visitors only ever see published posts, even if the API sends more.
  const published = useMemo(
    () => blogs.filter((b) => String(b.status) === "published"),
    [blogs],
  );
  const topicsCount = useMemo(() => {
    const titles = published
      .map((b) => (b.category as { title?: string } | undefined)?.title)
      .filter(Boolean);
    return new Set(titles).size;
  }, [published]);

  const name = profile?.user?.name ?? "This writer";
  const firstName = name.trim().split(" ")[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${name} on Nepal Can Blog: ${SITE_URL}profile/${id}`,
      });
    } catch {
      // Dismissed or unsupported; nothing to do.
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
          topicsCount={topicsCount}
          onBack={goBack}
          onShare={() => void handleShare()}
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
