import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { blogApi } from "@/api/services/blog";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";

import { type Blog } from "@/types";

import { imgSrc } from "@/utils/getImgSrc";

import { getDraftTheme } from "./appTheme";

// The backend populates author + category on this endpoint.
type DraftDetail = Omit<Blog, "author" | "category"> & {
  content?: string;
  coverImage?: Blog["image"];
  updatedAt?: string;
  author?: { _id: string; name: string; email: string };
  category?: { _id: string; title: string };
};

type ReviewStatus = "submitted" | "rejected";
type ViewState = "loading" | "ready" | "notfound" | "error";

// ── helpers ────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

/** Turns stored content (plain text or HTML from a rich editor) into readable paragraphs. */
function toParagraphs(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// ── screen ─────────────────────────────────────────────────────────────────
export default function DraftDetailScreen({
  forcedStatus,
}: {
  forcedStatus?: ReviewStatus;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const T = useMemo(() => getDraftTheme(colors), [colors]);
  const s = useMemo(() => createStyles(T), [T]);
  const { slug, status: statusParam } = useLocalSearchParams<{
    slug: string;
    status?: string;
  }>();
  const { isAuthenticated, isInitializing } = useAuth();

  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [isDeleting, setIsDeleting] = useState(false);
  const reviewStatus =
    forcedStatus ??
    (statusParam === "submitted" || statusParam === "rejected"
      ? statusParam
      : null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) router.replace("/login");
  }, [isInitializing, isAuthenticated, router]);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = reviewStatus
        ? await blogApi.getBySlug(slug)
        : await blogApi.getDraftBySlug(slug);
      setDraft(res.data.result as unknown as DraftDetail);
      setState("ready");
    } catch (e) {
      // 404 covers both "doesn't exist" and "not yours": the backend answers the same on purpose.
      const code = (e as { response?: { status?: number } })?.response?.status;
      setDraft(null);
      setState(code === 404 ? "notfound" : "error");
    }
  }, [reviewStatus, slug]);

  // Refetch on every focus so edits made in the editor show up when you come back.
  useFocusEffect(
    useCallback(() => {
      if (isInitializing || !isAuthenticated) return;
      void load();
    }, [isInitializing, isAuthenticated, load]),
  );

  const paragraphs = useMemo(
    () => toParagraphs(draft?.description || draft?.content),
    [draft?.description, draft?.content],
  );
  const words = useMemo(
    () => paragraphs.join(" ").split(/\s+/).filter(Boolean).length,
    [paragraphs],
  );
  const readMin = Math.max(1, Math.round(words / 200));
  const coverSource = draft?.image ?? draft?.coverImage;
  const cover = coverSource ? imgSrc(coverSource, "blog") : null;

  // Adjust to your real edit route (same one the drafts list uses).
  const edit = () =>
    router.push(
      reviewStatus ? `/blog/${slug}/edit` : `/profile/drafts/edit/${slug}`,
    );

  const handleDelete = () => {
    if (!draft || isDeleting) return;
    Alert.alert("Delete this blog?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await blogApi.delete(draft._id);
            router.back();
          } catch {
            Alert.alert("Couldn't delete blog", "Please try again.");
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  if (isInitializing || !isAuthenticated) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={T.primary} />
      </View>
    );
  }

  const Header = (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
        <Ionicons name="chevron-back" size={24} color={T.text} />
      </Pressable>
      <View style={s.badge}>
        <Text style={s.badgeText}>
          {reviewStatus === "submitted"
            ? "Submitted"
            : reviewStatus === "rejected"
              ? "Rejected"
              : "Draft"}
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={s.privateRow}>
        <Ionicons name="lock-closed" size={12} color={T.mute} />
        <Text style={s.privateText}>Only you</Text>
      </View>
    </View>
  );

  if (state === "loading") {
    return (
      <View style={s.screen}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        {Header}
        <View style={[s.center, { flex: 1 }]}>
          <ActivityIndicator color={T.primary} />
        </View>
      </View>
    );
  }

  if (state !== "ready" || !draft) {
    const notFound = state === "notfound";
    return (
      <View style={s.screen}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        {Header}
        <View
          style={[
            s.center,
            { flex: 1, paddingHorizontal: 36, gap: 10, paddingBottom: 80 },
          ]}
        >
          <View style={s.stateIcon}>
            <Ionicons
              name={notFound ? "document-outline" : "cloud-offline-outline"}
              size={32}
              color={T.primary}
            />
          </View>
          <Text style={s.stateTitle}>
            {notFound
              ? `${reviewStatus ? reviewStatus[0].toUpperCase() + reviewStatus.slice(1) : "Draft"} not found`
              : `Couldn't load this ${reviewStatus ?? "draft"}`}
          </Text>
          <Text style={s.stateBody}>
            {notFound
              ? "It may have been published or deleted, or it isn't one of your blogs."
              : "Check your connection and try again."}
          </Text>
          <Pressable
            style={s.stateBtn}
            onPress={notFound ? () => router.back() : load}
          >
            <Text style={s.stateBtnText}>
              {notFound ? "Back to drafts" : "Try again"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const tags = draft.tags ?? [];

  return (
    <View style={s.screen}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {Header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 82 }}
      >
        {cover ? <Image source={{ uri: cover }} style={s.cover} /> : null}

        <View style={s.body}>
          {draft.category?.title ? (
            <View style={s.category}>
              <Text style={s.categoryText}>{draft.category.title}</Text>
            </View>
          ) : null}

          <Text style={s.title}>{draft.title?.trim() || "Untitled draft"}</Text>

          <View style={s.metaRow}>
            <Text style={s.meta}>
              Edited {fmtDate(draft.updatedAt ?? draft.createdAt)}
            </Text>
            {words > 0 && (
              <>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.meta}>{readMin} min read</Text>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.meta}>
                  {words.toLocaleString("en-US")} words
                </Text>
              </>
            )}
          </View>

          {tags.length > 0 && (
            <View style={s.tagRow}>
              {tags.map((t) => (
                <View key={t} style={s.tag}>
                  <Text style={s.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.rule} />

          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <Text key={i} style={s.paragraph}>
                {p}
              </Text>
            ))
          ) : (
            <View style={s.emptyBody}>
              <Ionicons name="create-outline" size={26} color={T.mute} />
              <Text style={s.emptyBodyText}>
                This draft has no content yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky action */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {reviewStatus ? (
          <View style={s.reviewActions}>
            <Pressable
              accessibilityLabel="Edit blog"
              onPress={edit}
              style={({ pressed }) => [s.iconAction, pressed && { opacity: 0.65 }]}
            >
              <Ionicons name="create-outline" size={20} color={T.primaryDark} />
            </Pressable>
            <Pressable
              accessibilityLabel="Delete blog"
              disabled={isDeleting}
              onPress={handleDelete}
              style={({ pressed }) => [
                s.iconAction,
                pressed && { opacity: 0.65 },
                isDeleting && { opacity: 0.6 },
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator color={T.primaryDark} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color={T.primaryDark} />
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [s.cta, pressed && { opacity: 0.9 }]}
            onPress={edit}
          >
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={s.ctaText}>Continue editing</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const createStyles = (T: ReturnType<typeof getDraftTheme>) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  center: { alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: T.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: { color: T.primary, fontSize: 12, fontWeight: "800" },
  privateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  privateText: { color: T.mute, fontSize: 12.5 },

  cover: { width: "100%", height: 190, backgroundColor: T.border },
  body: { paddingHorizontal: 20, paddingTop: 18 },

  category: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: T.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 10,
  },
  categoryText: { color: T.primary, fontSize: 12.5, fontWeight: "700" },

  title: {
    color: T.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 33,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  meta: { color: T.sub, fontSize: 13.5 },
  metaDot: { color: T.mute, fontSize: 13.5 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  tagText: { color: T.sub, fontSize: 12.5 },

  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: T.border,
    marginVertical: 18,
  },
  paragraph: { color: T.text, fontSize: 17, lineHeight: 28, marginBottom: 18 },

  emptyBody: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyBodyText: { color: T.mute, fontSize: 14 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "flex-end",
    paddingHorizontal: 22,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  cta: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.primary,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  reviewActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stateTitle: { color: T.text, fontSize: 20, fontWeight: "800" },
  stateBody: {
    color: T.sub,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  stateBtn: {
    marginTop: 14,
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 99,
  },
  stateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
