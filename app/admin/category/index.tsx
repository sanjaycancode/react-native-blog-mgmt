import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { adminApi } from "@/api/services/admin";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { AdminCategory } from "@/types/admin";

import { getErrorMessage } from "@/utils/errorMessage";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isAdmin, isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (!isAdmin || isInitializing) return;

    let active = true;
    setLoading(true);
    setError("");

    void adminApi
      .listCategories()
      .then((response) => {
        if (!active) return;
        const result = response.data.result;
        if (!Array.isArray(result)) {
          throw new Error("The categories response has an unexpected format.");
        }
        setCategories(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin, isInitializing, reloadKey]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      showToast(getErrorMessage(logoutError), "error");
    }
  }, [logout, router, showToast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((current) => current + 1);
  }, []);

  const openCreate = useCallback(() => {
    setEditingCategory(null);
    setTitle("");
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((category: AdminCategory) => {
    setEditingCategory(category);
    setTitle(category.title ?? "");
    setDialogOpen(true);
  }, []);

  const closeCategoryDialog = useCallback(() => {
    if (saving) return;
    setDialogOpen(false);
    setEditingCategory(null);
    setTitle("");
  }, [saving]);

  const handleSave = useCallback(async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    setSaving(true);
    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory._id, {
          title: normalizedTitle,
        });
        setCategories((current) =>
          current.map((category) =>
            category._id === editingCategory._id
              ? { ...category, title: normalizedTitle }
              : category,
          ),
        );
        showToast("Category updated.");
      } else {
        const response = await adminApi.createCategory({
          title: normalizedTitle,
        });
        setCategories((current) => [...current, response.data.result]);
        showToast("Category created.");
      }
      setDialogOpen(false);
      setEditingCategory(null);
      setTitle("");
    } catch (saveError) {
      showToast(getErrorMessage(saveError), "error");
    } finally {
      setSaving(false);
    }
  }, [editingCategory, showToast, title]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await adminApi.deleteCategory(deleteTarget._id);
      setCategories((current) =>
        current.filter((category) => category._id !== deleteTarget._id),
      );
      setDeleteTarget(null);
      showToast("Category deleted.");
    } catch (deleteError) {
      showToast(getErrorMessage(deleteError), "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, showToast]);

  if (isInitializing || !isAuthenticated || !isAdmin) {
    return (
      <View
        style={[
          styles.accessLoading,
          { backgroundColor: colors.background, gap: spacing.md },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text variant="bodyMedium" style={{ color: colors.foreground }}>
          Checking administrator access...
        </Text>
      </View>
    );
  }

  return (
    <AdminShell userName={user?.name} onLogout={() => void handleLogout()}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            padding: spacing.md,
            paddingBottom: spacing["4xl"],
            gap: spacing.lg,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heading, { gap: spacing.md }]}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.foreground, fontWeight: "700" }}
            >
              Categories
            </Text>
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              Create and manage blog categories.
            </Text>
          </View>
          <Button
            mode="contained"
            icon={({ color, size }) => (
              <Ionicons name="add" color={color} size={size} />
            )}
            onPress={openCreate}
            compact
          >
            Add
          </Button>
        </View>

        {loading ? (
          <View style={[styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Loading categories...
            </Text>
          </View>
        ) : error ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
            }}
          >
            <Card.Content style={[styles.emptyState, { gap: spacing.md }]}>
              <Ionicons
                name="alert-circle-outline"
                size={34}
                color={colors.primary}
              />
              <Text
                variant="bodyMedium"
                style={{ color: colors.foreground, textAlign: "center" }}
              >
                {error}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setReloadKey((current) => current + 1)}
              >
                Try again
              </Button>
            </Card.Content>
          </Card>
        ) : categories.length === 0 ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
            }}
          >
            <Card.Content style={[styles.emptyState, { gap: spacing.md }]}>
              <Ionicons
                name="pricetags-outline"
                size={34}
                color={colors.mutedForeground}
              />
              <Text variant="titleMedium" style={{ color: colors.foreground }}>
                No categories yet
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: colors.mutedForeground, textAlign: "center" }}
              >
                Add a category to organize blog posts.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"}
            </Text>

{categories.map((category) => (
  <Card
    key={category._id}
    mode="outlined"
    style={[
      styles.categoryCardContainer,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: radii.lg,
      },
    ]}
  >
    <Card.Content style={styles.categoryCard}>
      {/* Category icon and details */}
      <View style={styles.categoryInfo}>
        <View
          style={[
            styles.categoryIcon,
            {
              backgroundColor: colors.secondary,
              borderRadius: radii.md,
            },
          ]}
        >
          <Ionicons
            name="pricetag-outline"
            size={20}
            color={colors.primary}
          />
        </View>

        <View style={styles.categoryDetails}>
          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={{
              color: colors.foreground,
              fontWeight: "600",
            }}
          >
            {category.title || "Untitled category"}
          </Text>

          {category.createdAt ? (
            <Text
              variant="bodySmall"
              style={{ color: colors.mutedForeground }}
            >
              Created{" "}
              {new Date(category.createdAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
     
          compact
          icon={({ color, size }) => (
            <Ionicons
            mode="text"
              name="create-outline"
              color={color}
              size={15}
            />
          )}
          onPress={() => openEdit(category)}
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
        >
          Edit
        </Button>

        <Button
          mode="text"
          compact
          textColor={colors.primary}
          icon={({ color, size }) => (
            <Ionicons
              name="trash-outline"
              color={color}
              size={size}
            />
          )}
          onPress={() => setDeleteTarget(category)}
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
        >
          Delete
        </Button>
      </View>
    </Card.Content>
  </Card>
))}

          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={closeCategoryDialog}>
          <Dialog.Title>
            {editingCategory ? "Edit Category" : "Add Category"}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              autoFocus
              label={editingCategory ? "New title" : "Category title"}
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={() => void handleSave()}
              returnKeyType="done"
              disabled={saving}
              maxLength={100}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeCategoryDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              onPress={() => void handleSave()}
              loading={saving}
              disabled={saving || !title.trim()}
            >
              {editingCategory ? "Save" : "Create"}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(deleteTarget)}
          onDismiss={() => !deleting && setDeleteTarget(null)}
        >
          <Dialog.Title>Delete Category</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete &quot;
              {deleteTarget?.title ?? "this category"}&quot;?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onPress={() => void handleDelete()}
              loading={deleting}
              disabled={deleting}
              textColor={colors.primary}
            >
              Yes, Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AdminShell>
  );
}


const styles = StyleSheet.create({
  accessLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flexGrow: 1,
  },

  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  loading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },

  categoryCardContainer: {
    borderWidth: 1,
    marginBottom: 0,
    elevation: 0,
  },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 8,
  },

  categoryInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryDetails: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },

  actionButton: {
    marginHorizontal: 0,
  },

  actionButtonContent: {
    paddingHorizontal: 0,
  },

  actionButtonLabel: {
    fontSize: 12,
    marginHorizontal: 2,
  },
});

