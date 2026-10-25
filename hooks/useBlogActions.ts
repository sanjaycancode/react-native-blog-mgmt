import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { blogApi } from "@/api/services";
import { profileApi, type ProfileData } from "@/api/services/profile";

import { getErrorMessage } from "@/utils/errorMessage";

import type { Blog } from "@/types";

type Params = {
  setBlogs: React.Dispatch<React.SetStateAction<Blog[]>>;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
};

export function useBlogActions({ setBlogs, setProfile }: Params) {
  const [busyBlogId, setBusyBlogId] = useState<string | null>(null);

  /** Runs an async action while marking the blog as busy. */
  const withBusy = useCallback(
    async (id: string, errorTitle: string, action: () => Promise<void>) => {
      setBusyBlogId(id);
      try {
        await action();
      } catch (e) {
        Alert.alert(errorTitle, getErrorMessage(e));
      } finally {
        setBusyBlogId(null);
      }
    },
    [],
  );

  const confirmDelete = useCallback(
    (blogId: string) => {
      Alert.alert("Delete this blog?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void withBusy(blogId, "Couldn't delete blog", async () => {
              await blogApi.delete(blogId);
              setBlogs((prev) => prev.filter((b) => b._id !== blogId));
            }),
        },
      ]);
    },
    [setBlogs, withBusy],
  );

  const unpublish = useCallback(
    (blogId: string) =>
      withBusy(blogId, "Couldn't unpublish blog", async () => {
        await blogApi.unpublish(blogId);
        setBlogs((prev) =>
          prev.map((b) =>
            b._id === blogId ? ({ ...b, status: "unpublished" } as Blog) : b,
          ),
        );
      }),
    [setBlogs, withBusy],
  );

  const confirmUnpublish = useCallback(
    (blogId: string) => {
      Alert.alert(
        "Unpublish this blog?",
        "Readers won't be able to see it until you publish it again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Unpublish", onPress: () => void unpublish(blogId) },
        ],
      );
    },
    [unpublish],
  );

  const removeSaved = useCallback(
    (blog: Blog) =>
      withBusy(blog._id, "Couldn't remove saved blog", async () => {
        await profileApi.removeSavedBlog(blog._id);
        setProfile((cur) =>
          cur
            ? {
                ...cur,
                savedBlogs: (cur.savedBlogs ?? []).filter((entry) =>
                  typeof entry === "string"
                    ? entry !== blog._id
                    : (entry as Blog)?._id !== blog._id,
                ),
              }
            : cur,
        );
      }),
    [setProfile, withBusy],
  );

  return { busyBlogId, confirmDelete, confirmUnpublish, removeSaved };
}
