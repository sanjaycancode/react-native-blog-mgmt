import { useCallback, useEffect, useMemo, useState } from "react";
import { blogApi } from "@/api/services/blog";
import { type Blog } from "@/types";
import { profileApi, type ProfileData } from "@/api/services/profile";

export type Range = "7D" | "30D" | "90D";
export const RANGE_DAYS: Record<Range, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
};
export const RANGE_LABEL: Record<Range, string> = {
  "7D": "7 days",
  "30D": "30 days",
  "90D": "90 days",
};

export interface DayBucket {
  date: string;
  count: number;
  likes: number;
  views: number;
}
export interface Delta {
  current: number;
  previous: number;
  pct: number | null;
}
export interface TopPost {
  _id: string;
  title: string;
  slug: string;
  likes: number;
  views: number;
  status: Blog["status"];
  createdAt: string;
}

const startOfDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
};
const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const delta = (current: number, previous: number): Delta => ({
  current,
  previous,
  pct: previous > 0 ? ((current - previous) / previous) * 100 : null,
});

export function useAnalyticsData() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("30D");

  const load = useCallback(async (silent = false) => {
    silent ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const [b, p] = await Promise.all([blogApi.myBlogs(), profileApi.get()]);
      setBlogs(b.data.result ?? []);
      setProfile(p.data.profile ?? null);
    } catch {
      setError("Couldn't load your insights. Pull down to try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPosts = blogs.length;
  const publishedPosts = useMemo(
    () =>
      blogs.filter((b) => b.status === "published" || b.status === "featured")
        .length,
    [blogs],
  );
  const totalLikes = useMemo(
    () => blogs.reduce((s, b) => s + (b.likes?.length ?? 0), 0),
    [blogs],
  );
  const totalViews = useMemo(
    () => blogs.reduce((s, b) => s + (b.views ?? 0), 0),
    [blogs],
  );
  const avgLikesPerPost = publishedPosts
    ? Math.round((totalLikes / publishedPosts) * 10) / 10
    : 0;
  const avgViewsPerPost = publishedPosts
    ? Math.round((totalViews / publishedPosts) * 10) / 10
    : 0;
  const savedByOthers = profile?.savedBlogs?.length ?? 0;
  const joinedDaysAgo = useMemo(
    () =>
      profile?.createdAt
        ? Math.floor(
            (Date.now() - new Date(profile.createdAt).getTime()) / 86_400_000,
          )
        : 0,
    [profile?.createdAt],
  );

  // Current window + the window right before it, so every chart can show "vs previous".
  const { current, previous, deltas } = useMemo(() => {
    const days = RANGE_DAYS[range];
    const buckets = new Map<string, DayBucket>();
    for (let i = days * 2 - 1; i >= 0; i--) {
      const d = startOfDay(i);
      buckets.set(d.toDateString(), {
        date: fmt(d),
        count: 0,
        likes: 0,
        views: 0,
      });
    }
    blogs.forEach((b) => {
      const k = new Date(b.createdAt).toDateString();
      const e = buckets.get(k);
      if (!e) return;
      e.count += 1;
      e.likes += b.likes?.length ?? 0;
      e.views += b.views ?? 0;
    });
    const all = Array.from(buckets.values());
    const previous = all.slice(0, days);
    const current = all.slice(days);
    const sum = (arr: DayBucket[], k: "count" | "likes" | "views") =>
      arr.reduce((s, d) => s + d[k], 0);
    return {
      current,
      previous,
      deltas: {
        views: delta(sum(current, "views"), sum(previous, "views")),
        likes: delta(sum(current, "likes"), sum(previous, "likes")),
        posts: delta(sum(current, "count"), sum(previous, "count")),
      },
    };
  }, [blogs, range]);

  const tagFrequency = useMemo(() => {
    const f = new Map<string, number>();
    blogs.forEach((b) =>
      (b.tags ?? []).forEach((t) => f.set(t, (f.get(t) ?? 0) + 1)),
    );
    return Array.from(f, ([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [blogs]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<Blog["status"], number>> = {};
    blogs.forEach((b) => {
      c[b.status] = (c[b.status] ?? 0) + 1;
    });
    return c;
  }, [blogs]);

  const topPosts = useMemo<TopPost[]>(
    () =>
      blogs
        .map((b) => ({
          _id: b._id,
          title: b.title,
          slug: b.slug,
          likes: b.likes?.length ?? 0,
          views: b.views ?? 0,
          status: b.status,
          createdAt: b.createdAt,
        }))
        .filter((p) => {
          if (p.status === "published" || p.status === "featured") return true;
          if (p.status === "draft") return p.views > 1 || p.likes > 1;
          return false;
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
    [blogs],
  );
  return {
    profile,
    blogs,
    range,
    setRange,
    isLoading,
    isRefreshing,
    error,
    refresh: () => load(true),
    totalPosts,
    publishedPosts,
    totalLikes,
    totalViews,
    avgLikesPerPost,
    avgViewsPerPost,
    savedByOthers,
    joinedDaysAgo,
    current,
    previous,
    deltas,
    tagFrequency,
    statusCounts,
    topPosts,
  };
}
