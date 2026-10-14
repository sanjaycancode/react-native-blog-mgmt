import { Text, View } from "react-native";

import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import GridFeed from "@/components/home/GridFeed";
import DraftSectionSwitcher, {
  type DraftSection,
} from "@/components/profile/DraftSectionSwitcher";
import MinimalTabBar, {
  type ProfileTab,
} from "@/components/profile/MinimalTabBar";

import { useTheme } from "@/constants/theme";

import type { Blog } from "@/types";

const ERROR_COLOR = "#DC2626";

type Props = {
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;
  draftsCount: number;
  draftSection: DraftSection;
  setDraftSection: (section: DraftSection) => void;
  profileError: string | null;
  blogsError: string | null;
  feedTab: ProfileTab | DraftSection;
  items: Record<ProfileTab | DraftSection, Blog[]>;
  busyBlogId: string | null;
  onPressItem: (blog: Blog) => void;
  onLongPressItem?: (blog: Blog) => void;
  onRemoveSaved?: (blog: Blog) => void;
  onEmptyAction?: () => void;
};

export default function ProfileContent({
  activeTab,
  setActiveTab,
  draftsCount,
  draftSection,
  setDraftSection,
  profileError,
  blogsError,
  feedTab,
  items,
  busyBlogId,
  onPressItem,
  onLongPressItem,
  onRemoveSaved,
  onEmptyAction,
}: Props) {
  const { typography, spacing } = useTheme();

  return (
    <>
      <MinimalTabBar
        activeTab={activeTab}
        setTab={setActiveTab}
        draftsCount={draftsCount}
      />

      <View style={{ minHeight: 420 }}>
        {activeTab === "drafts" && (
          <DraftSectionSwitcher
            value={draftSection}
            onChange={setDraftSection}
          />
        )}
        {!!profileError && (
          <Text
            style={{
              color: ERROR_COLOR,
              fontSize: typography.sizes.sm,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
            }}
          >
            {profileError}
          </Text>
        )}

        {blogsError && activeTab !== "saved" ? (
          <Text
            style={{
              color: ERROR_COLOR,
              fontSize: typography.sizes.sm,
              padding: spacing.xl,
              textAlign: "center",
            }}
          >
            {blogsError} Pull down to try again.
          </Text>
        ) : (
          <Animated.View
            key={feedTab}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(100)}
          >
            <GridFeed
              items={items[feedTab]}
              type={feedTab}
              busyId={busyBlogId}
              onPressItem={onPressItem}
              onLongPressItem={onLongPressItem}
              onRemoveSaved={onRemoveSaved}
              onEmptyAction={onEmptyAction}
            />
          </Animated.View>
        )}
      </View>
    </>
  );
}
