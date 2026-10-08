import { apiClient } from "../client";

export interface ProfileUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface ProfileData {
  user?: ProfileUser;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
  socialLinks?: SocialLinks;
  savedBlogs?: unknown[];
}

export interface ProfileResponse {
  message?: string;
  profile?: ProfileData;
}

export const profileApi = {
  get: () => apiClient.get<ProfileResponse>("/profile"),

  saveBlog(blogId: string) {
    return apiClient<ProfileResponse>(`/profile/saved-blogs/${blogId}`, {
      method: "PUT",
    });
  },

  removeSavedBlog(blogId: string) {
    return apiClient<ProfileResponse>(`/profile/saved-blogs/${blogId}`, {
      method: "DELETE",
    });
  }
};
