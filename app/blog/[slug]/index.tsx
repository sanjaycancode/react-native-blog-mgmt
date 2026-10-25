import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import RenderHTML from "@native-html/render";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BlogComments } from "@/components/BlogComments";
import { HeaderBackButton } from "@/components/HeaderBackButton";
import SaveBlogButton from "@/components/SaveBlogButton";
import { ThemedButton } from "@/components/ThemedButton";

import { blogApi } from "@/api/services";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { Blog } from "@/types/blog";

import { getErrorMessage } from "@/utils/errorMessage";

import { env } from "@/lib/config/env";
import { ThemedFAB } from "@/components/ThemedFAB";

const PAD = 16;
const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getAssetUri(
  asset?: string | { key?: string; url?: string },
  folder = "blogs",
) {
  if (!asset) return undefined;
  if (typeof asset !== "string" && asset.url) return asset.url;

  const path = typeof asset === "string" ? asset : asset.key;
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;

  return `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/${folder}/${path.replace(/^\/+/, "")}`;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function getPlainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getReadingTime(html: string) {
  const wordCount = getPlainText(html).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
}

function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  unpublished: "Unpublished",
  submitted: "In review",
  rejected: "Rejected",
};

function TopIconButton({
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.topButton,
        { backgroundColor: colors.secondary, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={19} color={colors.foreground} />
    </Pressable>
  );
}

function TopBar({
  title,
  onBack,
  right,
  scrollY,
  titleEnd,
  contentH,
  viewH,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  scrollY: SharedValue<number>;
  titleEnd: SharedValue<number>;
  contentH: SharedValue<number>;
  viewH: SharedValue<number>;
}) {
  const { colors, typography } = useTheme();

  const titleStyle = useAnimatedStyle(() => {
    const end = titleEnd.value;
    if (end <= 0) return { opacity: 0 };
    const range = [end - 56, end - 12];
    return {
      opacity: interpolate(scrollY.value, range, [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            range,
            [8, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const lineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 12], [0, 1], Extrapolation.CLAMP),
  }));

  const progressStyle = useAnimatedStyle(() => {
    const max = contentH.value - viewH.value;
    const p = max > 0 ? Math.min(Math.max(scrollY.value / max, 0), 1) : 0;
    return { width: `${p * 100}%` };
  });

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={styles.topRow}>
        <View style={styles.topSide}>
          <HeaderBackButton onPress={onBack} />
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.topTitle,
            {
              color: colors.foreground,
              fontSize: typography.sizes.base,
              fontWeight: typography.weights.bold,
            },
            titleStyle,
          ]}
        >
          {title}
        </Animated.Text>
        <View style={[styles.topSide, { justifyContent: "flex-end" }]}>
          {right}
        </View>
      </View>
      <Animated.View
        style={[styles.hairline, { backgroundColor: colors.border }, lineStyle]}
      />
      <Animated.View
        style={[
          styles.progress,
          { backgroundColor: colors.primary },
          progressStyle,
        ]}
      />
    </View>
  );
}

function LikeButton({
  liked,
  count,
  busy,
  onPress,
}: {
  liked: boolean;
  count: number;
  busy: boolean;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        if (!liked) {
          scale.value = withSequence(
            withSpring(1.35, { damping: 6, stiffness: 320 }),
            withSpring(1, { damping: 10, stiffness: 240 }),
          );
        }
        onPress();
      }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={liked ? "Unlike" : "Like"}
      accessibilityState={{ selected: liked }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.likeButton,
        {
          backgroundColor: liked ? colors.secondary : "transparent",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={24}
          color={liked ? colors.primary : colors.foreground}
        />
      </Animated.View>
      <Text
        style={{
          color: liked ? colors.primary : colors.foreground,
          fontSize: typography.sizes.sm,
          fontWeight: typography.weights.bold,
        }}
      >
        {compact(count)}
      </Text>
    </Pressable>
  );
}

function DetailSkeleton() {
  const { colors, spacing } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const block = { backgroundColor: colors.secondary };

  return (
    <Animated.View
      style={[{ paddingHorizontal: PAD, paddingTop: spacing.md }, style]}
    >
      <View style={[styles.skelLine, block, { width: "32%" }]} />
      <View
        style={[
          styles.skelLine,
          block,
          { width: "95%", height: 26, marginTop: 14 },
        ]}
      />
      <View
        style={[
          styles.skelLine,
          block,
          { width: "70%", height: 26, marginTop: 8 },
        ]}
      />
      <View style={styles.skelAuthor}>
        <View style={[styles.skelAvatar, block]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skelLine, block, { width: "40%" }]} />
          <View style={[styles.skelLine, block, { width: "28%" }]} />
        </View>
      </View>
      <View style={[styles.skelImage, block]} />
      {[100, 96, 100, 88, 60].map((w, i) => (
        <View
          key={i}
          style={[styles.skelLine, block, { width: `${w}%`, marginTop: 12 }]}
        />
      ))}
    </Animated.View>
  );
}

