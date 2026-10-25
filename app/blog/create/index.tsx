import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useBlogAutosave } from "@/hooks/useBlogDraft";
import type { BlogFormValues } from "@/types/blogAutoSave";
import { keepImageForAutosave } from "@/utils/autoSaveImage";

import type { ImagePickerAsset } from "expo-image-picker";
import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import FormField from "@/components/forms/FormField";
import FormImagePicker from "@/components/forms/FormImagePicker";
import FormSelect from "@/components/forms/FormSelect";
import RichTextEditor from "@/components/forms/RichTextEditor";
import { ThemedButton } from "@/components/ThemedButton";
import ThemedCard from "@/components/ThemedCard";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";

import { blogApi } from "@/api/services";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Image } from "expo-image";

import type { Category } from "@/types/category";

import { getErrorMessage } from "@/utils/errorMessage";

type BlogStatus = "draft" | "submitted";
type FieldName = "title" | "description" | "category";
type FieldErrors = Partial<Record<FieldName, string>>;

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getSelectedImageName(image: ImagePickerAsset) {
  if (image.fileName) return image.fileName;
  const extension =
    image.mimeType?.split("/")[1] ??
    image.uri.split(".").pop()?.split(/[?#]/)[0] ??
    "jpg";
  return `cover-image.${extension}`;
}

export default function CreateBlogPage() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<BlogStatus>("draft");
  const [tagsInput, setTagsInput] = useState("");
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const formValues = useMemo<BlogFormValues>(
    () => ({ title, description, category, status, tagsInput, image }),
    [title, description, category, status, tagsInput, image],
  );

  const handleRestore = useCallback(
    (saved: BlogFormValues) => {
      setTitle(saved.title);
      setDescription(saved.description);
      setCategory(saved.category);
      setStatus(saved.status);
      setTagsInput(saved.tagsInput);
      setImage(saved.image as ImagePickerAsset | null);
      showToast("Restored your unsaved text.");
    },
    [showToast],
  );

  const { isRestoring, clearAutosave } = useBlogAutosave({
    userId: session?.user.id,
    values: formValues,
    onRestore: handleRestore,
  });

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const response = await categoryApi.list();
      setCategories(response.data.result ?? []);
    } catch (requestError) {
      setCategoriesError(getErrorMessage(requestError));
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const updateField = <T extends FieldName>(
    field: T,
    value: T extends "title" | "description" | "category" ? string : never,
    setter: (value: string) => void,
  ) => {
    setter(value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const plainDescription = stripHtml(description);

    if (!title.trim()) {
      nextErrors.title = "Title is required.";
    } else if (title.trim().length > 90) {
      nextErrors.title = "Title must be 90 characters or fewer.";
    }

    if (!plainDescription) {
      nextErrors.description = "Description is required.";
    } else if (plainDescription.length < 20) {
      nextErrors.description = "Description should be at least 20 characters.";
    }

    if (!category) {
      nextErrors.category = "Please select a category.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;
    if (categoriesLoading || categoriesError) {
      setError("Load the categories before creating your blog.");
      return;
    }
    if (!isAuthenticated || !session) {
      setError("Please sign in before creating a blog.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description);
      formData.append("category", category);
      formData.append("status", status);
      formData.append("tags", tagsInput.trim());
      formData.append("author", session.user.id);

      if (image) {
        formData.append("image", {
          uri: image.uri,
          name: getSelectedImageName(image),
          type: image.mimeType ?? "image/jpeg",
        } as unknown as Blob);
      }

      await blogApi.create(formData);
      await clearAutosave();
      showToast("Blog created successfully.");
      router.replace("/profile");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/blog");
    }
  };

  if (isInitializing) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <View style={[styles.centered, { padding: spacing.xl }]}>
          <ThemedText variant="bodySmall" semantic="muted">
            Checking your account…
          </ThemedText>
        </View>
      </ThemedSafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <View
          style={[styles.centered, { padding: spacing.xl, gap: spacing.md }]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={38}
            color={colors.mutedForeground}
          />
          <ThemedText variant="heading5" style={styles.centerText}>
            Sign in to write a blog
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            style={styles.centerText}
          >
            Sign in to create and manage your stories.
          </ThemedText>
          <ThemedButton title="Sign in" onPress={() => router.push("/login")} />
        </View>
      </ThemedSafeAreaView>
    );
  }

  if (isRestoring) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <View style={[styles.centered, { padding: spacing.xl }]}>
          <ThemedText variant="bodySmall" semantic="muted">
            Loading…
          </ThemedText>
        </View>
      </ThemedSafeAreaView>
    );
  }

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <View
        style={[
          styles.pageHeader,
          {
            borderBottomColor: colors.border,
            marginHorizontal: spacing.md,
            paddingBottom: spacing.sm,
            paddingTop: spacing.sm,
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.secondary,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <ThemedText variant="caption" semantic="primary">
            NEW POST
          </ThemedText>
          <ThemedText variant="heading4" style={{ marginTop: 2 }}>
            Create a blog
          </ThemedText>
          <View
            style={[
              styles.headerIndicator,
              { backgroundColor: colors.primary },
            ]}
          />
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.lg,
          },
        ]}
      >
        <ThemedCard style={{ padding: spacing.md, borderRadius: radii.lg }}>
          <View style={{ gap: spacing.lg }}>
            {error ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.badgePrimaryBg,
                    borderColor: colors.primary,
                    borderRadius: radii.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <ThemedText
                  variant="bodySmall"
                  style={{ color: colors.badgePrimaryText }}
                >
                  {error}
                </ThemedText>
              </View>
            ) : null}

            <FormField label="Author">
              <View
                style={[
                  styles.readOnlyField,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    minHeight: 48,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              >
                <ThemedText variant="bodySmall" semantic="muted">
                  {session?.user.name ?? "Unknown"}
                </ThemedText>
              </View>
            </FormField>

            <FormField
              label="Title"
              required
              error={fieldErrors.title}
              hint={`${title.length}/90 characters`}
            >
              <ThemedTextInput
                accessibilityLabel="Blog title"
                value={title}
                onChangeText={(value) => updateField("title", value, setTitle)}
                placeholder="Enter your blog title"
                maxLength={90}
                editable={!submitting}
                returnKeyType="next"
              />
            </FormField>

            <FormField
              label="Description"
              required
              error={fieldErrors.description}
              hint="Write at least 20 characters. Separate paragraphs with a blank line."
            >
              <RichTextEditor
                id="blog-description"
                content={description}
                placeholder="Write your story..."
                disabled={submitting}
                onChange={(value) =>
                  updateField("description", value, setDescription)
                }
              />
            </FormField>

            <FormField label="Category" required error={fieldErrors.category}>
              {categoriesError ? (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="caption" semantic="error">
                    Unable to load categories: {categoriesError}
                  </ThemedText>
                  <ThemedButton
                    title="Retry loading categories"
                    variant="outlined"
                    size="small"
                    onPress={() => void loadCategories()}
                    disabled={submitting}
                  />
                </View>
              ) : categories.length === 0 && !categoriesLoading ? (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="caption" semantic="muted">
                    No categories are available yet.
                  </ThemedText>
                  <ThemedButton
                    title="Refresh categories"
                    variant="outlined"
                    size="small"
                    onPress={() => void loadCategories()}
                    disabled={submitting}
                  />
                </View>
              ) : (
                <FormSelect
                  accessibilityLabel="Blog category"
                  value={category}
                  placeholder={
                    categoriesLoading
                      ? "Loading categories..."
                      : "Select a category"
                  }
                  disabled={categoriesLoading || submitting}
                  options={categories.map((item) => ({
                    label: item.title,
                    value: item._id,
                  }))}
                  onChange={(value) =>
                    updateField("category", value, setCategory)
                  }
                />
              )}
            </FormField>

            <FormField label="Status">
              <FormSelect
                accessibilityLabel="Blog status"
                value={status}
                placeholder="Select status"
                disabled={submitting}
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Submit for review", value: "submitted" },
                ]}
                onChange={(value) => setStatus(value as BlogStatus)}
              />
            </FormField>

            <FormField
              label="Tags"
              hint="Separate tags with commas, for example: travel, food, nepal"
            >
              <ThemedTextInput
                accessibilityLabel="Blog tags"
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="travel, food, nepal"
                editable={!submitting}
                autoCapitalize="none"
              />
            </FormField>

            <FormField
              label="Cover image"
              hint="Choose an image from your library."
            >
              <FormImagePicker
                image={image}
                onChange={async (selected) => {
                  setImage(
                    selected ? await keepImageForAutosave(selected) : null,
                  );
                  setError(null);
                }}
                onError={(message) => setError(message)}
                disabled={submitting}
              />
            </FormField>

            <View
              style={[
                styles.actions,
                {
                  borderTopColor: colors.border,
                  gap: spacing.sm,
                  paddingTop: spacing.lg,
                },
              ]}
            >
              <ThemedButton
                title="Cancel"
                variant="outlined"
                disabled={submitting}
                onPress={handleCancel}
                style={styles.actionButton}
              />
              <ThemedButton
                title={status === "draft" ? "Save draft" : "Submit blog"}
                loading={submitting}
                loadingText="Creating..."
                onPress={() => void handleSubmit()}
                style={styles.actionButton}
              />
            </View>
          </View>
        </ThemedCard>
      </ScrollView>
    </ThemedSafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    position: "relative",
  },
  headerIndicator: {
    width: 48,
    height: 2,
    borderRadius: 2,
    marginTop: 5,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  errorBanner: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  readOnlyField: {
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
  },
});
