import { apiClient } from "@/api/client";

export interface FollowResponse {
  message?: string;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  result?: {
    isFollowing?: boolean;
    followersCount?: number;
    followingCount?: number;
  };
}

export interface FollowUser {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string | { key?: string; url?: string };
  isFollowing?: boolean;
  profile?: {
    name?: string;
    username?: string;
    email?: string;
    avatar?: string | { key?: string; url?: string };
  };
  user?: FollowUser;
  follower?: FollowUser;
  following?: FollowUser;
}

export interface FollowUsersResponse {
  message?: string;
  count?: number;
  page?: number;
  limit?: number;
  result?: FollowUser[];
  users?: FollowUser[];
  followers?: FollowUser[];
  following?: FollowUser[];
}

export function getFollowUsers(response: FollowUsersResponse): FollowUser[] {
  const users = Array.isArray(response.users)
    ? response.users
    : Array.isArray(response.followers)
      ? response.followers
      : Array.isArray(response.following)
        ? response.following
        : Array.isArray(response.result)
          ? response.result
          : [];

  return users.map((entry) => {
    const user = entry.user ?? entry.follower ?? entry.following ?? entry;
    const profile = user.profile;

    return {
      ...user,
      name: user.name ?? profile?.name,
      username: user.username ?? profile?.username,
      email: user.email ?? profile?.email,
      avatar: user.avatar ?? profile?.avatar,
    };
  });
}

const followPath = (userId: string) => `/following/${userId}/follow`;
const followUsersPath = (userId: string, relation: "followers" | "following") =>
  `/following/${userId}/${relation}`;

export const followApi = {
  async follow(userId: string) {
    const response = await apiClient.post<FollowResponse>(followPath(userId));
    return response.data;
  },

  async unfollow(userId: string) {
    const response = await apiClient.delete<FollowResponse>(followPath(userId));
    return response.data;
  },

  async getStatus(userId: string) {
    const response = await apiClient.get<FollowResponse>(
      `/following/${userId}/follow-status`,
    );
    return response.data;
  },

  async getFollowers(userId: string) {
    const response = await apiClient.get<FollowUsersResponse>(
      followUsersPath(userId, "followers"),
    );
    return response.data;
  },

  async getFollowing(userId: string) {
    const response = await apiClient.get<FollowUsersResponse>(
      followUsersPath(userId, "following"),
    );
    return response.data;
  },
};