function AuthorAvatar({
  uri,
  failed,
  onError,
  name,
  size,
}: {
  uri?: string;
  failed: boolean;
  onError: () => void;
  name?: string;
  size: number;
}) {
  const { colors, typography } = useTheme();

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`${name ?? "Author"} avatar`}
        onError={onError}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text
        style={{
          color: colors.primaryForeground,
          fontSize: Math.max(typography.sizes.xs, size * 0.42),
          fontWeight: typography.weights.bold,
        }}
      >
        {name?.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

export default function BlogDetailPage() {
  const { slug: slugParam } = useLocalSearchParams<{
    slug?: string | string[];
  }>();
  const slug = getParam(slugParam);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, spacing, radii, typography } = useTheme();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [articleFontSize, setArticleFontSize] = useState(16);
  const [fontPanelOpen, setFontPanelOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollY = useSharedValue(0);
  const contentH = useSharedValue(0);
  const viewH = useSharedValue(0);
  const titleEnd = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    contentH.value = e.contentSize.height;
    viewH.value = e.layoutMeasurement.height;
  });

  // Remembers which story is on screen so pull-to-refresh updates it in place
  // instead of swapping the whole page for a skeleton.
  const loadedSlug = useRef<string | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/blog");
  }, [router]);

  const decreaseFontSize = () => {
    setArticleFontSize((size) => Math.max(12, size - 2));
  };

  const increaseFontSize = () => {
    setArticleFontSize((size) => Math.min(28, size + 2));
  };

  const selectFontSize = (size: number) => {
    setArticleFontSize(size);
  };

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    if (loadedSlug.current !== slug) {
      setLoading(true);
      setBlog(null);
      setImageFailed(false);
      setAvatarFailed(false);
      scrollY.value = 0;
      titleEnd.value = 0;
    }
    setError(null);

    blogApi
      .getBySlug(slug)
      .then((response) => {
        if (cancelled) return;
        const result = response.data.result;
        loadedSlug.current = slug;
        setBlog(result);
        setLikesCount(result.likes?.length ?? 0);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        const message = getErrorMessage(requestError);
        if (loadedSlug.current === slug) showToast(message, "error");
        else setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  useEffect(() => {
    setLiked(
      Boolean(session?.user?.id && blog?.likes?.includes(session.user.id)),
    );
  }, [blog, session?.user?.id]);

  const contentWidth = Math.max(width - PAD * 2, 1);
  const imageUri = useMemo(() => getAssetUri(blog?.image), [blog?.image]);
  const avatarUri = useMemo(
    () => getAssetUri(blog?.author?.profile?.avatar, "profiles"),
    [blog?.author?.profile?.avatar],
  );
  const isAuthor = Boolean(
    session?.user?.id && blog?.author?._id === session.user.id,
  );

  const htmlTagsStyles = useMemo(() => {
    const scale = articleFontSize / typography.sizes.base;

    return {
      body: {
        color: colors.foreground,
        fontSize: articleFontSize,
        lineHeight: Math.round(
          articleFontSize * typography.lineHeights.relaxed,
        ),
      },
      p: {
        marginTop: 0,
        marginBottom: spacing.md,
      },
      h1: {
        color: colors.foreground,
        fontSize: Math.round(typography.sizes["2xl"] * scale),
        fontWeight: typography.weights.bold,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      },
      h2: {
        color: colors.foreground,
        fontSize: Math.round(typography.sizes.xl * scale),
        fontWeight: typography.weights.bold,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      },
      h3: {
        color: colors.foreground,
        fontSize: Math.round(typography.sizes.lg * scale),
        fontWeight: typography.weights.semibold,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
      },
      li: {
        marginBottom: spacing.xs,
      },
      blockquote: {
        color: colors.mutedForeground,
        backgroundColor: colors.muted,
        borderLeftColor: colors.primary,
        borderLeftWidth: 3,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      },
      a: {
        color: colors.primary,
        textDecorationLine: "underline" as const,
      },
      code: {
        color: colors.foreground,
        backgroundColor: colors.muted,
        fontFamily: "monospace",
      },
      pre: {
        color: colors.background,
        backgroundColor: colors.foreground,
        padding: spacing.md,
      },
      img: {
        borderRadius: radii.md,
      },
    };
  }, [articleFontSize, colors, radii.md, spacing, typography]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  const handleLike = useCallback(async () => {
    if (!blog || isLiking) return;
    if (!session) {
      showToast("Log in to like this story.");
      router.push("/login");
      return;
    }
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    setIsLiking(true);
    try {
      const result = (await blogApi.toggleLike(blog._id)).data.result;
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (requestError) {
      setLiked(prevLiked);
      setLikesCount(prevCount);
      showToast(getErrorMessage(requestError), "error");
    } finally {
      setIsLiking(false);
    }
  }, [blog, isLiking, liked, likesCount, router, session, showToast]);

  const handleShare = useCallback(async () => {
    if (!blog) return;
    try {
      await Share.share({
        message: `${blog.title}\nhttps://blog-ncc19.vercel.app/blogs/${blog.slug}`,
      });
    } catch (shareError) {
      showToast(getErrorMessage(shareError), "error");
    }
  }, [blog, showToast]);

  const handleDelete = useCallback(async () => {
    if (!blog || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await blogApi.delete(blog._id);
      setDeleteModalOpen(false);
      showToast("Story deleted.");
      goBack();
    } catch (deleteError) {
      setDeleteModalOpen(false);
      showToast(getErrorMessage(deleteError), "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [blog, deleteLoading, goBack, showToast]);

  const handleHtmlLinkPress = useCallback(
    (_event: unknown, href: string) => {
      void Linking.openURL(href).catch((linkError: unknown) => {
        showToast(getErrorMessage(linkError), "error");
      });
    },
    [showToast],
  );

  const openAuthor = () => {
    const id = blog?.author?._id;
    if (id) router.push(`/profile/${id}`);
  };

  const date = formatDate(blog?.createdAt);
  const views = typeof blog?.views === "number" ? blog.views : undefined;
  const subline = [date, views !== undefined ? `${compact(views)} views` : null]
    .filter(Boolean)
    .join(" · ");
  const statusLabel =
    isAuthor && blog && blog.status !== "published"
      ? (STATUS_LABEL[blog.status] ?? blog.status)
      : null;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <TopBar
        title={blog?.title ?? ""}
        onBack={goBack}
        scrollY={scrollY}
        titleEnd={titleEnd}
        contentH={contentH}
        viewH={viewH}
        right={
          isAuthor && blog ? (
            <View style={styles.topActions}>
              <TopIconButton
                icon="create-outline"
                label="Edit story"
                onPress={() =>
                  router.push({
                    pathname: "/blog/[slug]/edit",
                    params: { slug: blog.slug },
                  })
                }
              />
              <TopIconButton
                icon="trash-outline"
                label="Delete story"
                onPress={() => setDeleteModalOpen(true)}
              />
            </View>
          ) : null
        }
      />

      {loading ? (
        <DetailSkeleton />
      ) : !blog ? (
        <View style={[styles.state, { padding: spacing.xl }]}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={colors.mutedForeground}
          />
          <Text
            style={{
              color: colors.foreground,
              fontSize: typography.sizes.lg,
              fontWeight: typography.weights.bold,
              textAlign: "center",
            }}
          >
            {error ?? "Story not found"}
          </Text>
          <View style={{ gap: spacing.sm, alignSelf: "stretch" }}>
            {error ? (
              <ThemedButton
                title="Try again"
                onPress={() => setReloadKey((key) => key + 1)}
              />
            ) : null}
            <ThemedButton title="Go back" variant="outlined" onPress={goBack} />
          </View>
        </View>
      ) : (
        <>
          <Animated.ScrollView
          
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setIsScrolled(offsetY > 80);
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <View style={{ paddingHorizontal: PAD, paddingTop: spacing.md }}>
              <View style={styles.kicker}>
                {!!blog.category?.title && (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.primary,
                      fontSize: typography.sizes.sm,
                      fontWeight: typography.weights.bold,
                      flexShrink: 1,
                    }}
                  >
                    {blog.category.title}
                  </Text>
                )}
                {!!blog.category?.title && (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: typography.sizes.sm,
                    }}
                  >
                    ·
                  </Text>
                )}
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sizes.sm,
                  }}
                >
                  {getReadingTime(blog.description ?? "")}
                </Text>
                {!!statusLabel && (
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 11,
                        fontWeight: typography.weights.bold,
                      }}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                )}
              </View>

              <View
                onLayout={(e) => {
                  titleEnd.value =
                    e.nativeEvent.layout.y + e.nativeEvent.layout.height;
                }}
              >
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: typography.sizes["2xl"],
                    fontWeight: typography.weights.heavy,
                    lineHeight: Math.round(typography.sizes["2xl"]),
                    letterSpacing: -0.5,
                    marginTop: 6,
                  }}
                >
                  {blog.title}
                </Text>
              </View>

              <Pressable
                onPress={openAuthor}
                disabled={!blog.author?._id}
                accessibilityRole="link"
                accessibilityLabel={`Open ${blog.author?.name ?? "author"}'s profile`}
                style={({ pressed }) => [
                  styles.authorRow,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <AuthorAvatar
                  uri={avatarUri}
                  failed={avatarFailed}
                  onError={() => setAvatarFailed(true)}
                  name={blog.author?.name}
                  size={36}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.foreground,
                      fontSize: typography.sizes.sm,
                      fontWeight: typography.weights.bold,
                    }}
                  >
                    {blog.author?.name ?? "Unknown author"}
                  </Text>
                  {!!subline && (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.sizes.xs,
                        marginTop: 1,
                      }}
                    >
                      {subline}
                    </Text>
                  )}
                </View>
                {!!blog.author?._id && (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.mutedForeground}
                  />
                )}
              </Pressable>

              {imageUri && !imageFailed ? (
                <Image
                  source={{ uri: imageUri }}
                  accessibilityLabel={`${blog.title} cover image`}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                  style={[
                    styles.cover,
                    {
                      backgroundColor: colors.secondary,
                      borderRadius: radii.lg,
                    },
                  ]}
                />
              ) : null}

              <View style={{ marginTop: spacing.lg }}>
                <RenderHTML
                  contentWidth={contentWidth}
                  source={{ html: blog.description ?? "" }}
                  tagsStyles={htmlTagsStyles}
                  renderersProps={{
                    a: { onPress: handleHtmlLinkPress },
                  }}
                />
              </View>

              {blog.tags?.length ? (
                <View style={[styles.tags, { marginTop: spacing.sm }]}>
                  {blog.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tag,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.secondaryForeground,
                          fontSize: typography.sizes.xs,
                          fontWeight: typography.weights.medium,
                        }}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View
              style={{
                marginTop: spacing.xl,
                marginHorizontal: PAD,
                paddingTop: spacing.lg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              }}
            >
              <BlogComments key={blog._id} blogId={blog._id} alwaysOpen />
            </View>
          </Animated.ScrollView>

          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 8),
              },
            ]}
          >
            <LikeButton
              liked={liked}
              count={likesCount}
              busy={isLiking}
              onPress={() => void handleLike()}
            />
            <View style={{ flex: 1 }} />
            <View style={styles.actionGroup}>
              {blog.status === "published" ? (
                <SaveBlogButton blogId={blog._id} />
              ) : null}
              <TopIconButton
                icon="share-outline"
                label="Share story"
                onPress={() => void handleShare()}
              />
            </View>
          </View>
          <ThemedFAB
            label="Text size"
            iconName="text"
            isScrolled={isScrolled}
            onPress={() => setFontPanelOpen(true)}
            style={{
              bottom: 100 + Math.max(insets.bottom, 8),
            }}
          />

          <Modal
            transparent
            visible={fontPanelOpen}
            animationType="slide"
            onRequestClose={() => setFontPanelOpen(false)}
          >
            <View style={styles.fontSheetRoot}>
              <Pressable
                style={styles.fontBackdrop}
                onPress={() => setFontPanelOpen(false)}
                accessibilityLabel="Close text appearance panel"
                accessibilityRole="button"
              />

              <View
                style={[
                  styles.fontSheet,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderTopLeftRadius: radii.lg,
                    borderTopRightRadius: radii.lg,
                    padding: spacing.lg,
                    paddingBottom: Math.max(insets.bottom, spacing.lg),
                  },
                ]}
              >
                <View style={styles.fontSheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: typography.sizes.lg,
                        fontWeight: typography.weights.bold,
                      }}
                    >
                      Text appearance
                    </Text>

                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.sizes.sm,
                        marginTop: spacing.xs,
                      }}
                    >
                      Adjust the size of article text.
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setFontPanelOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close text appearance"
                    hitSlop={10}
                    style={styles.fontCloseButton}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={colors.foreground}
                    />
                  </Pressable>
                </View>

                <View style={styles.fontSizeControls}>
                  <Pressable
                    onPress={decreaseFontSize}
                    disabled={articleFontSize <= 12}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease article font size"
                    style={[
                      styles.fontAdjustButton,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Ionicons
                      name="remove"
                      size={22}
                      color={
                        articleFontSize <= 12
                          ? colors.mutedForeground
                          : colors.foreground
                      }
                    />
                  </Pressable>

                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: articleFontSize,
                        fontWeight: "600",
                      }}
                    >
                      Aa
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.sizes.xs,
                        marginTop: 2,
                      }}
                    >
                      {articleFontSize}px
                    </Text>
                  </View>

                  <Pressable
                    onPress={increaseFontSize}
                    disabled={articleFontSize >= 28}
                    accessibilityRole="button"
                    accessibilityLabel="Increase article font size"
                    style={[
                      styles.fontAdjustButton,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Ionicons
                      name="add"
                      size={22}
                      color={
                        articleFontSize >= 28
                          ? colors.mutedForeground
                          : colors.foreground
                      }
                    />
                  </Pressable>
                </View>

                <Text
                  style={{
                    color: colors.foreground,
                    fontWeight: "600",
                    marginBottom: spacing.sm,
                  }}
                >
                  Text size
                </Text>

                <View style={styles.fontPresets}>
                  {[
                    { label: "Small", size: 14 },
                    { label: "Medium", size: 16 },
                    { label: "Large", size: 20 },
                  ].map((option) => {
                    const selected = articleFontSize === option.size;

                    return (
                      <Pressable
                        key={option.label}
                        onPress={() => selectFontSize(option.size)}
                        accessibilityRole="button"
                        accessibilityLabel={`${option.label} text size`}
                        accessibilityState={{ selected }}
                        style={[
                          styles.fontPreset,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.background,
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected
                              ? colors.primaryForeground
                              : colors.foreground,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={deleteModalOpen}
        onRequestClose={() => setDeleteModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setDeleteModalOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "#000", opacity: 0.45 },
            ]}
          />
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radii.lg,
                margin: spacing.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.sizes.lg,
                fontWeight: typography.weights.bold,
              }}
            >
              Delete this story?
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
                lineHeight: 20,
                marginTop: spacing.xs,
              }}
            >
              “{blog?.title}” will be removed for good. This can't be undone.
            </Text>
            <View
              style={[
                styles.dialogActions,
                { gap: spacing.sm, marginTop: spacing.lg },
              ]}
            >
              <ThemedButton
                title="Cancel"
                variant="outlined"
                disabled={deleteLoading}
                onPress={() => setDeleteModalOpen(false)}
                style={{ flex: 1 }}
              />
              <ThemedButton
                title="Delete"
                color="danger"
                loading={deleteLoading}
                onPress={() => void handleDelete()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 12,
  },
  topSide: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  topButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  progress: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
  },

  kicker: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 4,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    marginTop: 16,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
  },
  skelAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  skelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  skelImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 20,
    marginTop: 18,
    marginBottom: 6,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "center",
  },
  dialog: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  dialogActions: {
    flexDirection: "row",
  },

  fontSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  fontBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  fontSheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 20,
  },
  fontSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fontCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 4,
  },
  fontAdjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  fontPresets: {
    flexDirection: "row",
    gap: 10,
  },
  fontPreset: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
});
