import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { type Href, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import SearchBox from "@/components/SearchBox";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";

import { useTheme } from "@/constants/theme";
import { SearchBlog, SearchUser } from "@/types/search";
import { searchApi } from "@/api/services/search";
import { HeaderBackButton } from "@/components/HeaderBackButton";

type Status = "idle" | "loading" | "done" | "error";
type ResultFilter = "all" | "users" | "blogs";

export default function SearchScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [blogs, setBlogs] = useState<SearchBlog[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [filter, setFilter] = useState<ResultFilter>("all");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setUsers([]);
      setBlogs([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    searchApi
      .search(q)
      .then((response) => {
        if (cancelled) return;
        setUsers(response.data.result.users ?? []);
        setBlogs(response.data.result.blogs ?? []);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const openBlog = (slug: string) =>
    router.push({ pathname: "/blog/[slug]", params: { slug } });

  const openUser = (id: string) => router.push(`/profile/${id}` as Href);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const changeFilter = (next: ResultFilter) => {
    setFilter(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const hasResults = users.length > 0 || blogs.length > 0;
  const visibleUsers = filter === "blogs" ? [] : users;
  const visibleBlogs = filter === "users" ? [] : blogs;
  const hasVisibleResults = visibleUsers.length > 0 || visibleBlogs.length > 0;

  const emptyMessage =
    hasResults && filter === "users"
      ? `No people found for "${query}".`
      : hasResults && filter === "blogs"
        ? `No blogs found for "${query}".`
        : `Nothing found for "${query}".`;

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <View
        style={[
          styles.topBar,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: spacing.sm,
          },
        ]}
      >
       <HeaderBackButton onPress={goBack}/>

        <View style={styles.searchWrap}>
          <SearchBox
            autofocus
            initialValue={query}
            onSearch={setQuery}
            placeholder="Search blogs and people"
            delay={400}
          />
        </View>
      </View>

      {status === "done" && hasResults ? (
        <View
          style={[
            styles.filterRow,
            {
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.sm,
              gap: spacing.sm,
            },
          ]}
        >
          <FilterChip
            label="All"
            selected={filter === "all"}
            onPress={() => changeFilter("all")}
          />
          <FilterChip
            label={`People · ${users.length}`}
            selected={filter === "users"}
            onPress={() => changeFilter("users")}
          />
          <FilterChip
            label={`Blogs · ${blogs.length}`}
            selected={filter === "blogs"}
            onPress={() => changeFilter("blogs")}
          />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing["4xl"],
          gap: spacing.lg,
        }}
      >
        {status === "idle" ? (
          <Hint
            icon="search-outline"
            title="Search"
            message="Find blogs by title, topic or tag, and people by name."
          />
        ) : null}

        {status === "loading" ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ paddingVertical: spacing.xl }}
          />
        ) : null}

        {status === "error" ? (
          <Hint
            icon="alert-circle-outline"
            title="Search failed"
            message="Check your connection and try again."
          />
        ) : null}

        {status === "done" && !hasVisibleResults ? (
          <Hint
            icon="document-text-outline"
            title="No results"
            message={emptyMessage}
          />
        ) : null}

        {status === "done" && visibleUsers.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="bodySmall" style={styles.sectionTitle}>
              People
            </ThemedText>
            {visibleUsers.map((user) => (
              <UserRow
                key={user._id}
                user={user}
                onPress={() => openUser(user._id)}
              />
            ))}
          </View>
        ) : null}

        {status === "done" && visibleBlogs.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="bodySmall" style={styles.sectionTitle}>
              Blogs
            </ThemedText>
            {visibleBlogs.map((blog) => (
              <BlogRow
                key={blog._id}
                blog={blog}
                onPress={() => openBlog(blog.slug)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedSafeAreaView>
  );
}

/* ─── Filter chip ─────────────────────────────────────────────── */

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <ThemedText
        variant="caption"
        style={{
          color: selected ? colors.primaryForeground : colors.foreground,
          fontWeight: selected
            ? typography.weights.semibold
            : typography.weights.regular,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

/* ─── Rows ────────────────────────────────────────────────────── */

function UserRow({ user, onPress }: { user: SearchUser; onPress: () => void }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = typeof user.avatar === "string" ? user.avatar : user.avatar?.url;
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${user.name}'s profile`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.userRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.md,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.primary, borderRadius: radii.full },
        ]}
      >
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={styles.avatarImage}
            onError={() => setFailed(true)}
          />
        ) : (
          <ThemedText style={{ color: colors.primaryForeground }}>
            {initial}
          </ThemedText>
        )}
      </View>

      <ThemedText
        variant="bodySmall"
        numberOfLines={1}
        style={{ flex: 1, fontWeight: typography.weights.semibold }}
      >
        {user.name}
      </ThemedText>

      {user.isVerified ? (
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
      ) : null}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.mutedForeground}
      />
    </Pressable>
  );
}

function BlogRow({ blog, onPress }: { blog: SearchBlog; onPress: () => void }) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${blog.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.xs,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <ThemedText
        variant="bodySmall"
        numberOfLines={2}
        style={{
          fontSize: typography.sizes.base,
          fontWeight: typography.weights.semibold,
        }}
      >
        {blog.title}
      </ThemedText>
      {blog.excerpt ? (
        <ThemedText variant="bodySmall" semantic="muted" numberOfLines={2}>
          {blog.excerpt}
        </ThemedText>
      ) : null}
      <ThemedText variant="caption" semantic="muted" numberOfLines={1}>
        By {blog.author?.name ?? "Unknown"}
        {blog.category?.title ? `  ·  ${blog.category.title}` : ""}
      </ThemedText>
    </Pressable>
  );
}

function Hint({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.hint,
        { paddingVertical: spacing["4xl"], gap: spacing.sm },
      ]}
    >
      <Ionicons name={icon} size={36} color={colors.mutedForeground} />
      <ThemedText variant="heading5" style={styles.centerText}>
        {title}
      </ThemedText>
      <ThemedText
        variant="bodySmall"
        semantic="muted"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    height: 30,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  hint: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
});