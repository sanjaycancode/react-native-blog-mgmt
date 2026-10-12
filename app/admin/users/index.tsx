import { useCallback, useEffect, useState } from "react";
import {
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
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              Search and manage user accounts.
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

        <View style={{flexDirection:"row",alignItems:"center", gap: 8 }}>
          <View style={{flex:1}}>
          <SearchBox 
            initialValue={search}
            onSearch={setSearch}
            placeholder="Search by name..."
          />
          </View>
          <Button
            mode="outlined"
            icon={({ color, size }) => (
              <Ionicons
                name="chevron-down"
                color={color}
                size={size}
              />
            )}
            contentStyle={styles.filterButtonContent}
            style={styles.filterButton}
            onPress={() => setRoleDialogOpen(true)}
          >
            {activeRoleLabel}
          </Button>
        </View>

        {loading ? (
          <View style={[styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Loading users...
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
        ) : users.length === 0 ? (
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
            <Text variant="bodySmall" style={{ color: colors.mutedForeground }}>
              {users.length} {users.length === 1 ? "user" : "users"}
            </Text>
            {users.map((item) => {
              const isUserAdmin = item.role === "admin";
              return (
                <Card
                  key={item._id}
                  mode="outlined"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  }}
                >
                  <Card.Content style={{ gap: spacing.md }}>
                    <View style={{flexDirection:"row"}}>
                    <View style={[styles.userInfo, { gap: spacing.md, flex:1 }]}>
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
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text
                          variant="titleMedium"
                          style={{ color: colors.foreground }}
                        >
                          {item.name || "Unnamed user"}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: colors.mutedForeground }}
                          selectable
                        >
                          {item.email || "No email"}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.cardFooter, { gap: spacing.sm }]}>
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
                        onPress={() => setDeleteTarget(item)}
                      >
                        Delete
                      </Button>
                    </View>
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
        >
          <Dialog.Title>Filter by role</Dialog.Title>
          <Dialog.Content>
            <View style={{ gap: spacing.sm }}>
              {ROLE_FILTERS.map((filter) => (
                <Chip
                  key={filter.value || "all"}
                  selected={role === filter.value}
                  onPress={() => {
                    setRole(filter.value);
                    setRoleDialogOpen(false);
                  }}
                  style={{
                    backgroundColor:
                      role === filter.value ? colors.card : colors.card,
                  }}
                >
                  {filter.label}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRoleDialogOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(deleteTarget)}
          onDismiss={() => !deleting && setDeleteTarget(null)}
        >
          <Dialog.Title>Delete User</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete &quot;
              {deleteTarget?.name ?? "this user"}&quot;?
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
  userInfo: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterButton: {
    alignSelf: "flex-start",
  },
  filterButtonContent: {
    flexDirection: "row-reverse",
  },
});
