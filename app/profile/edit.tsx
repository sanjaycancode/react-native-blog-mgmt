import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { profileApi, type ProfileData } from "@/api/services/profile";
import { imgSrc } from "@/utils/getImgSrc";

// Tokens taken from the main app theme (cream background, #e63946 primary).
// If your RN project already has a theme file, replace this object with an import from it.
const T = {
  bg: "#fffaf5",
  surface: "#ffffff",
  border: "#eadfd6",
  text: "#16213e",
  sub: "#6b7280",
  mute: "#a39a93",
  primary: "#e63946",
  primaryDark: "#b92535",
  primaryTint: "#fde8ea",
  errorBg: "#fdecee",
  errorBorder: "#f3b6bb",
} as const;

const BIO_MAX = 250;

type Links = { instagram: string; facebook: string; website: string };
type PickedAvatar = { uri: string; name: string; type: string };

// ── helpers ────────────────────────────────────────────────────────────────
const isValidUrl = (v: string) =>
  v === "" || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v);

function errorMessage(e: unknown, fallback: string): string {
  const err = e as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

// ── field ──────────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  right,
  style,
  ...input
}: TextInputProps & { label: string; error?: string; right?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {right ? <Text style={s.counter}>{right}</Text> : null}
      </View>
      <TextInput
        {...input}
        placeholderTextColor={T.mute}
        selectionColor={T.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.input,
          focused && s.inputFocus,
          !!error && s.inputError,
          style,
        ]}
      />
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ── screen ─────────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isInitializing, session } = useAuth();
  const user = session?.user as { name?: string; email?: string } | undefined;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<Links>({
    instagram: "",
    facebook: "",
    website: "",
  });
  const [initial, setInitial] = useState<{ bio: string; links: Links }>({
    bio: "",
    links: { instagram: "", facebook: "", website: "" },
  });
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [touched, setTouched] = useState(false);

  // Auth guard: never redirect while the session is still being restored.
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) router.replace("/login");
  }, [isInitializing, isAuthenticated, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await profileApi.get();
      console.log(res);
      const p = res?.data?.profile ?? null;
      const nextLinks: Links = {
        instagram: p?.socialLinks?.instagram ?? "",
        facebook: p?.socialLinks?.facebook ?? "",
        website: p?.socialLinks?.website ?? "",
      };
      setProfile(p);
      setBio(p?.bio ?? "");
      setLinks(nextLinks);
      setInitial({ bio: p?.bio ?? "", links: nextLinks });
    } catch {
      setLoadError("We couldn't load your profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitializing || !isAuthenticated) return;
    void load();
  }, [isInitializing, isAuthenticated, load]);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setAvatar({
      uri: a.uri,
      name: a.fileName ?? "avatar.jpg",
      type: a.mimeType ?? "image/jpeg",
    });
  };

  const linkErrors = useMemo(
    () => ({
      instagram: isValidUrl(links.instagram.trim())
        ? ""
        : "Enter a full link, like https://instagram.com/you",
      facebook: isValidUrl(links.facebook.trim())
        ? ""
        : "Enter a full link, like https://facebook.com/you",
      website: isValidUrl(links.website.trim())
        ? ""
        : "Enter a full link, like https://yoursite.com",
    }),
    [links],
  );
  const hasErrors = Object.values(linkErrors).some(Boolean);

  const dirty =
    avatar !== null ||
    bio.trim() !== initial.bio ||
    links.instagram.trim() !== initial.links.instagram ||
    links.facebook.trim() !== initial.links.facebook ||
    links.website.trim() !== initial.links.website;

  const canSave = dirty && !isSaving && !isLoading && !loadError;

  const save = async () => {
    setTouched(true);
    if (hasErrors) return;
    setSaveError("");
    setIsSaving(true);

    const form = new FormData();
    form.append("bio", bio.trim());
    form.append("socialLinks[instagram]", links.instagram.trim());
    form.append("socialLinks[facebook]", links.facebook.trim());
    form.append("socialLinks[website]", links.website.trim());
    // React Native's FormData takes a { uri, name, type } object for files.
    if (avatar) form.append("avatar", avatar as unknown as Blob);

    try {
      await profileApi.update(form);
      router.back();
    } catch (e) {
      setSaveError(
        errorMessage(e, "We couldn't update your profile. Try again."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitializing || !isAuthenticated) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={T.primary} />
      </View>
    );
  }

  const name = profile?.user?.name ?? user?.name ?? "";
  const email = profile?.user?.email ?? user?.email ?? "";
  const currentAvatar =
    avatar?.uri ?? (profile?.avatar ? imgSrc(profile.avatar, "profile") : null);

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.headerCancel}>Cancel</Text>
        </Pressable>
        <Text style={s.headerTitle}>Edit profile</Text>
        <Pressable
          onPress={save}
          disabled={!canSave}
          hitSlop={12}
          style={{ minWidth: 48, alignItems: "flex-end" }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={T.primary} />
          ) : (
            <Text style={[s.headerSave, !canSave && { opacity: 0.35 }]}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {isLoading && (
          <View style={[s.center, { paddingTop: 120 }]}>
            <ActivityIndicator color={T.primary} />
          </View>
        )}

        {!isLoading && loadError ? (
          <View
            style={[
              s.center,
              { paddingTop: 100, paddingHorizontal: 40, gap: 12 },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={40} color={T.mute} />
            <Text style={s.loadErrorText}>{loadError}</Text>
            <Pressable onPress={load} style={s.retry}>
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !loadError && (
          <>
            {/* Avatar */}
            <View style={s.avatarBlock}>
              <Pressable onPress={pickAvatar} style={s.avatarWrap}>
                {currentAvatar ? (
                  <Image source={{ uri: currentAvatar }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback]}>
                    <Text style={s.avatarLetter}>
                      {name.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
                <View style={s.camera}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </Pressable>
              <Pressable onPress={pickAvatar} hitSlop={8}>
                <Text style={s.changePhoto}>
                  {avatar ? "Choose a different photo" : "Change photo"}
                </Text>
              </Pressable>
            </View>

            {/* Account (read-only) */}
            <View style={s.account}>
              <Text style={s.accountName}>{name}</Text>
              <Text style={s.accountEmail}>{email}</Text>
            </View>

            <View style={s.form}>
              <Field
                label="Bio"
                value={bio}
                onChangeText={setBio}
                maxLength={BIO_MAX}
                multiline
                textAlignVertical="top"
                placeholder="Tell the community a little about yourself"
                right={`${bio.length}/${BIO_MAX}`}
                style={s.bioInput}
              />

              <Text style={s.group}>Links</Text>

              <Field
                label="Instagram"
                value={links.instagram}
                onChangeText={(v) => setLinks((l) => ({ ...l, instagram: v }))}
                placeholder="https://instagram.com/you"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                error={touched ? linkErrors.instagram : undefined}
              />
              <Field
                label="Facebook"
                value={links.facebook}
                onChangeText={(v) => setLinks((l) => ({ ...l, facebook: v }))}
                placeholder="https://facebook.com/you"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                error={touched ? linkErrors.facebook : undefined}
              />
              <Field
                label="Website"
                value={links.website}
                onChangeText={(v) => setLinks((l) => ({ ...l, website: v }))}
                placeholder="https://yoursite.com"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                error={touched ? linkErrors.website : undefined}
              />

              {saveError ? (
                <View style={s.banner}>
                  <Ionicons name="alert-circle" size={18} color={T.primary} />
                  <Text style={s.bannerText}>{saveError}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={save}
                disabled={!canSave}
                style={[s.saveBtn, !canSave && { opacity: 0.4 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Save profile</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  center: { alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  headerCancel: { color: T.sub, fontSize: 16 },
  headerTitle: { color: T.text, fontSize: 17, fontWeight: "700" },
  headerSave: { color: T.primary, fontSize: 16, fontWeight: "700" },

  loadErrorText: { color: T.sub, fontSize: 15, textAlign: "center" },
  retry: {
    borderWidth: 1,
    borderColor: T.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
  },
  retryText: { color: T.primary, fontWeight: "700" },

  avatarBlock: { alignItems: "center", marginTop: 28, gap: 12 },
  avatarWrap: { width: 104, height: 104 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: T.primary,
  },
  avatarFallback: {
    backgroundColor: T.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: T.primary, fontSize: 40, fontWeight: "800" },
  camera: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.primary,
    borderWidth: 3,
    borderColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhoto: { color: T.primary, fontSize: 14, fontWeight: "700" },

  account: { alignItems: "center", marginTop: 18 },
  accountName: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  accountEmail: { color: T.sub, fontSize: 13.5, marginTop: 2 },

  form: { paddingHorizontal: 20, marginTop: 34 },
  group: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 18,
    marginBottom: 6,
  },

  field: { marginBottom: 18 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: { color: T.sub, fontSize: 13, fontWeight: "600" },
  counter: { color: T.mute, fontSize: 12 },
  input: {
    color: T.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  inputFocus: { borderColor: T.primary },
  inputError: { borderColor: T.primaryDark },
  bioInput: { minHeight: 110, lineHeight: 22 },
  fieldError: { color: T.primaryDark, fontSize: 12.5, marginTop: 6 },

  banner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.errorBorder,
    backgroundColor: T.errorBg,
    marginBottom: 16,
  },
  bannerText: { color: T.primaryDark, fontSize: 13, flex: 1 },

  saveBtn: {
    backgroundColor: T.primary,
    borderRadius: 99,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
