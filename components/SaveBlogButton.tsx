import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

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
  const { colors } = useTheme();
  const { isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isInitializing || !isAuthenticated) return;

    let cancelled = false;
    void profileApi
      .get()
      .then((response) => {
        if (cancelled) return;
        const savedBlogs = response.data.profile?.savedBlogs ?? [];
        setIsSaved(
          savedBlogs.some((entry) =>
            typeof entry === "string"
              ? entry === blogId
              : (entry as { _id?: string })?._id === blogId,
          ),
        );
      })
      .catch(() => {
        // The save action remains available when profile hydration fails.
      });

    return () => {
      cancelled = true;
    };
  }, [blogId, isAuthenticated, isInitializing]);

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
          backgroundColor: colors.secondary,
          opacity: pressed ? 0.7 : isSaving ? 0.6 : 1,
        },
      ]}
    >
      {isSaving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={isSaved ? "bookmark" : "bookmark-outline"}
          size={20}
          color={isSaved ? colors.primary : colors.mutedForeground}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});

export default SaveBlogButton;
