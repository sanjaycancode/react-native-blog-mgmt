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
  /** Only the count is used on the profile screen. */
  savedBlogs?: unknown[];
}

export interface ProfileResponse {
  message?: string;
  profile?: ProfileData;
}

export const profileApi = {
  /** Gets the logged-in user's profile. Needs the Authorization header. */
  get: () => apiClient.get<ProfileResponse>("/profile"),
};
