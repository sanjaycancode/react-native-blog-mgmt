import { useCallback, useState } from "react";

import { useFocusEffect, useRouter } from "expo-router";

import { blogApi } from "@/api/services";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { getStatusCode, isProfileMissing } from "@/utils/profileHelpers";

import type { Blog } from "@/types";

/** Replaces saved blog ids with full blog objects where possible. */
async function resolveSavedBlogs(profileData: ProfileData) {
  const entries = profileData.savedBlogs;
  if (!entries?.length) return;

  const ids = entries.filter(
    (e): e is string => typeof e === "string" && e.length > 0,
  );
  if (ids.length === 0) return;

  const results = await Promise.allSettled(
    ids.map((id) => blogApi.getById(id)),
  );
  const byId = new Map<string, Blog>();
  results.forEach((r) => {
    if (r.status === "fulfilled") {
      const blog = r.value.data.result;
      byId.set(blog._id, blog);
    }
  });

  profileData.savedBlogs = entries.map((e) =>
    typeof e === "string" ? (byId.get(e) ?? e) : e,
  );
}

export function useProfileData() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [blogsError, setBlogsError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [profileResult, blogsResult] = await Promise.allSettled([
      profileApi.get(),
      blogApi.myBlogs(),
    ]);

    const unauthorized =
      (profileResult.status === "rejected" &&
        getStatusCode(profileResult.reason) === 401) ||
      (blogsResult.status === "rejected" &&
        getStatusCode(blogsResult.reason) === 401);

    if (unauthorized) {
      router.replace("/login");
      return;
    }

    if (profileResult.status === "fulfilled") {
      const data = profileResult.value.data.profile ?? null;
      if (data?.user) {
        data.followersCount ??= data.user.followersCount;
        data.followingCount ??= data.user.followingCount;
      }
      if (data) await resolveSavedBlogs(data);
      setProfile(data);
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

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  return {
    profile,
    setProfile,
    blogs,
    setBlogs,
    isLoading,
    isRefreshing,
    profileError,
    blogsError,
    refresh,
  };
}
