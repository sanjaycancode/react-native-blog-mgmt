import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { type Href, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  Portal,
  Text,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import SearchBox from "@/components/SearchBox";

import { adminApi } from "@/api/services/admin";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import type { AdminUser } from "@/types/admin";

import { getErrorMessage } from "@/utils/errorMessage";

type UserRole = "" | "user" | "admin";

const ROLE_FILTERS: { label: string; value: UserRole }[] = [
  { label: "All roles", value: "" },
  { label: "Users", value: "user" },
  { label: "Admins", value: "admin" },
];

// Destructive actions read better in red. Swap for a theme token if you have one.
const DANGER_COLOR = "#DC2626";

export default function AdminUsersPage() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
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
      .listUsers({ search: search || undefined, role: role || undefined })
      .then((response) => {
        if (!active) return;
        if (!Array.isArray(response.data)) {
          throw new Error("The users response has an unexpected format.");
        }
        setUsers(response.data);
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
  }, [isAdmin, isInitializing, reloadKey, role, search]);

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

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteTarget._id);
      setUsers((current) =>
        current.filter((item) => item._id !== deleteTarget._id),
      );
      setDeleteTarget(null);
      showToast("User deleted.");
    } catch (deleteError) {
      showToast(getErrorMessage(deleteError), "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, showToast]);

  const openUser = useCallback(
    (id: string) => router.push(`/admin/users/${encodeURIComponent(id)}` as Href),
    [router],
  );

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

  const activeRoleLabel =
    ROLE_FILTERS.find((filter) => filter.value === role)?.label ?? "All roles";

  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
  };

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
        <View style={[styles.heading, { gap: spacing.md }]}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.foreground, fontWeight: "700" }}
            >
              Users
            </Text>
           
          </View>
          <Button
            mode="contained"
            icon={({ color, size }) => (
              <Ionicons name="person-add-outline" color={color} size={size} />
            )}
            onPress={() => router.push("/admin/users/create" as Href)}
            compact
          >
            Create
          </Button>
        </View>

        {/* Search + role filter */}
        <View style={[styles.toolbar, { gap: spacing.sm }]}>
          <View style={styles.searchWrapper}>
            <SearchBox
              initialValue={search}
              onSearch={setSearch}
              placeholder="Search by name..."
            />
          </View>
          <Button
            mode="outlined"
            icon={({ color, size }) => (
              <Ionicons name="chevron-down" color={color} size={size} />
            )}
            contentStyle={styles.filterButtonContent}
            style={[
              styles.filterButton,
              {
                borderColor: role ? colors.primary : colors.border,
                borderRadius: radii.md,
              },
            ]}
            textColor={role ? colors.primary : colors.foreground}
            onPress={() => setRoleDialogOpen(true)}
            accessibilityLabel={`Filter by role, currently ${activeRoleLabel}`}
          >
            {activeRoleLabel}
          </Button>
        </View>

        {/* Content states */}
        {loading ? (
          <View style={[styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Loading users...
            </Text>
          </View>
        ) : error ? (
          <Card mode="outlined" style={cardStyle}>
            <Card.Content style={[styles.emptyState, { gap: spacing.md }]}>
              <Ionicons
                name="alert-circle-outline"
                size={34}
                color={DANGER_COLOR}
              />
              <Text
                variant="bodyMedium"
                style={{ color: colors.foreground, textAlign: "center" }}
              >
                {error}
              </Text>
              <Button
                mode="outlined"
                icon={({ color, size }) => (
                  <Ionicons name="refresh-outline" color={color} size={size} />
                )}
                onPress={() => setReloadKey((current) => current + 1)}
              >
                Try again
              </Button>
            </Card.Content>
          </Card>
        ) : users.length === 0 ? (
          <Card mode="outlined" style={cardStyle}>
            <Card.Content style={[styles.emptyState, { gap: spacing.md }]}>
              <Ionicons
                name="people-outline"
                size={34}
                color={colors.mutedForeground}
              />
              <Text variant="titleMedium" style={{ color: colors.foreground }}>
                No users found
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: colors.mutedForeground, textAlign: "center" }}
              >
                Try another search or role filter.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text
              variant="labelLarge"
              style={{ color: colors.mutedForeground }}
            >
              {users.length} {users.length === 1 ? "user" : "users"}
            </Text>

            {users.map((item) => {
              const isUserAdmin = item.role === "admin";
              const displayName = item.name?.trim() || "Unnamed user";

              return (
                <Card key={item._id} mode="outlined" style={cardStyle}>
                  <Card.Content style={{ gap: spacing.md }}>
                    {/* Identity row */}
                    <View style={[styles.userRow, { gap: spacing.md }]}>
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`View ${item.name || "user"} details`}
                        onPress={() => openUser(item._id)}
                        style={[styles.userInfo, { gap: spacing.md }]}
                      >
                        <View
                          style={[
                            styles.avatar,
                            {
                              backgroundColor: isUserAdmin
                                ? colors.badgePrimaryBg
                                : colors.secondary,
                              borderRadius: radii.full,
                            },
                          ]}
                        >
                          <Text
                            variant="titleMedium"
                            style={{
                              color: isUserAdmin
                                ? colors.badgePrimaryText
                                : colors.secondaryForeground,
                              fontWeight: "700",
                            }}
                          >
                            {item.name?.trim().charAt(0).toUpperCase() || "?"}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            variant="titleMedium"
                            numberOfLines={1}
                            style={{
                              color: colors.foreground,
                              fontWeight: "600",
                            }}
                          >
                            {displayName}
                          </Text>
                          <Text
                            variant="bodySmall"
                            numberOfLines={1}
                            style={{ color: colors.mutedForeground }}
                            selectable
                          >
                            {item.email || "No email"}
                          </Text>
                        </View>
                      </Pressable>

                      <Chip
                        compact
                        style={{
                          backgroundColor: isUserAdmin
                            ? colors.badgePrimaryBg
                            : colors.badgeBg,
                        }}
                        textStyle={{
                          color: isUserAdmin
                            ? colors.badgePrimaryText
                            : colors.badgeText,
                        }}
                      >
                        {isUserAdmin ? "Admin" : "User"}
                      </Chip>
                    </View>

                    <Divider style={{ backgroundColor: colors.border }} />

                    {/* Actions */}
                    <View style={styles.cardFooter}>
                      <Button
                        mode="text"
                        compact
                        textColor={colors.primary}
                        icon={({ color, size }) => (
                          <Ionicons
                            name="person-circle-outline"
                            color={color}
                            size={size}
                          />
                        )}
                        onPress={() => openUser(item._id)}
                      >
                        View details
                      </Button>
                      <Button
                        mode="text"
                        compact
                        textColor={DANGER_COLOR}
                        icon={({ color, size }) => (
                          <Ionicons
                            name="trash-outline"
                            color={color}
                            size={size}
                          />
                        )}
                        onPress={() => setDeleteTarget(item)}
                        accessibilityLabel={`Delete ${displayName}`}
                      >
                        Delete
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={roleDialogOpen}
          onDismiss={() => setRoleDialogOpen(false)}
          style={{ backgroundColor: colors.card, borderRadius: radii.lg ?? radii.md }}
        >
          <Dialog.Title>Filter by role</Dialog.Title>
          <Dialog.Content>
            <View style={{ gap: spacing.sm }}>
              {ROLE_FILTERS.map((filter) => {
                const selected = role === filter.value;
                return (
                  <Chip
                    key={filter.value || "all"}
                    selected={selected}
                    showSelectedOverlay
                    onPress={() => {
                      setRole(filter.value);
                      setRoleDialogOpen(false);
                    }}
                    style={{
                      backgroundColor: selected
                        ? colors.badgePrimaryBg
                        : colors.card,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: selected ? colors.primary : colors.border,
                    }}
                    textStyle={{
                      color: selected
                        ? colors.badgePrimaryText
                        : colors.foreground,
                    }}
                  >
                    {filter.label}
                  </Chip>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRoleDialogOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(deleteTarget)}
          onDismiss={() => !deleting && setDeleteTarget(null)}
          style={{ backgroundColor: colors.card, borderRadius: radii.lg ?? radii.md }}
        >
          <Dialog.Title>Delete User</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <Text variant="bodyMedium">
              Are you sure you want to delete &quot;
              {deleteTarget?.name ?? "this user"}&quot;?
            </Text>
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={DANGER_COLOR}
              textColor="#FFFFFF"
              onPress={() => void handleDelete()}
              loading={deleting}
              disabled={deleting}
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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchWrapper: {
    flex: 1,
  },
  filterButton: {
    alignSelf: "center",
  },
  filterButtonContent: {
    flexDirection: "row-reverse",
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
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: -8,
    marginBottom: -4,
  },
});