import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { type Href, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  HelperText,
  Text,
  TextInput,
} from "react-native-paper";

import { AdminShell } from "@/app/admin/AdminShell";

import { profileApi, type ProfileData } from "@/api/services/profile";

import { useTheme } from "@/constants/theme";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

import { getErrorMessage } from "@/utils/errorMessage";
import { imgSrc } from "@/utils/getImgSrc";

const BIO_MAX_LENGTH = 250;

type SocialLinks = {
  instagram: string;
  facebook: string;
  website: string;
};
type PickedAvatar = {
  uri: string;
  name: string;
  type: string;
};

function validateUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AdminEditProfilePage() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { session, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const authUser = session?.user;
  const isAdmin = authUser?.role === "admin";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<SocialLinks>({
    instagram: "",
    facebook: "",
    website: "",
  });
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
        if (!active) return;
        const nextProfile = response.data.profile ?? null;
        setProfile(nextProfile);
        setName(nextProfile?.user?.name ?? authUser?.name ?? "");
        setEmail(nextProfile?.user?.email ?? authUser?.email ?? "");
        setBio(nextProfile?.bio ?? "");
        setLinks({
          instagram: nextProfile?.socialLinks?.instagram ?? "",
          facebook: nextProfile?.socialLinks?.facebook ?? "",
          website: nextProfile?.socialLinks?.website ?? "",
        });
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authUser?.email, authUser?.name, isAdmin, isAuthenticated, isInitializing]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (logoutError) {
      showToast(getErrorMessage(logoutError), "error");
    }
  }, [logout, router, showToast]);

  const linkErrors = useMemo(
    () => ({
      instagram: validateUrl(links.instagram)
        ? ""
        : "Enter a valid HTTP or HTTPS URL.",
      facebook: validateUrl(links.facebook)
        ? ""
        : "Enter a valid HTTP or HTTPS URL.",
      website: validateUrl(links.website)
        ? ""
        : "Enter a valid HTTP or HTTPS URL.",
    }),
    [links],
  );

  const handleAvatarPick = useCallback(async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Allow photo library access to select a profile image.", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const selected = result.assets[0];
    setAvatar({
      uri: selected.uri,
      name: selected.fileName ?? "profile-image.jpg",
      type: selected.mimeType ?? "image/jpeg",
    });
  }, [showToast]);

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (Object.values(linkErrors).some(Boolean)) return;

    setSaving(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    formData.append("bio", bio.trim());
    formData.append("socialLinks[instagram]", links.instagram.trim());
    formData.append("socialLinks[facebook]", links.facebook.trim());
    formData.append("socialLinks[website]", links.website.trim());
    if (avatar) {
      formData.append(
        "avatar",
        avatar as unknown as Blob,
      );
    }

    try {
      await profileApi.update(formData);
      showToast("Profile updated successfully.");
      router.replace("/admin/profile" as Href);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }, [avatar, bio, email, linkErrors, links, name, router, showToast]);

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

  const displayAvatar =
    avatar?.uri ??
    (profile?.avatar ? imgSrc(profile.avatar, "profile") : undefined);

  return (
    <AdminShell userName={authUser?.name} onLogout={() => void handleLogout()}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              padding: spacing.md,
              paddingBottom: spacing["4xl"],
              gap: spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >


          <View style={{ gap: spacing.xs }}>
            
            <Text
              variant="headlineSmall"
              style={{ color: colors.foreground, fontWeight: "700" }}
            >
              Edit Profile
            </Text>
           
          </View>

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
          ) : error && !profile ? (
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
                  onPress={() => router.replace("/admin/profile" as Href)}
                >
                  Back to profile
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
                <Text
                  variant="titleMedium"
                  style={{ color: colors.foreground, fontWeight: "700" }}
                >
                  Account
                </Text>

                <View style={{ gap: spacing.md }}>
                  <TextInput
                    label="Name"
                    mode="outlined"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    disabled={saving}
                    error={submitted && !name.trim()}
                  />
                  {submitted && !name.trim() ? (
                    <HelperText type="error" visible>
                      Name is required.
                    </HelperText>
                  ) : null}
                  <TextInput
                    label="Email"
                    mode="outlined"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    disabled={saving}
                    error={
                      submitted &&
                      (!email.trim() ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                    }
                  />
                  {submitted &&
                  (!email.trim() ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ? (
                    <HelperText type="error" visible>
                      {email.trim()
                        ? "Enter a valid email address."
                        : "Email is required."}
                    </HelperText>
                  ) : null}
                </View>

                <View style={{ gap: spacing.sm }}>
                  <Text
                    variant="labelLarge"
                    style={{ color: colors.foreground }}
                  >
                    Profile Image
                  </Text>
                  <View style={[styles.avatarPicker, { gap: spacing.md }]}>
                    {displayAvatar ? (
                      <Image
                        source={{ uri: displayAvatar }}
                        accessibilityLabel="Profile image preview"
                        style={[
                          styles.avatar,
                          { borderColor: colors.border },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatar,
                          styles.avatarFallback,
                          {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                            borderRadius: radii.full,
                          },
                        ]}
                      >
                        <Ionicons
                          name="person"
                          size={32}
                          color={colors.secondaryForeground}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Button
                        mode="outlined"
                        icon={({ color, size }) => (
                          <Ionicons
                            name="image-outline"
                            color={color}
                            size={size}
                          />
                        )}
                        onPress={() => void handleAvatarPick()}
                        disabled={saving}
                      >
                        {avatar ? "Choose another image" : "Upload image"}
                      </Button>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.mutedForeground }}
                      >
                        Select a square image for your profile.
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ gap: spacing.xs }}>
                  <TextInput
                    label="Bio"
                    mode="outlined"
                    value={bio}
                    onChangeText={setBio}
                    maxLength={BIO_MAX_LENGTH}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="Tell the community a little about yourself"
                    disabled={saving}
                  />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: colors.mutedForeground,
                      textAlign: "right",
                    }}
                  >
                    {bio.length}/{BIO_MAX_LENGTH}
                  </Text>
                </View>

                <Text
                  variant="titleMedium"
                  style={{ color: colors.foreground, fontWeight: "700" }}
                >
                  Social Links
                </Text>
                {(
                  [
                    ["instagram", "Instagram URL"],
                    ["facebook", "Facebook URL"],
                    ["website", "Website URL"],
                  ] as const
                ).map(([key, label]) => (
                  <View key={key}>
                    <TextInput
                      label={label}
                      mode="outlined"
                      value={links[key]}
                      onChangeText={(value) =>
                        setLinks((current) => ({ ...current, [key]: value }))
                      }
                      placeholder="https://..."
                      keyboardType="url"
                      autoCapitalize="none"
                      autoCorrect={false}
                      disabled={saving}
                      error={submitted && Boolean(linkErrors[key])}
                    />
                    {submitted && linkErrors[key] ? (
                      <HelperText type="error" visible>
                        {linkErrors[key]}
                      </HelperText>
                    ) : null}
                  </View>
                ))}

                {error ? (
                  <View
                    style={[
                      styles.errorBanner,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                        gap: spacing.sm,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.secondaryForeground, flex: 1 }}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.actions,
                    { borderColor: colors.border, gap: spacing.sm, paddingTop: spacing.md },
                  ]}
                >
                  <Button
                    mode="outlined"
                    onPress={() => router.replace("/admin/profile" as Href)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => void handleSubmit()}
                    loading={saving}
                    disabled={saving || loading}
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loading: {
    minHeight: 200,
  },
  content: {
    flexGrow: 1,
  },
  backButton: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  avatarPicker: {
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
});