import { type ReactNode, useCallback, useEffect, useState } from "react";
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
  Text,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import { getErrorMessage } from "@/utils/errorMessage";
import { imgSrc } from "@/utils/getImgSrc";

const DANGER_COLOR = "#DC2626";
const BANNER_HEIGHT = 66;
const AVATAR_SIZE = 88;

function getSocialIcon(label: string): keyof typeof Ionicons.glyphMap {
  const key = label.toLowerCase();
  if (key === "instagram") return "logo-instagram";
  if (key === "facebook") return "logo-facebook";
  if (key === "twitter" || key === "x") return "logo-twitter";
  if (key === "linkedin") return "logo-linkedin";
  if (key === "github") return "logo-github";
  if (key === "youtube") return "logo-youtube";
  return "globe-outline";
}

function getDisplayHost(value: string) {
  try {
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(href);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return value;
  }
}

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
        const status = (requestError as { response?: { status?: number } })
          ?.response?.status;
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

  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg ?? radii.md,
    overflow: "hidden" as const,
  };

  const goToEdit = () => router.push("/admin/profile/edit" as Href);

  return (
    <AdminShell userName={authUser?.name} onLogout={() => void handleLogout()}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            padding: spacing.md,
            paddingBottom: spacing["4xl"],
            gap: spacing.md,
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
            <Text
              variant="bodyMedium"
              style={{ color: colors.mutedForeground }}
            >
              Loading profile...
            </Text>
          </View>
        ) : error ? (
          <Card mode="outlined" style={cardStyle}>
            <Card.Content style={[styles.centered, { gap: spacing.md }]}>
              <Ionicons
                name="alert-circle-outline"
                size={36}
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
        ) : (
          <>
            <Card mode="outlined" style={cardStyle}>
              <View
                style={[
                  styles.banner,
                  {
                    backgroundColor: colors.secondary,
                    marginBottom: spacing.md,
                  },
                ]}
              />
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.md,
                }}
              >
                <View style={styles.avatarRow}>
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      accessibilityLabel={`${displayName} profile picture`}
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: colors.secondary,
                          borderColor: colors.card,
                        },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarFallback,
                        {
                          backgroundColor: colors.secondary,
                          borderColor: colors.card,
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
                  <Button
                    mode="outlined"
                    icon={({ color, size }) => (
                      <Ionicons
                        name="create-outline"
                        size={size}
                        color={color}
                      />
                    )}
                    onPress={goToEdit}
                  >
                    Edit
                  </Button>
                </View>

                <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                  <Text
                    variant="headlineSmall"
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {displayName}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    {email ? (
                      <View style={[styles.inlineRow, { gap: spacing.xs }]}>
                        <Ionicons
                          name="mail-outline"
                          size={15}
                          color={colors.mutedForeground}
                        />
                        <Text
                          variant="bodyMedium"
                          selectable
                          style={{
                            color: colors.mutedForeground,
                            flexShrink: 1,
                          }}
                        >
                          {email}
                        </Text>
                      </View>
                    ) : null}
                    <Chip
                      compact
                      style={{
                        backgroundColor: colors.badgePrimaryBg,
                        marginTop: spacing.xs,
                        height: 32,
                      }}
                      textStyle={{
                        color: colors.badgePrimaryText,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Admin
                    </Chip>
                  </View>
                </View>
              </View>
            </Card>

            {profile?.bio ? (
              <SectionCard title="About" icon="person-outline">
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.foreground, lineHeight: 24 }}
                >
                  {profile.bio}
                </Text>
              </SectionCard>
            ) : null}

            {socialLinks.length > 0 ? (
              <SectionCard title="Social links" icon="link-outline">
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
                          gap: spacing.md,
                          padding: spacing.sm,
                          paddingRight: spacing.md,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.socialIcon,
                          { backgroundColor: colors.badgePrimaryBg },
                        ]}
                      >
                        <Ionicons
                          name={getSocialIcon(label)}
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="titleSmall"
                          style={{
                            color: colors.foreground,
                            textTransform: "capitalize",
                          }}
                        >
                          {label}
                        </Text>
                        <Text
                          variant="bodySmall"
                          numberOfLines={1}
                          style={{ color: colors.mutedForeground }}
                        >
                          {getDisplayHost(value)}
                        </Text>
                      </View>
                      <Ionicons
                        name="open-outline"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  ))}
                </View>
              </SectionCard>
            ) : null}

            {/* Empty state */}
            {!profile?.bio && socialLinks.length === 0 ? (
              <Card mode="outlined" style={cardStyle}>
                <Card.Content
                  style={[styles.emptyDetails, { gap: spacing.sm }]}
                >
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={26}
                      color={colors.mutedForeground}
                    />
                  </View>
                  <Text
                    variant="titleSmall"
                    style={{ color: colors.foreground }}
                  >
                    No profile details added yet
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: colors.mutedForeground,
                      textAlign: "center",
                    }}
                  >
                    Add an about section or social links using Edit Profile.
                  </Text>
                  <Button mode="outlined" compact onPress={goToEdit}>
                    Edit profile
                  </Button>
                </Card.Content>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </AdminShell>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  const { colors, spacing, radii } = useTheme();

  return (
    <Card
      mode="outlined"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: radii.lg ?? radii.md,
      }}
    >
      <Card.Content style={{ gap: spacing.md }}>
        <View style={[styles.inlineRow, { gap: spacing.sm }]}>
          <Ionicons name={icon} size={16} color={colors.primary} />
          <Text
            variant="labelMedium"
            style={{
              color: colors.mutedForeground,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {title}
          </Text>
        </View>
        {children}
      </Card.Content>
    </Card>
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
  banner: {
    height: BANNER_HEIGHT,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: -(AVATAR_SIZE / 2),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  socialLink: {
    alignItems: "center",
    flexDirection: "row",
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDetails: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
