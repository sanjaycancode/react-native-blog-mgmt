import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import AuthScreen from "@/components/auth/AuthScreen";
import AuthSuccess from "@/components/auth/AuthSuccess";
import AuthTextField, { ERROR_COLOR } from "@/components/auth/Authtextfield";
import Button from "@/components/ThemedButton";
import Card from "@/components/ThemedCard";

// ⚠️ Add forgotPassword / resetPassword to this service (see notes)
import { authApi } from "@/api/services/auth";

import { useTheme } from "@/constants/theme";

import { getErrorMessage } from "@/utils/errorMessage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "email" | "token" | "password" | "confirm";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const { colors, typography, spacing } = useTheme();

  // If the user arrived from the email link, the token is already in the URL.
  const tokenFromLink = params.token ?? "";
  const needsTokenField = !tokenFromLink;

  const [values, setValues] = useState<Record<Field, string>>({
    email: params.email ?? "",
    token: tokenFromLink,
    password: "",
    confirm: "",
  });
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    email: false,
    token: false,
    password: false,
    confirm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const tokenRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {};
    if (!EMAIL_PATTERN.test(values.email.trim())) {
      e.email = "Enter a valid email, like you@example.com.";
    }
    // Same 8 to 72 character rule as registration (bcrypt ignores past 72).
    if (values.password.length < 8 || values.password.length > 72) {
      e.password = "Use 8 to 72 characters.";
    }
    if (values.confirm !== values.password) {
      e.confirm = "Passwords don't match.";
    }
    return e;
  }, [values]);

  const setField = (field: Field, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));
  const touch = (field: Field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));
  const show = (field: Field) => (touched[field] ? errors[field] : null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  }, [router]);

  const submit = async () => {
    if (isSubmitting) return;
    setTouched({ email: true, token: true, password: true, confirm: true });
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setServerError(null);
    try {
      await authApi.resetPassword({
        email: values.email.trim().toLowerCase(),
        token: values.token.trim(),
        password: values.password,
      });
      setDone(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    padding: spacing.xl,
  };

  return (
    <AuthScreen
      onBack={goBack}
      badgeIcon="shield-checkmark-outline"
      badge="Almost there"
      title="Choose a new password,"
      accent="and keep writing."
      subtitle="Pick something strong that you don't use anywhere else."
    >
      {done ? (
        <Card style={cardStyle}>
          <AuthSuccess
            icon="checkmark-circle-outline"
            title="Password updated"
            body="You can now log in with your new password."
          >
            <Button
              title="Go to log in"
              variant="filled"
              onPress={() => router.replace("/login")}
              style={{ width: "100%" }}
            />
          </AuthSuccess>
        </Card>
      ) : (
        <>
          <Card style={cardStyle}>
            <AuthTextField
              label="Email"
              icon="mail-outline"
              value={values.email}
              onChangeText={(t) => setField("email", t)}
              onBlur={() => touch("email")}
              error={show("email")}
              placeholder="you@example.com"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() =>
                (needsTokenField ? tokenRef : passwordRef).current?.focus()
              }
            />

            <View style={{ marginTop: spacing.lg }}>
              <AuthTextField
                ref={passwordRef}
                label="New password"
                icon="lock-closed-outline"
                secure
                value={values.password}
                onChangeText={(t) => setField("password", t)}
                onBlur={() => touch("password")}
                error={show("password")}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <AuthTextField
                ref={confirmRef}
                label="Confirm password"
                icon="lock-closed-outline"
                secure
                value={values.confirm}
                onChangeText={(t) => setField("confirm", t)}
                onBlur={() => touch("confirm")}
                error={show("confirm")}
                placeholder="Type it again"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
              />
            </View>

            {!!serverError && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: spacing.md,
                }}
              >
                <Ionicons name="alert-circle" size={16} color={ERROR_COLOR} />
                <Text
                  style={{
                    color: ERROR_COLOR,
                    fontSize: typography.sizes.sm,
                    flex: 1,
                  }}
                >
                  {serverError}
                </Text>
              </View>
            )}

            <Button
              title={isSubmitting ? "Updating..." : "Update password"}
              variant="filled"
              onPress={() => void submit()}
              style={{ width: "100%", marginTop: spacing.xl }}
            />
          </Card>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              marginTop: spacing.xl,
            }}
          >
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sizes.sm,
              }}
            >
              Link expired?
            </Text>
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/forgot-password",
                  params: { email: values.email.trim() },
                })
              }
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.sizes.sm,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Request a new one
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </AuthScreen>
  );
}
