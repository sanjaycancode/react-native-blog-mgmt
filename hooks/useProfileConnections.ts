import { useCallback, useState } from "react";

import { getFollowUsers } from "@/api/services/follow";
import {
  profileApi,
  type ProfileConnectionsResponse,
  type ProfileConnectionUser,
  type ProfileData,
  resolveProfileConnections,
} from "@/api/services/profile";

import { getErrorMessage } from "@/utils/errorMessage";
import { getOwnerId } from "@/utils/profileHelpers";

type ConnectionsType = "followers" | "following";

type Params = {
  /** Whose followers/following lists are being shown. */
  profileUserId: string | undefined;
  /** The logged-in user. Follow state is always derived from THEIR following list. */
  viewerId: string | undefined;
  /** Optional: keeps the displayed counts in sync. */
  setProfile?: React.Dispatch<React.SetStateAction<ProfileData | null>>;
};

const toIdSet = (users: ProfileConnectionUser[]) =>
  new Set(users.map((u) => getOwnerId(u)).filter((id): id is string => !!id));

const fetchList = async (type: ConnectionsType, userId: string) => {
  const res =
    type === "followers"
      ? await profileApi.getFollowers(userId)
      : await profileApi.getFollowing(userId);
  const data = res as unknown as ProfileConnectionsResponse;
  return { data, users: getFollowUsers(data) };
};

export function useProfileConnections({
  profileUserId,
  viewerId,
  setProfile,
}: Params) {
  const [type, setType] = useState<ConnectionsType | null>(null);
  const [connections, setConnections] = useState<ProfileConnectionUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !!viewerId && profileUserId === viewerId;

  const open = useCallback(
    async (nextType: ConnectionsType) => {
      setType(nextType);
      setConnections([]);
      setError(null);

      if (!profileUserId) {
        setError("Unable to identify this profile.");
        return;
      }

      setIsLoading(true);
      try {
        // Own profile: fetch both lists (the following list gives follow-back state).
        // Other profile: fetch the shown list + MY following list for button state.
        const [shown, mine] = await Promise.all([
          fetchList(nextType, profileUserId),
          isOwnProfile
            ? fetchList(
                nextType === "following" ? "followers" : "following",
                profileUserId,
              )
            : viewerId
              ? fetchList("following", viewerId)
              : Promise.resolve(null),
        ]);

        // Resolve "my following list" regardless of which branch ran.
        const myFollowingUsers = isOwnProfile
          ? nextType === "following"
            ? shown.users
            : (mine?.users ?? [])
          : (mine?.users ?? []);
        setFollowingIds(toIdSet(myFollowingUsers));

        setConnections(await resolveProfileConnections(shown.users));

        if (setProfile) {
          const countKey =
            nextType === "followers" ? "followersCount" : "followingCount";
          const otherKey =
            nextType === "followers" ? "followingCount" : "followersCount";
          setProfile((cur) =>
            cur
              ? {
                  ...cur,
                  [countKey]: shown.data.count,
                  ...(isOwnProfile && mine
                    ? { [otherKey]: mine.data.count }
                    : {}),
                }
              : cur,
          );
        }
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setIsLoading(false);
      }
    },
    [profileUserId, viewerId, isOwnProfile, setProfile],
  );

  const close = useCallback(() => setType(null), []);

  // Throws on failure so the modal can show an alert.
  const toggleFollow = useCallback(
    async (userId: string, isFollowing: boolean) => {
      if (isFollowing) await profileApi.unfollowUser(userId);
      else await profileApi.followUser(userId);

      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.delete(userId);
        else next.add(userId);
        return next;
      });

      // Only your own "following" count changes when you follow from your own lists.
      if (isOwnProfile && setProfile) {
        setProfile((cur) =>
          cur
            ? {
                ...cur,
                followingCount: Math.max(
                  0,
                  (cur.followingCount ?? 0) + (isFollowing ? -1 : 1),
                ),
              }
            : cur,
        );
      }
    },
    [isOwnProfile, setProfile],
  );

  return {
    type,
    connections,
    followingIds,
    isLoading,
    error,
    open,
    close,
    toggleFollow,
  };
}
