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
  /** Used for the "member for X days" line on the analytics screen. */
  createdAt?: string;
  /** Only the count is used on the profile screen. */
  savedBlogs?: unknown[];
}

export interface ProfileResponse {
  message?: string;
  profile?: ProfileData;
}

export const profileApi = {
  get: () => apiClient.get<ProfileResponse>("/profile"),

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
