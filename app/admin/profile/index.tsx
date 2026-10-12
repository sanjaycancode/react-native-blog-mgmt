import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Linking,
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
  Divider,
  Text,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import { getErrorMessage } from "@/utils/errorMessage";
import { imgSrc } from "@/utils/getImgSrc";

export default function AdminProfilePage() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const authUser = session?.user;
  const isAdmin = authUser?.role === "admin";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isAdmin, isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (isInitializing || !isAuthenticated || !isAdmin) return;

    let active = true;
    setLoading(true);
    setError("");

    void profileApi
      .get()
      .then((response) => {
        if (active) setProfile(response.data.profile ?? null);
      })
      .catch((requestError: unknown) => {
        const status = (
          requestError as { response?: { status?: number } }
        )?.response?.status;
        if (!active) return;
        if (status !== 400) setError("Unable to load profile.");
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
  }, [isAdmin, isAuthenticated, isInitializing, reloadKey]);

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

  const openSocialLink = useCallback(
    async (value: string) => {
      const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      try {
        await Linking.openURL(href);
      } catch {
        showToast("Unable to open this link.", "error");
      }
    },
    [showToast],
  );

  if (isInitializing || !isAuthenticated || !isAdmin) {
    return (
      <View
        style={[
          styles.centered,
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

  const displayName = profile?.user?.name ?? authUser?.name ?? "Admin";
  const email = profile?.user?.email ?? authUser?.email ?? "";
  const avatar = profile?.avatar
    ? imgSrc(profile.avatar, "profile")
    : undefined;
  const socialLinks = Object.entries(profile?.socialLinks ?? {}).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0,
  ) as [string, string][];

  return (
    <AdminShell userName={authUser?.name} onLogout={() => void handleLogout()}>
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


        {loading ? (
          <View style={[styles.centered, styles.loading, { gap: spacing.md }]}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.mutedForeground }}>
              Loading profile...
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
            <Card.Content style={[styles.centered, { gap: spacing.md }]}>
              <Ionicons
                name="alert-circle-outline"
                size={36}
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
        ) : (
          <Card
            mode="outlined"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radii.md,
            }}
          >
            <Card.Content style={{ padding: spacing.md, gap: spacing.lg }}>
              <View style={[styles.header, { gap: spacing.md }]}>
                <View style={[styles.identity, { gap: spacing.md }]}>
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      accessibilityLabel={`${displayName} profile picture`}
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.secondary },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarFallback,
                        {
                          backgroundColor: colors.secondary,
                          borderRadius: radii.full,
                        },
                      ]}
                    >
                      <Text
                        variant="headlineMedium"
                        style={{
                          color: colors.secondaryForeground,
                          fontWeight: "700",
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text
                      variant="headlineSmall"
                      style={{ color: colors.foreground, fontWeight: "700" }}
                    >
                      {displayName}
                    </Text>
                    {email ? (
                      <Text
                        variant="bodyMedium"
                        selectable
                        style={{ color: colors.mutedForeground }}
                      >
                        {email}
                      </Text>
                    ) : null}
                    <Chip
                      compact
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: colors.secondary,
                      }}
                      textStyle={{
                        color: colors.secondaryForeground,
                        fontWeight: "600",
                      }}
                    >
                      Administrator
                    </Chip>
                  </View>
                </View>
                <Button
                  mode="outlined"
                  icon={({ color, size }) => (
                    <Ionicons
                      name="create-outline"
                      size={size}
                      color={color}
                    />
                  )}
                  onPress={() =>
                    router.push("/admin/profile/edit" as Href)
                  }
                  compact
                >
                  Edit
                </Button>
              </View>

              <Divider />

              {profile?.bio ? (
                <View style={{ gap: spacing.sm }}>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: colors.mutedForeground,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    ABOUT
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.foreground, lineHeight: 24 }}
                  >
                    {profile.bio}
                  </Text>
                </View>
              ) : null}

              {socialLinks.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: colors.mutedForeground,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    SOCIAL LINKS
                  </Text>
                  <View style={{ gap: spacing.sm }}>
                    {socialLinks.map(([label, value]) => (
                      <Pressable
                        key={label}
                        accessibilityRole="link"
                        accessibilityLabel={`${label}: ${value}`}
                        onPress={() => void openSocialLink(value)}
                        style={({ pressed }) => [
                          styles.socialLink,
                          {
                            backgroundColor: colors.muted,
                            borderRadius: radii.md,
                            gap: spacing.sm,
                            padding: spacing.md,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            label === "instagram"
                              ? "logo-instagram"
                              : label === "facebook"
                                ? "logo-facebook"
                                : "globe-outline"
                          }
                          size={18}
                          color={colors.primary}
                        />
                        <Text
                          variant="bodyMedium"
                          style={{ color: colors.foreground, flex: 1 }}
                        >
                          <Text style={{ fontWeight: "700", textTransform: "capitalize" }}>
                            {label}:{" "}
                          </Text>
                          {value}
                        </Text>
                        <Ionicons
                          name="open-outline"
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {!profile?.bio && socialLinks.length === 0 ? (
                <View
                  style={[
                    styles.noDetails,
                    {
                      backgroundColor: colors.muted,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      gap: spacing.xs,
                    },
                  ]}
                >
                  <Text
                    variant="titleSmall"
                    style={{ color: colors.foreground }}
                  >
                    No profile details added yet
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.mutedForeground }}
                  >
                    Add an about section or social links using Edit Profile.
                  </Text>
                </View>
              ) : null}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loading: {
    minHeight: 220,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 220,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  socialLink: {
    alignItems: "center",
    flexDirection: "row",
  },
  noDetails: {},
});