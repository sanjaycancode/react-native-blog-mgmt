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
  IconButton,
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

const TITLE_MAX_LENGTH = 100;

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { colors, spacing, radii, typography } = useTheme();
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.heading, { gap: spacing.md }]}>
          <View style={styles.headingText}>
            <Text
              variant="headlineSmall"
              style={{
                color: colors.foreground,
                fontWeight: typography.weights.semibold,
              }}
            >
              Categories
            </Text>
            
          </View>
          <Button
            mode="contained"
            compact
            icon={({ color, size }) => (
              <Ionicons name="add" color={color} size={size} />
            )}
            onPress={openCreate}
          >
            Add
          </Button>
        </View>

        {/* Count */}
        {!loading && !error && categories.length > 0 ? (
          <View style={styles.countRow}>
            
            
          </View>
        ) : null}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </View>
        ) : error ? (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.primary,
              borderRadius: radii.lg,
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
                style={{ color: colors.primary, textAlign: "center" }}
              >
                {error}
              </Text>
              <Button
                mode="outlined"
                icon="refresh"
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
              borderRadius: radii.lg,
            }}
          >
            <Card.Content style={[styles.emptyState, { gap: spacing.sm }]}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.muted, borderRadius: radii.full },
                ]}
              >
                <Ionicons
                  name="pricetags-outline"
                  size={28}
                  color={colors.mutedForeground}
                />
              </View>
              <Text variant="titleMedium" style={{ color: colors.foreground }}>
                No categories yet
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: colors.mutedForeground, textAlign: "center" }}
              >
                Add your first category to start organizing blog posts.
              </Text>
              <Button
                mode="contained"
                compact
                onPress={openCreate}
                icon={({ color, size }) => (
                  <Ionicons name="add" color={color} size={size} />
                )}
                style={{ marginTop: spacing.xs }}
              >
                Add category
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {categories.map((category) => (
              <CategoryRow
                key={category._id}
                category={category}
                onEdit={() => openEdit(category)}
                onDelete={() => setDeleteTarget(category)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        {/* Add / edit dialog */}
        <Dialog
          visible={dialogOpen}
          onDismiss={closeCategoryDialog}
          style={{ backgroundColor: colors.background }}
        >
          <Dialog.Title>
            {editingCategory ? "Edit category" : "Add category"}
          </Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              {editingCategory
                ? "Rename this category. Existing blogs keep it."
                : "Choose a short, clear name readers will recognize."}
            </Text>
            <TextInput
              autoFocus
              label="Category name"
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={() => void handleSave()}
              returnKeyType="done"
              disabled={saving}
              maxLength={TITLE_MAX_LENGTH}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={{ backgroundColor: colors.card }}
              right={
                <TextInput.Affix
                  text={`${title.length}/${TITLE_MAX_LENGTH}`}
                />
              }
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeCategoryDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => void handleSave()}
              loading={saving}
              disabled={saving || !title.trim()}
            >
              {editingCategory ? "Save" : "Create"}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete dialog */}
        <Dialog
          visible={Boolean(deleteTarget)}
          onDismiss={() => !deleting && setDeleteTarget(null)}
          style={{ backgroundColor: colors.background }}
        >
          <Dialog.Title>Delete category</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <Text
              variant="titleSmall"
              numberOfLines={2}
              style={{
                color: colors.foreground,
                fontWeight: typography.weights.semibold,
              }}
            >
              {deleteTarget?.title ?? "this category"}
            </Text>
            <Text variant="bodyMedium">
              This can&apos;t be undone. Blogs that use it will show as
              uncategorized.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onPress={() => void handleDelete()}
              loading={deleting}
              disabled={deleting}
              textColor={colors.primary}
            >
              Yes, delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AdminShell>
  );
}

/* ─── Category row ────────────────────────────────────────────── */

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: AdminCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors, spacing, radii, typography } = useTheme();
  const created = category.createdAt ? new Date(category.createdAt) : null;
  const dateLabel =
    created && !Number.isNaN(created.getTime())
      ? created.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;
  const name = category.title || "Untitled category";

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          paddingVertical: spacing.sm,
          paddingLeft: spacing.md,
          paddingRight: spacing.xs,
          gap: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.badgePrimaryBg, borderRadius: radii.md },
        ]}
      >
        <Ionicons
          name="pricetag-outline"
          size={20}
          color={colors.badgePrimaryText}
        />
      </View>

      <View style={styles.rowText}>
        <Text
          variant="titleSmall"
          numberOfLines={2}
          style={{
            color: colors.foreground,
            fontWeight: typography.weights.semibold,
          }}
        >
          {name}
        </Text>
        {dateLabel ? (
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={10}
              color={colors.mutedForeground}
            />
            <Text variant="bodySmall"  style={{fontSize:10, color: colors.mutedForeground }}>
              Created {dateLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rowActions}>
        <IconButton
          accessibilityLabel={`Edit ${name}`}
          icon={({ size, color }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          )}
          iconColor={colors.mutedForeground}
          size={20}
          onPress={onEdit}
        />
        <IconButton
          accessibilityLabel={`Delete ${name}`}
          icon={({ size, color }) => (
            <Ionicons name="trash-outline" size={size} color={color} />
          )}
          iconColor={colors.primary}
          size={20}
          onPress={onDelete}
        />
      </View>
    </View>
  );
}


function CategorySkeleton() {
  const { colors, spacing, radii } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
          gap: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.muted, borderRadius: radii.md },
        ]}
      />
      <View style={[styles.rowText, { gap: spacing.sm }]}>
        <View
          style={[
            styles.skeletonLine,
            { width: "60%", height: 16, backgroundColor: colors.muted },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "35%", backgroundColor: colors.muted },
          ]}
        />
      </View>
    </View>
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
  headingText: {
    flex: 1,
    gap: 2,
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  countPill: {
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
});