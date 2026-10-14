import { ApiResponse, Blog } from "@/types";

import { apiClient } from "../client";

import {
  followApi,
  type FollowUser,
  type FollowUsersResponse,
} from "./follow";

export interface ProfileUser {
  id?: string;
  _id?: string;
  name: string;
  username?: string;
  email: string;
  followersCount?: number;
  followingCount?: number;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface ProfileData {
  user?: ProfileUser;
  avatar?: string | { key?: string; url?: string };
  bio?: string;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  socialLinks?: SocialLinks;
  /** Used for the "member for X days" line on the analytics screen. */
  createdAt?: string;
  /** Only the count is used on the profile screen. */
  savedBlogs?: unknown[];
}

export interface ProfileResponse {
  message?: string;
  profile?: ProfileData;
}

export type ProfileConnectionUser = FollowUser;
export type ProfileConnectionsResponse = FollowUsersResponse;

export async function resolveProfileConnections(
  users: ProfileConnectionUser[],
): Promise<ProfileConnectionUser[]> {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const userId = user.id ?? user._id;
      if (!userId) return user;

      const response = await profileApi.getById(userId);
      const profile = response.data.profile;
      const profileUser = profile?.user;
      if (!profileUser) return user;

      return {
        ...user,
        id: profileUser.id ?? user.id,
        _id: profileUser._id ?? user._id,
        name: profileUser.name ?? user.name,
        username: profileUser.username ?? user.username,
        email: profileUser.email ?? user.email,
        avatar: profile?.avatar ?? user.avatar,
        isFollowing: profile?.isFollowing ?? user.isFollowing,
      };
    }),
  );

  return results.map((result, index) =>
    result.status === "fulfilled" ? result.value : users[index],
  );
}

export const profileApi = {
  get: () => apiClient.get<ProfileResponse>("/profile"),

  followUser: followApi.follow,

  unfollowUser: followApi.unfollow,

  getFollowStatus: followApi.getStatus,

  getFollowers: followApi.getFollowers,

  getFollowing: followApi.getFollowing,

  /**
   * Updates bio, social links and (optionally) the avatar.
   * Takes FormData because the avatar is a file upload.
   * Adjust the method/path to match your backend (the web app called an update endpoint with FormData).
   */
  update: (formData: FormData) =>
    apiClient.patch<ProfileResponse>("/profile", formData, {
      // Only needed if apiClient defaults to JSON; lets the upload go out as multipart.
      headers: { "Content-Type": "multipart/form-data" },
    }),

    //user can save other blogs to their profile
  saveBlog(blogId: string) {
    return apiClient<ProfileResponse>(`/profile/saved-blogs/${blogId}`, {
      method: "PUT",
    });
  },

  getById(userId: string) {
    return apiClient<ProfileResponse>(`/profile/${userId}`, {
      method: "GET",
    });
  },

  removeSavedBlog(blogId: string) {
    return apiClient<ProfileResponse>(`/profile/saved-blogs/${blogId}`, {
      method: "DELETE",
    });
  },
  /**
   * Retrieves a draft blog by slug.
   *
   * @param slug - Draft blog slug.
   * @returns A promise containing the requested draft.
   */
  getDraftBySlug(slug: string) {
    return apiClient<ApiResponse<Blog>>(`/blog/draft/slug/${slug}`, {
      method: "GET",
    });
  },
};
