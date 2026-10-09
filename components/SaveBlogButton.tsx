import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { profileApi } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import { getErrorMessage } from "@/utils/errorMessage";

interface SaveBlogButtonProps {
  blogId: string;
}

export function SaveBlogButton({ blogId }: SaveBlogButtonProps) {
  const { colors, spacing } = useTheme();
  const { isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async () => {
    // if (!isAuthenticated) {
    //   showToast("Sign in to save blogs for later.", "error");
    //   router.push("/login");
    //   return;
    // }

    if (isSaving) return;
    setIsSaving(true);

    try {
      if (isSaved) {
        await profileApi.removeSavedBlog(blogId);
        setIsSaved(false);
        showToast("Blog removed from saved blogs.");
      } else {
        await profileApi.saveBlog(blogId);
        setIsSaved(true);
        showToast("Blog saved for later.");
      }
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: isInitializing || isSaving,
        selected: isSaved,
      }}
      accessibilityLabel={
        isSaved ? "Remove blog from saved blogs" : "Save blog for later"
      }
      disabled={isInitializing || isSaving}
      onPress={() => void handleClick()}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: 8,
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.7 : isSaving ? 0.6 : 1,
        },
      ]}
    >
      {isSaving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={isSaved ? "bookmark" : "bookmark-outline"}
          size={16}
          color={isSaved ? colors.primary : colors.mutedForeground}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});

export default SaveBlogButton;
