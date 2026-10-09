import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";

import type { ImagePickerAsset } from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import FormField from "@/components/forms/FormField";
import FormImagePicker from "@/components/forms/FormImagePicker";
import FormSelect from "@/components/forms/FormSelect";
import RichTextEditor from "@/components/forms/RichTextEditor";
import { Navbar } from "@/components/NavBar";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedSafeAreaView } from "@/components/ThemedSafeAreaView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";

import { blogApi } from "@/api/services";
import { categoryApi } from "@/api/services/category";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { Blog } from "@/types/blog";
import type { Category } from "@/types/category";

import { getErrorMessage } from "@/utils/errorMessage";

import { env } from "@/lib/config/env";
import { profileApi } from "@/api/services/profile";

type BlogStatus = "draft" | "submitted";
type FieldName = "title" | "description" | "category";
type FieldErrors = Partial<Record<FieldName, string>>;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

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

function getImageUri(image?: Blog["image"]) {
  if (!image) return undefined;
  if (typeof image !== "string" && image.url) return image.url;

  const path = typeof image === "string" ? image : image.key;
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;

  return `${env.apiBaseUrl.replace(/\/$/, "")}/uploads/blogs/${path.replace(/^\/+/, "")}`;
}

export default function EditBlogPage() {
  const router = useRouter();
  const { slug: slugParam } = useLocalSearchParams<{
    slug?: string | string[];
  }>();
  const slug = getParam(slugParam);
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<BlogStatus>("draft");
  const [tagsInput, setTagsInput] = useState("");
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  useEffect(() => {
    if (!slug) {
      setFetching(false);
      setError("Blog not found.");
      return;
    }

    let cancelled = false;
    setFetching(true);
    setError(null);

    profileApi
      .getDraftBySlug(slug)
      .then((response) => {
        if (cancelled) return;
        const fetchedBlog = response.data.result;
        setBlog(fetchedBlog);
        setTitle(fetchedBlog.title);
        setDescription(fetchedBlog.description);
        setCategory(fetchedBlog.category?._id ?? "");
        setStatus(fetchedBlog.status === "submitted" ? "submitted" : "draft");
        setTagsInput((fetchedBlog.tags ?? []).join(", "));
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const updateField = (
    field: FieldName,
    value: string,
    setter: (nextValue: string) => void,
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
    } else if (title.trim().length > 120) {
      nextErrors.title = "Title must be 120 characters or fewer.";
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
    if (!blog || !slug) {
      setError("The blog could not be loaded. Go back and try again.");
      return;
    }
    if (categoriesLoading || categoriesError || categories.length === 0) {
      setError("Load the available categories before saving this blog.");
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

      if (image) {
        formData.append("image", {
          uri: image.uri,
          name: getSelectedImageName(image),
          type: image.mimeType ?? "image/jpeg",
        } as unknown as Blob);
      }

      const response = await blogApi.updateBySlug(slug, formData);
      showToast("Blog updated successfully.");
      router.replace({
        pathname: "/blog",
        params: { slug: response.data.result.slug },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (slug) {
      router.replace({
        pathname: "/blog/[slug]",
        params: { slug },
      });
    } else {
      router.replace("/blog");
    }
  };

  if (isInitializing || fetching) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <View style={[styles.centered, { padding: spacing.xl }]}>
          <ThemedText variant="bodySmall" semantic="muted">
            {isInitializing ? "Checking your account..." : "Loading blog..."}
          </ThemedText>
        </View>
      </ThemedSafeAreaView>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <View
          style={[styles.centered, { padding: spacing.xl, gap: spacing.md }]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={38}
            color={colors.mutedForeground}
          />
          <ThemedText variant="heading5" style={styles.centerText}>
            Sign in to edit this blog
          </ThemedText>
          <ThemedButton title="Sign in" onPress={() => router.push("/login")} />
        </View>
      </ThemedSafeAreaView>
    );
  }

  if (error && !blog) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <View
          style={[styles.centered, { padding: spacing.xl, gap: spacing.md }]}
        >
          <ThemedText variant="heading5" style={styles.centerText}>
            Unable to load blog
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            style={styles.centerText}
          >
            {error}
          </ThemedText>
          <ThemedButton
            title="Go back"
            variant="outlined"
            onPress={handleCancel}
          />
        </View>
      </ThemedSafeAreaView>
    );
  }

  if (!blog) return null;

  if (blog.author?._id !== session.user.id) {
    return (
      <ThemedSafeAreaView edges={["top", "left", "right"]}>
        <Navbar />
        <View
          style={[styles.centered, { padding: spacing.xl, gap: spacing.md }]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={38}
            color={colors.mutedForeground}
          />
          <ThemedText variant="heading5" style={styles.centerText}>
            You cannot edit this blog
          </ThemedText>
          <ThemedButton
            title="View blog"
            variant="outlined"
            onPress={handleCancel}
          />
        </View>
      </ThemedSafeAreaView>
    );
  }

  const currentImageUri = getImageUri(blog.image);

  return (
    <ThemedSafeAreaView edges={["top", "left", "right"]}>
      <Navbar />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xl,
          },
        ]}
      >
        <View style={[styles.pageHeader, { marginBottom: spacing.lg }]}>
          <ThemedText variant="caption" semantic="primary">
            WRITE
          </ThemedText>
          <ThemedText variant="heading2" style={{ marginTop: spacing.xs }}>
            Edit blog
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            semantic="muted"
            style={{ marginTop: spacing.xs }}
          >
            Update your blog post below.
          </ThemedText>
        </View>

        <ThemedCard style={{ padding: spacing.md }}>
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

            <FormField
              label="Title"
              required
              error={fieldErrors.title}
              hint={`${title.length}/120 characters`}
            >
              <ThemedTextInput
                accessibilityLabel="Blog title"
                value={title}
                onChangeText={(value) => updateField("title", value, setTitle)}
                placeholder="Enter your blog title"
                maxLength={120}
                editable={!submitting}
                returnKeyType="next"
              />
            </FormField>

            <FormField
              label="Description"
              required
              error={fieldErrors.description}
              hint="Write at least 20 characters."
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
              hint="Choose a new image to replace the current cover."
            >
              {image ? (
                <FormImagePicker
                  image={image}
                  onChange={setImage}
                  onError={setError}
                  disabled={submitting}
                />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {currentImageUri && !imageFailed ? (
                    <View style={styles.currentImageContainer}>
                      <Image
                        source={{ uri: currentImageUri }}
                        accessibilityLabel="Current cover image"
                        resizeMode="cover"
                        onError={() => setImageFailed(true)}
                        style={[
                          styles.currentImage,
                          {
                            backgroundColor: colors.muted,
                            borderRadius: radii.md,
                          },
                        ]}
                      />
                      <ThemedText variant="caption" semantic="muted">
                        Current cover image
                      </ThemedText>
                    </View>
                  ) : null}
                  <FormImagePicker
                    image={null}
                    onChange={setImage}
                    onError={setError}
                    disabled={submitting}
                  />
                </View>
              )}
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
                title="Save changes"
                loading={submitting}
                loadingText="Saving..."
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
  pageHeader: {},
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
  currentImageContainer: {
    alignSelf: "flex-start",
    gap: 6,
  },
  currentImage: {
    height: 160,
    width: 160,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
  },
});
